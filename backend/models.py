from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import bcrypt
import uuid
import secrets
import string

db = SQLAlchemy()

def generate_uuid():
    return str(uuid.uuid4())

def generate_share_token():
    """Generate a secure random token for document sharing"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    full_name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default='user')  # 'user' or 'admin'
    is_active = db.Column(db.Boolean, default=True)
    email_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    profile_image = db.Column(db.String(255), nullable=True)
    
    # Relationships
    documents = db.relationship('Document', backref='owner', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('ActivityLog', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt(rounds=12)
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Check if password matches"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'username': self.username,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'is_active': self.is_active,
            'email_verified': self.email_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'profile_image': self.profile_image
        }

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    
    # File info
    original_filename = db.Column(db.String(255), nullable=False)
    stored_filename = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_size = db.Column(db.Integer, nullable=False)  # in bytes
    mime_type = db.Column(db.String(100), nullable=False)
    
    # Document info
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=True)
    tags = db.Column(db.String(500), nullable=True)  # comma-separated tags
    
    # Security settings
    share_token = db.Column(db.String(64), unique=True, default=generate_share_token)
    password_hash = db.Column(db.String(255), nullable=True)  # optional password protection
    
    # Expiry and limits
    expiry_date = db.Column(db.DateTime, nullable=True)
    view_limit = db.Column(db.Integer, default=0)  # 0 = unlimited
    current_views = db.Column(db.Integer, default=0)
    download_limit = db.Column(db.Integer, default=0)  # 0 = unlimited
    current_downloads = db.Column(db.Integer, default=0)
    
    # Permissions
    allow_download = db.Column(db.Boolean, default=True)
    allow_print = db.Column(db.Boolean, default=True)
    allow_share = db.Column(db.Boolean, default=True)
    
    # Device restriction: 'mobile', 'desktop', 'both'
    device_restriction = db.Column(db.String(20), default='both')
    
    # Watermark settings
    watermark_enabled = db.Column(db.Boolean, default=False)
    watermark_text = db.Column(db.String(500), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_revoked = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activities = db.relationship('ActivityLog', backref='document', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Hash and set document password"""
        if password:
            salt = bcrypt.gensalt(rounds=12)
            self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        else:
            self.password_hash = None
    
    def check_password(self, password):
        """Check if document password matches"""
        if not self.password_hash:
            return True
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def is_expired(self):
        """Check if document has expired"""
        if self.expiry_date and datetime.utcnow() > self.expiry_date:
            return True
        return False
    
    def is_limit_reached(self):
        """Check if view limit has been reached"""
        if self.view_limit > 0 and self.current_views >= self.view_limit:
            return True
        return False
    
    def get_status(self):
        """Get document status"""
        if self.is_revoked:
            return 'revoked'
        if self.is_expired():
            return 'expired'
        if self.is_limit_reached():
            return 'limit_reached'
        if not self.is_active:
            return 'inactive'
        return 'active'
    
    def get_share_url(self, base_url):
        """Generate shareable URL"""
        return f"{base_url}/share/{self.share_token}"
    
    def to_dict(self, include_stats=False):
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'original_filename': self.original_filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'tags': self.tags,
            'share_token': self.share_token,
            'has_password': self.password_hash is not None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'view_limit': self.view_limit,
            'current_views': self.current_views,
            'download_limit': self.download_limit,
            'current_downloads': self.current_downloads,
            'allow_download': self.allow_download,
            'allow_print': self.allow_print,
            'allow_share': self.allow_share,
            'device_restriction': self.device_restriction,
            'watermark_enabled': self.watermark_enabled,
            'status': self.get_status(),
            'is_active': self.is_active,
            'is_revoked': self.is_revoked,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        
        if include_stats:
            data['activities'] = [activity.to_dict() for activity in self.activities]
        
        return data

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    document_id = db.Column(db.String(36), db.ForeignKey('documents.id'), nullable=True)
    
    # Activity details
    action = db.Column(db.String(50), nullable=False)  # 'view', 'download', 'print', 'share', 'upload', 'login', etc.
    status = db.Column(db.String(20), default='success')  # 'success', 'failed', 'blocked'
    
    # Device/Location info
    ip_address = db.Column(db.String(45), nullable=True)
    device_type = db.Column(db.String(50), nullable=True)  # 'mobile', 'desktop', 'tablet'
    device_name = db.Column(db.String(100), nullable=True)
    browser = db.Column(db.String(100), nullable=True)
    os = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(200), nullable=True)
    user_agent = db.Column(db.Text, nullable=True)
    
    # Additional info
    details = db.Column(db.Text, nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'document_id': self.document_id,
            'action': self.action,
            'status': self.status,
            'ip_address': self.ip_address,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'browser': self.browser,
            'os': self.os,
            'location': self.location,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class LoginAttempt(db.Model):
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    username_or_email = db.Column(db.String(120), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    success = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username_or_email': self.username_or_email,
            'ip_address': self.ip_address,
            'success': self.success,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }