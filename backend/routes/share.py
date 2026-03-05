from flask import Blueprint, request, jsonify, send_file, current_app
from models import db, Document, User, ActivityLog
from utils.security import (
    get_device_info, get_location_from_ip, check_device_restriction
)
from datetime import datetime
import os
import io

share_bp = Blueprint('share', __name__)

@share_bp.route('/<token>', methods=['GET'])
def get_shared_document(token):
    """Get shared document info by token (public access)"""
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found or link is invalid'}), 404
    
    # Get user agent and device info
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    # Check device restriction
    if not check_device_restriction(user_agent, document.device_restriction):
        # Log blocked access
        activity = ActivityLog(
            document_id=document.id,
            action='view_attempt',
            status='blocked',
            ip_address=ip_address,
            device_type=device_info['device_type'],
            device_name=device_info['device_name'],
            browser=device_info['browser'],
            os=device_info['os'],
            location=get_location_from_ip(ip_address),
            details=f'Device restricted: {document.device_restriction}'
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'error': 'Device not allowed',
            'message': f'This document can only be accessed from {document.device_restriction} devices',
            'restriction': document.device_restriction
        }), 403
    
    # Check if document is revoked
    if document.is_revoked:
        return jsonify({
            'error': 'Access revoked',
            'message': 'The owner has revoked access to this document'
        }), 403
    
    # Check if document has expired
    if document.is_expired():
        return jsonify({
            'error': 'Link expired',
            'message': 'This share link has expired'
        }), 410
    
    # Check if view limit reached
    if document.is_limit_reached():
        return jsonify({
            'error': 'View limit reached',
            'message': 'This document has reached its maximum view count'
        }), 429
    
    # Get owner info
    owner = User.query.get(document.user_id)
    
    return jsonify({
        'document': {
            'id': document.id,
            'title': document.title,
            'original_filename': document.original_filename,
            'file_type': document.file_type,
            'file_size': document.file_size,
            'mime_type': document.mime_type,
            'description': document.description,
            'has_password': document.password_hash is not None,
            'expiry_date': document.expiry_date.isoformat() if document.expiry_date else None,
            'view_limit': document.view_limit,
            'current_views': document.current_views,
            'allow_download': document.allow_download,
            'allow_print': document.allow_print,
            'allow_share': document.allow_share,
            'device_restriction': document.device_restriction,
            'watermark_enabled': document.watermark_enabled,
            'status': document.get_status(),
            'owner_name': owner.full_name if owner else 'Unknown'
        }
    }), 200

@share_bp.route('/<token>/verify-password', methods=['POST'])
def verify_document_password(token):
    """Verify password for password-protected documents"""
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if not document.password_hash:
        return jsonify({'message': 'No password required'}), 200
    
    data = request.get_json()
    password = data.get('password', '')
    
    if not password:
        return jsonify({'error': 'Password is required'}), 400
    
    if document.check_password(password):
        return jsonify({'message': 'Password verified', 'access_granted': True}), 200
    else:
        return jsonify({'error': 'Incorrect password', 'access_granted': False}), 401

@share_bp.route('/<token>/view', methods=['POST'])
def view_document(token):
    """View document - stream file content"""
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    # Check all access rules
    if document.is_revoked:
        return jsonify({'error': 'Access revoked'}), 403
    
    if document.is_expired():
        return jsonify({'error': 'Link expired'}), 410
    
    if document.is_limit_reached():
        return jsonify({'error': 'View limit reached'}), 429
    
    if not check_device_restriction(user_agent, document.device_restriction):
        return jsonify({'error': 'Device not allowed'}), 403
    
    # Check password if required
    if document.password_hash:
        data = request.get_json() or {}
        password = data.get('password', '')
        if not document.check_password(password):
            return jsonify({'error': 'Password required', 'requires_password': True}), 401
    
    # Increment view count
    document.current_views += 1
    db.session.commit()
    
    # Log view activity
    activity = ActivityLog(
        document_id=document.id,
        action='view',
        status='success',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    # Return file
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    
    return send_file(
        file_path,
        mimetype=document.mime_type,
        as_attachment=False
    )

@share_bp.route('/<token>/download', methods=['POST'])
def download_shared_document(token):
    """Download document if allowed"""
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if not document.allow_download:
        return jsonify({'error': 'Download not allowed for this document'}), 403
    
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    # Check all access rules
    if document.is_revoked:
        return jsonify({'error': 'Access revoked'}), 403
    if document.is_expired():
        return jsonify({'error': 'Link expired'}), 410
    if document.is_limit_reached():
        return jsonify({'error': 'View limit reached'}), 429
    if not check_device_restriction(user_agent, document.device_restriction):
        return jsonify({'error': 'Device not allowed'}), 403
    
    # Check password if required
    if document.password_hash:
        data = request.get_json() or {}
        password = data.get('password', '')
        if not document.check_password(password):
            return jsonify({'error': 'Password required', 'requires_password': True}), 401
    
    # Increment download count
    document.current_downloads += 1
    db.session.commit()
    
    # Log download activity
    activity = ActivityLog(
        document_id=document.id,
        action='download',
        status='success',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], document.stored_filename)
    
    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found on server'}), 404
    
    return send_file(
        file_path,
        mimetype=document.mime_type,
        as_attachment=True,
        download_name=document.original_filename
    )

@share_bp.route('/<token>/print', methods=['POST'])
def print_document(token):
    """Get document for printing"""
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if not document.allow_print:
        return jsonify({'error': 'Printing not allowed for this document'}), 403
    
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    # Log print activity
    activity = ActivityLog(
        document_id=document.id,
        action='print',
        status='success',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'message': 'Print access granted'}), 200

@share_bp.route('/<token>/activity', methods=['GET'])
def get_document_activity(token):
    """Get activity logs for a document - for owner only"""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    
    try:
        verify_jwt_in_request()
        user_id = get_jwt_identity()
    except Exception:
        return jsonify({'error': 'Authentication required'}), 401
    
    document = Document.query.filter_by(share_token=token).first()
    
    if not document:
        return jsonify({'error': 'Document not found'}), 404
    
    if document.user_id != user_id:
        return jsonify({'error': 'Access denied'}), 403
    
    activities = ActivityLog.query.filter_by(document_id=document.id).order_by(
        ActivityLog.created_at.desc()
    ).limit(50).all()
    
    return jsonify({
        'activities': [activity.to_dict() for activity in activities]
    }), 200