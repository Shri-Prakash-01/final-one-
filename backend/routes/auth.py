from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from models import db, User, ActivityLog
from datetime import datetime
from utils.security import get_device_info, get_location_from_ip
import re

auth_bp = Blueprint('auth', __name__)

def is_valid_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_valid_password(password):
    """Check password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, "Password is strong"

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['full_name', 'username', 'email', 'password', 'confirm_password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'{field.replace("_", " ").title()} is required'}), 400
    
    # Check if passwords match
    if data['password'] != data['confirm_password']:
        return jsonify({'error': 'Passwords do not match'}), 400
    
    # Validate password strength
    is_strong, message = is_valid_password(data['password'])
    if not is_strong:
        return jsonify({'error': message}), 400
    
    # Validate email
    if not is_valid_email(data['email']):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Check if username exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    # Check if email exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create new user
    new_user = User(
        full_name=data['full_name'].strip(),
        username=data['username'].strip().lower(),
        email=data['email'].strip().lower(),
        phone=data.get('phone', '').strip()
    )
    new_user.set_password(data['password'])
    
    # First user becomes admin
    if User.query.count() == 0:
        new_user.role = 'admin'
    
    db.session.add(new_user)
    db.session.commit()
    
    # Log registration activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=new_user.id,
        action='register',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    # Create tokens
    access_token = create_access_token(identity=new_user.id)
    refresh_token = create_refresh_token(identity=new_user.id)
    
    return jsonify({
        'message': 'Registration successful',
        'user': new_user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username_or_email = data.get('username_or_email', '').strip()
    password = data.get('password', '')
    remember_me = data.get('remember_me', False)
    
    if not username_or_email or not password:
        return jsonify({'error': 'Username/Email and password are required'}), 400
    
    # Find user by username or email
    user = User.query.filter(
        db.or_(
            User.username == username_or_email.lower(),
            User.email == username_or_email.lower()
        )
    ).first()
    
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is suspended. Please contact admin.'}), 403
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Log login activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user.id,
        action='login',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    # Create tokens
    expires_delta = None if remember_me else None  # Use default from config
    access_token = create_access_token(identity=user.id, expires_delta=expires_delta)
    refresh_token = create_refresh_token(identity=user.id)
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user or not user.is_active:
        return jsonify({'error': 'User not found or inactive'}), 401
    
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    user_id = get_jwt_identity()
    
    # Log logout activity
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        action='logout',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'message': 'Logout successful'}), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    # Update allowed fields
    if 'full_name' in data:
        user.full_name = data['full_name'].strip()
    if 'phone' in data:
        user.phone = data['phone'].strip()
    if 'email' in data and data['email'] != user.email:
        if not is_valid_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        if User.query.filter_by(email=data['email'].lower()).first():
            return jsonify({'error': 'Email already registered'}), 409
        user.email = data['email'].strip().lower()
        user.email_verified = False
    
    db.session.commit()
    
    # Log profile update
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        action='profile_update',
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
        'message': 'Profile updated successfully',
        'user': user.to_dict()
    }), 200

@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')
    
    if not current_password or not new_password:
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    if new_password != confirm_password:
        return jsonify({'error': 'New passwords do not match'}), 400
    
    if not user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password strength
    is_strong, message = is_valid_password(new_password)
    if not is_strong:
        return jsonify({'error': message}), 400
    
    user.set_password(new_password)
    db.session.commit()
    
    # Log password change
    user_agent = request.headers.get('User-Agent', '')
    device_info = get_device_info(user_agent)
    ip_address = request.remote_addr or request.headers.get('X-Forwarded-For', 'unknown')
    
    activity = ActivityLog(
        user_id=user_id,
        action='password_change',
        ip_address=ip_address,
        device_type=device_info['device_type'],
        device_name=device_info['device_name'],
        browser=device_info['browser'],
        os=device_info['os'],
        location=get_location_from_ip(ip_address)
    )
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'}), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    user = User.query.filter_by(email=email.lower()).first()
    
    if not user:
        # Don't reveal if email exists
        return jsonify({'message': 'If an account exists with this email, you will receive password reset instructions'}), 200
    
    # TODO: Send password reset email
    # For now, just return success message
    
    return jsonify({'message': 'If an account exists with this email, you will receive password reset instructions'}), 200