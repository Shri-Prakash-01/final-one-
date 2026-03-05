from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models import User

def admin_required(fn):
    """Decorator to check if user is admin"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def active_user_required(fn):
    """Decorator to check if user is active"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if not user.is_active:
            return jsonify({'error': 'Account is suspended'}), 403
        
        return fn(*args, **kwargs)
    return wrapper

def log_activity(action, document_id=None):
    """Decorator factory to log user activity"""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            from flask import request
            from models import ActivityLog, db
            from utils.security import get_device_info, get_location_from_ip
            
            # Execute the function first
            response = fn(*args, **kwargs)
            
            try:
                # Get user info if authenticated
                user_id = None
                try:
                    verify_jwt_in_request()
                    user_id = get_jwt_identity()
                except:
                    pass
                
                # Get device info
                user_agent = request.headers.get('User-Agent', '')
                device_info = get_device_info(user_agent)
                ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
                
                # Create activity log
                activity = ActivityLog(
                    user_id=user_id,
                    document_id=document_id if document_id else kwargs.get('document_id'),
                    action=action,
                    ip_address=ip_address,
                    device_type=device_info['device_type'],
                    device_name=device_info['device_name'],
                    browser=device_info['browser'],
                    os=device_info['os'],
                    location=get_location_from_ip(ip_address),
                    user_agent=user_agent
                )
                
                db.session.add(activity)
                db.session.commit()
            except Exception as e:
                # Log error but don't fail the request
                print(f"Error logging activity: {e}")
            
            return response
        return wrapper
    return decorator