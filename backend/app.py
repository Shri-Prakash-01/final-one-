import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from config import config
from models import db

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)
    migrate = Migrate(app, db)
    
    # Configure CORS
    CORS(app, 
         resources={r"/api/*": {"origins": app.config.get('CORS_ORIGINS', ['*'])}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    
    # Create upload directory
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'uploads'), exist_ok=True)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.documents import documents_bp
    from routes.share import share_bp
    from routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(share_bp, url_prefix='/api/share')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'code': 'token_expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'code': 'invalid_token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authentication required', 'code': 'authorization_required'}), 401
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500
    
    @app.errorhandler(413)
    def file_too_large(e):
        return jsonify({'error': 'File too large. Maximum size is 100MB'}), 413
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy', 'message': 'Secure Vault API is running'}), 200
    
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
        # Create default admin user if no users exist
        from models import User
        if User.query.count() == 0:
            admin = User(
                full_name='System Admin',
                username='admin',
                email='admin@securevault.com',
                role='admin'
            )
            admin.set_password('Admin@123456')
            db.session.add(admin)
            db.session.commit()
            print("Default admin user created: admin@securevault.com / Admin@123456")
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=8000, host='0.0.0.0')