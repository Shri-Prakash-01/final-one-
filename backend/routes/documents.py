from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Document, User, ActivityLog
from utils.security import (
    get_device_info, get_location_from_ip, check_device_restriction,
    format_file_size, secure_filename, get_file_extension, is_allowed_file
)
from utils.decorators import active_user_required
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename as werkzeug_secure_filename
import os
import uuid
import io

documents_bp = Blueprint('documents', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'zip'}

def get_expiry_date(expiry_option, custom_days=None):
    """Calculate expiry date based on option"""
    if expiry_option == 'never':
        return None
    elif expiry_option == '1day':
        return datetime.utcnow() + timedelta(days=1)
    elif expiry_option == '7days':
        return datetime.utcnow() + timedelta(days=7)
    elif expiry_option == '30days':
        return datetime.utcnow() + timedelta(days=30)
    elif expiry_option == 'custom' and custom_days:
        return datetime.utcnow() + timedelta(days=int(custom_days))
    return datetime.utcnow() + timedelta(days=7)  # Default 7 days

def get_view_limit(limit_option, custom_limit=None):
    """Get view limit based on option"""
    if limit_option == 'unlimited':
        return 0
    elif limit_option == '10':
        return 10
    elif limit_option == '50':
        return 50
    elif limit_option == '100':
        return 100
    elif limit_option == 'custom' and custom_limit:
        return int(custom_limit)
    return 0  # Default unlimited

@documents_bp.route('/upload', methods=['POST'])
@jwt_required()
@active_user_required
def upload_document():
    user_id = get_jwt_identity()
    
    # Check if file is present
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    if not is_allowed_file(file.filename, ALLOWED_EXTENSIONS):
        return jsonify({'error': f'File type not allowed. Allowed: {", ".join(ALLOWED_EXTENSIONS)}'}), 400
    
    # Get form data
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    category = request.form.get('category', '').strip()
    tags = request.form.get('tags', '').strip()
    
    # Security settings
    expiry_option = request.form.get('expiry_option', '7days')
    custom_expiry_days = request.form.get('custom_expiry_days')
    view_limit_option = request.form.get('view_limit_option', 'unlimited')
    custom_view_limit = request.form.get('custom_view_limit')
    password = request.form.get('password', '')
    device_restriction = request.form.get('device_restriction', 'both')
    allow_download = request.form.get('allow_download', 'true').lower() == 'true'
    allow_print = request.form.get('allow_print', 'true').lower() == 'true'
    allow_share = request.form.get('allow_share', 'true').lower() == 'true'
    watermark_enabled = request.form.get('watermark_enabled', 'false').lower() == 'true'
    
    # Generate secure filename
    original_filename = file.filename
    file_ext = get_file_extension(original_filename)
    stored_filename = f"{uuid.uuid4().hex}.{file_ext}"
    
    # Ensure upload directory exists
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_folder, stored_filename)
    file.save(file_path)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create document record
    document = Document(
        user_id=user_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_type=file_ext,
        file_size=file_size,
        mime_type=file.content_type or 'application/octet-stream',
        title=title or original_filename,
        description=description,
        category=category,
        tags=tags,
        expiry_date=get_expiry_date(expiry_option, custom_expiry_days),
        view_limit=get_view_limit(view_limit_option, custom_view_limit),
        device_restriction=device_restriction,
        allow_download=allow_download,
        allow_print=allow_print,
        allow_share=allow_share,
        watermark_enabled=watermark_enabled
    )
    
    # Set password if provided
    if password:
        document.set_password(password)
    
    db.session.add(document)
    db.session.commit()
    
    # Log upload activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='upload',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address),
        details=f'Uploaded {original_filename}'
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'message': 'Document uploaded successfully',
        'document': document.to_dict()
    }), 201

@documents_bp.route('/', methods=['GET'])
@jwt_required()
@active_user_required
def get_documents():
    user_id = get_jwt_identity()
    
    # Get query parameters
    status = request.args.get('status', 'all')
    file_type = request.args.get('file_type', 'all')
    search = request.args.get('search', '').strip()
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    # Base query
    query = Document.query.filter_by(user_id=user_id)
    
    # Apply filters
    if status != 'all':
        if status == 'active':
            query = query.filter_by(is_active=True, is_revoked=False)
        elif status == 'expired':
            query = query.filter(Document.expiry_date < datetime.utcnow())
        elif status == 'limit_reached':
            query = query.filter(Document.view_limit > 0, Document.current_views >= Document.view_limit)
        elif status == 'revoked':
            query = query.filter_by(is_revoked=True)
    
    if file_type != 'all':
        query = query.filter_by(file_type=file_type)
    
    if search:
        query = query.filter(
            db.or_(
                Document.title.ilike(f'%{search}%'),
                Document.original_filename.ilike(f'%{search}%'),
                Document.tags.ilike(f'%{search}%')
            )
        )
    
    # Apply sorting
    if sort_by == 'created_at':
        query = query.order_by(Document.created_at.desc() if sort_order == 'desc' else Document.created_at.asc())
    elif sort_by == 'title':
        query = query.order_by(Document.title.desc() if sort_order == 'desc' else Document.title.asc())
    elif sort_by == 'file_size':
        query = query.order_by(Document.file_size.desc() if sort_order == 'desc' else Document.file_size.asc())
    elif sort_by == 'views':
        query = query.order_by(Document.current_views.desc() if sort_order == 'desc' else Document.current_views.asc())
    
    # Paginate
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    documents = pagination.items
    
    return jsonify({
        'documents': [doc.to_dict() for doc in documents],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
        'per_page': per_page
    }), 200

