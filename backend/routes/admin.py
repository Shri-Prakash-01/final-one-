from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Document, ActivityLog
from utils.decorators import admin_required
from datetime import datetime, timedelta
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_stats():
    """Get comprehensive admin statistics"""
    
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)
    
    # User stats
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    
    # Today's registrations
    today_registrations = User.query.filter(
        func.date(User.created_at) == today
    ).count()
    
    yesterday_registrations = User.query.filter(
        func.date(User.created_at) == yesterday
    ).count()
    
    # Document stats
    total_documents = Document.query.count()
    active_documents = Document.query.filter_by(is_active=True, is_revoked=False).count()
    
    # Today's uploads
    today_uploads = Document.query.filter(
        func.date(Document.created_at) == today
    ).count()
    
    yesterday_uploads = Document.query.filter(
        func.date(Document.created_at) == yesterday
    ).count()
    
    # Total views and downloads
    total_views = db.session.query(func.sum(Document.current_views)).scalar() or 0
    total_downloads = db.session.query(func.sum(Document.current_downloads)).scalar() or 0
    
    # Today's logins
    today_logins = ActivityLog.query.filter(
        ActivityLog.action == 'login',
        func.date(ActivityLog.created_at) == today
    ).count()
    
    # File type distribution
    file_type_dist = db.session.query(
        Document.file_type, func.count(Document.id)
    ).group_by(Document.file_type).all()
    
    file_types = {ft: count for ft, count in file_type_dist}
    
    # Upload percentage change
    upload_change = 0
    if yesterday_uploads > 0:
        upload_change = ((today_uploads - yesterday_uploads) / yesterday_uploads) * 100
    
    return jsonify({
        'users': {
            'total': total_users,
            'active': active_users,
            'today_registrations': today_registrations,
            'yesterday_registrations': yesterday_registrations
        },
        'documents': {
            'total': total_documents,
            'active': active_documents,
            'today_uploads': today_uploads,
            'yesterday_uploads': yesterday_uploads,
            'upload_change_percent': round(upload_change, 2)
        },
        'activity': {
            'total_views': total_views,
            'total_downloads': total_downloads,
            'today_logins': today_logins
        },
        'file_type_distribution': file_types
    }), 200

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """Get all users with pagination"""
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()
    status = request.args.get('status', 'all')
    
    query = User.query
    
    if search:
        query = query.filter(
            db.or_(
                User.full_name.ilike(f'%{search}%'),
                User.username.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%')
            )
        )
    
    if status == 'active':
        query = query.filter_by(is_active=True)
    elif status == 'suspended':
        query = query.filter_by(is_active=False)
    
    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    users_with_stats = []
    for user in pagination.items:
        user_data = user.to_dict()
        user_data['document_count'] = Document.query.filter_by(user_id=user.id).count()
        users_with_stats.append(user_data)
    
    return jsonify({
        'users': users_with_stats,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@admin_bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
@admin_required
def get_user(user_id):
    """Get specific user details"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_data = user.to_dict()
    user_data['documents'] = [doc.to_dict() for doc in user.documents]
    user_data['recent_activities'] = [
        act.to_dict() for act in ActivityLog.query.filter_by(user_id=user_id).order_by(ActivityLog.created_at.desc()).limit(20).all()
    ]
    
    return jsonify({'user': user_data}), 200

@admin_bp.route('/users/<user_id>/suspend', methods=['POST'])
@jwt_required()
@admin_required
def suspend_user(user_id):
    """Suspend a user"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.role == 'admin':
        return jsonify({'error': 'Cannot suspend admin user'}), 403
    
    user.is_active = False
    db.session.commit()
    
    return jsonify({'message': 'User suspended successfully', 'user': user.to_dict()}), 200

@admin_bp.route('/users/<user_id>/activate', methods=['POST'])
@jwt_required()
@admin_required
def activate_user(user_id):
    """Activate a suspended user"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = True
    db.session.commit()
    
    return jsonify({'message': 'User activated successfully', 'user': user.to_dict()}), 200

@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@jwt_required()
@admin_required
def reset_user_password(user_id):
    """Reset user password"""
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    new_password = data.get('new_password', '')
    
    if not new_password or len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password reset successfully'}), 200

@admin_bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user"""
    import os
    from flask import current_app
    
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if user.role == 'admin':
        return jsonify({'error': 'Cannot delete admin user'}), 403
    
    # Delete all user files
    for document in user.documents:
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'User deleted successfully'}), 200

