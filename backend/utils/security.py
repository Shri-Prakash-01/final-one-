import os
import hashlib
import hmac
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from user_agents import parse
import requests

def get_encryption_key(secret_key):
    """Generate encryption key from secret"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'secure_vault_salt',
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
    return key

def encrypt_file(file_path, key):
    """Encrypt a file using Fernet"""
    f = Fernet(get_encryption_key(key))
    with open(file_path, 'rb') as file:
        file_data = file.read()
    encrypted_data = f.encrypt(file_data)
    with open(file_path, 'wb') as file:
        file.write(encrypted_data)
    return True

def decrypt_file(file_path, key):
    """Decrypt a file using Fernet"""
    f = Fernet(get_encryption_key(key))
    with open(file_path, 'rb') as file:
        encrypted_data = file.read()
    decrypted_data = f.decrypt(encrypted_data)
    return decrypted_data

def get_device_info(user_agent_string):
    """Parse user agent and return device info"""
    if not user_agent_string:
        return {
            'device_type': 'unknown',
            'device_name': 'Unknown Device',
            'browser': 'Unknown Browser',
            'os': 'Unknown OS'
        }
    
    user_agent = parse(user_agent_string)
    
    # Determine device type
    if user_agent.is_mobile:
        device_type = 'mobile'
    elif user_agent.is_tablet:
        device_type = 'tablet'
    else:
        device_type = 'desktop'
    
    # Get device name
    device_name = f"{user_agent.device.brand or 'Unknown'} {user_agent.device.model or 'Device'}".strip()
    if device_name == 'Unknown Device':
        device_name = device_type.title()
    
    return {
        'device_type': device_type,
        'device_name': device_name,
        'browser': f"{user_agent.browser.family} {user_agent.browser.version_string}".strip(),
        'os': f"{user_agent.os.family} {user_agent.os.version_string}".strip()
    }

def get_location_from_ip(ip_address):
    """Get approximate location from IP address"""
    try:
        # For production, use a proper geolocation service
        # This is a simple implementation
        if ip_address == '127.0.0.1' or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
            return 'Local Network'
        
        # You can integrate with ip-api.com, ipinfo.io, or similar services
        # response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=2)
        # if response.status_code == 200:
        #     data = response.json()
        #     return f"{data.get('city', '')}, {data.get('country', '')}".strip(', ')
        
        return 'Unknown Location'
    except Exception:
        return 'Unknown Location'

def check_device_restriction(user_agent_string, restriction):
    """Check if device meets the restriction criteria"""
    device_info = get_device_info(user_agent_string)
    device_type = device_info['device_type']
    
    if restriction == 'both':
        return True
    elif restriction == 'mobile':
        return device_type in ['mobile', 'tablet']
    elif restriction == 'desktop':
        return device_type == 'desktop'
    
    return True

def generate_watermark_text(user_email, ip_address, timestamp):
    """Generate watermark text for documents"""
    return f"Confidential | {user_email} | {ip_address} | {timestamp.strftime('%Y-%m-%d %H:%M')}"

def hash_ip_address(ip_address):
    """Hash IP address for privacy"""
    return hashlib.sha256(ip_address.encode()).hexdigest()[:16]

def secure_filename(filename):
    """Secure a filename by removing dangerous characters"""
    filename = os.path.basename(filename)
    # Keep only safe characters
    keepcharacters = (' ', '.', '_', '-')
    filename = "".join(c for c in filename if c.isalnum() or c in keepcharacters).strip()
    return filename

def format_file_size(size_bytes):
    """Format file size to human readable format"""
    if size_bytes == 0:
        return "0 B"
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.2f} {size_names[i]}"

def is_allowed_file(filename, allowed_extensions=None):
    """Check if file extension is allowed"""
    if allowed_extensions is None:
        allowed_extensions = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def get_file_extension(filename):
    """Get file extension"""
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''

def get_file_icon(file_type):
    """Get icon class based on file type"""
    icons = {
        'pdf': 'file-pdf',
        'doc': 'file-word',
        'docx': 'file-word',
        'xls': 'file-excel',
        'xlsx': 'file-excel',
        'ppt': 'file-powerpoint',
        'pptx': 'file-powerpoint',
        'jpg': 'file-image',
        'jpeg': 'file-image',
        'png': 'file-image',
        'gif': 'file-image',
        'txt': 'file-text',
        'zip': 'file-archive',
        'rar': 'file-archive'
    }
    return icons.get(file_type.lower(), 'file')