@documents_bp.route('/stats', methods=['GET'])
@jwt_required()
@active_user_required
def get_document_stats():
    user_id = get_jwt_identity()
    
    # Get document statistics
    total_docs = Document.query.filter_by(user_id=user_id).count()
    active_docs = Document.query.filter_by(user_id=user_id, is_active=True, is_revoked=False).count()
    expired_docs = Document.query.filter(
        Document.user_id == user_id,
        Document.expiry_date < datetime.utcnow()
    ).count()
    
    total_views = db.session.query(db.func.sum(Document.current_views)).filter_by(user_id=user_id).scalar() or 0
    total_downloads = db.session.query(db.func.sum(Document.current_downloads)).filter_by(user_id=user_id).scalar() or 0
    
    # Get recent activities
    recent_activities = ActivityLog.query.filter_by(user_id=user_id).order_by(ActivityLog.created_at.desc()).limit(10).all()
    
    return jsonify({
        'total_documents': total_docs,
        'active_documents': active_docs,
        'expired_documents': expired_docs,
        'total_views': total_views,
        'total_downloads': total_downloads,
        'recent_activities': [activity.to_dict() for activity in recent_activities]
    }), 200

@documents_bp.route('/<document_id>', methods=['GET'])
@jwt_required()
@active_user_required
def get_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    return jsonify({'document': document.to_dict(include_stats=True)}), 200

@documents_bp.route('/<document_id>', methods=['PUT'])
@jwt_required()
@active_user_required
def update_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'title' in data:
        document.title = data['title'].strip()
    if 'description' in data:
        document.description = data['description'].strip()
    if 'category' in data:
        document.category = data['category'].strip()
    if 'tags' in data:
        document.tags = data['tags'].strip()
    if 'allow_download' in data:
        document.allow_download = data['allow_download']
    if 'allow_print' in data:
        document.allow_print = data['allow_print']
    if 'allow_share' in data:
        document.allow_share = data['allow_share']
    if 'is_active' in data:
        document.is_active = data['is_active']
    
    document.updated_at = datetime.utcnow()
    db.session.commit()
    
    # Log update activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='update',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'message': 'Document updated successfully',
        'document': document.to_dict()
    }), 200

@documents_bp.route('/<document_id>/revoke', methods=['POST'])
@jwt_required()
@active_user_required
def revoke_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    document.is_revoked = True
    document.is_active = False
    db.session.commit()
    
    # Log revoke activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='revoke',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'message': 'Document access revoked successfully',
        'document': document.to_dict()
    }), 200

@documents_bp.route('/<document_id>/regenerate-link', methods=['POST'])
@jwt_required()
@active_user_required
def regenerate_link(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Generate new share token
    from models import generate_share_token
    document.share_token = generate_share_token()
    document.is_revoked = False
    document.is_active = True
    db.session.commit()
    
    # Log regenerate activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='regenerate_link',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        'message': 'Link regenerated successfully',
        'document': document.to_dict()
    }), 200

@documents_bp.route('/<document_id>', methods=['DELETE'])
@jwt_required()
@active_user_required
def delete_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    # Delete file from storage
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Log delete activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='delete',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address),
        details=f'Deleted {document.original_filename}'
    )
    db.session.add(activity)
    db.session.commit()
    
    # Delete document record
    db.session.delete(document)
    db.session.commit()
    
    return jsonify({'message': 'Document deleted successfully'}), 200

@documents_bp.route('/<document_id>/download', methods=['GET'])
@jwt_required()
@active_user_required
def download_document(document_id):
    user_id = get_jwt_identity()
    
    document = Document.query.filter_by(id=document_id, user_id=user_id).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    
    # Log download activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        document_id=document.id,
        action='download',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return send_file(
        file_path,
        mimetype=document.mime_type,
        as_attachment=True,
        download_name=document.original_filename
    )