@admin_bp.route('/documents', methods=['GET'])
@jwt_required()
@admin_required
def get_all_documents():
    """Get all documents with pagination"""
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '').strip()
    
    query = Document.query
    
    if search:
        query = query.filter(
            db.or_(
                Document.title.ilike(f'%{search}%'),
                Document.original_filename.ilike(f'%{search}%')
            )
        )
    
    query = query.order_by(Document.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    docs_with_owners = []
    for doc in pagination.items:
        doc_data = doc.to_dict()
        owner = User.query.get(doc.user_id)
        doc_data['owner_name'] = owner.full_name if owner else 'Unknown'
        doc_data['owner_email'] = owner.email if owner else 'Unknown'
        docs_with_owners.append(doc_data)
    
    return jsonify({
        'documents': docs_with_owners,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@admin_bp.route('/documents/<document_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_document(document_id):
    """Admin delete a document"""
    import os
    from flask import current_app
    
    document = Document.query.get(document_id)
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Delete file
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Document deleted successfully'}), 200

@admin_bp.route('/logs', methods=['GET'])
@jwt_required()
@admin_required
def get_activity_logs():
    """Get all activity logs"""
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    action = request.args.get('action', 'all')
    user_id = request.args.get('user_id')
    document_id = request.args.get('document_id')
    
    query = ActivityLog.query
    
    if action != 'all':
        query = query.filter_by(action=action)
    
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    if document_id:
        query = query.filter_by(document_id=document_id)
    
    query = query.order_by(ActivityLog.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    logs_with_info = []
    for log in pagination.items:
        log_data = log.to_dict()
        if log.user_id:
            user = User.query.get(log.user_id)
            log_data['user_name'] = user.full_name if user else 'Unknown'
            log_data['user_email'] = user.email if user else 'Unknown'
        else:
            log_data['user_name'] = 'Anonymous'
            log_data['user_email'] = '-'
        
        if log.document_id:
            doc = Document.query.get(log.document_id)
            log_data['document_name'] = doc.title if doc else 'Deleted Document'
        else:
            log_data['document_name'] = '-'
        
        logs_with_info.append(log_data)
    
    return jsonify({
        'logs': logs_with_info,
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@admin_bp.route('/chart-data', methods=['GET'])
@jwt_required()
@admin_required
def get_chart_data():
    """Get data for admin dashboard charts"""
    
    days = request.args.get('days', 7, type=int)
    
    # Daily registrations
    daily_registrations = []
    daily_uploads = []
    
    for i in range(days - 1, -1, -1):
        date = (datetime.utcnow() - timedelta(days=i)).date()
        
        registrations = User.query.filter(func.date(User.created_at) == date).count()
        uploads = Document.query.filter(func.date(Document.created_at) == date).count()
        
        daily_registrations.append({
            'date': str(date),
            'count': registrations
        })
        daily_uploads.append({
            'date': str(date),
            'count': uploads
        })
    
    # File type distribution
    file_types = db.session.query(
        Document.file_type, func.count(Document.id)
    ).group_by(Document.file_type).all()
    
    return jsonify({
        'daily_registrations': daily_registrations,
        'daily_uploads': daily_uploads,
        'file_type_distribution': [{'type': ft, 'count': count} for ft, count in file_types]
    }), 200

@admin_bp.route('/users/create', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """Admin create a new user"""
    data = request.get_json()
    
    required_fields = ['full_name', 'username', 'email', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    new_user = User(
        full_name=data['full_name'],
        username=data['username'].lower(),
        email=data['email'].lower(),
        phone=data.get('phone', ''),
        role=data.get('role', 'user')
    )
    new_user.set_password(data['password'])
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'message': 'User created successfully',
        'user': new_user.to_dict()
    }), 201