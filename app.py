import os
import logging
import firebase_admin
from firebase_admin import credentials
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
load_dotenv()

from extensions import limiter
from config import Config
from errors import register_error_handlers

def create_app() -> Flask:
    """Application factory function."""
    app = Flask(__name__)

    # --- Configuration ---
    app.config.from_object(Config)

    import re
    # Initialize CORS with explicit origins and Regex for Vercel preview domains
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://expense-lens-two.vercel.app",
        re.compile(r"https://expense-lens.*\.vercel\.app")
    ]}})
    limiter.init_app(app)
    
    # Initialize Firebase
    if not firebase_admin._apps:
        # Prioritize standard GOOGLE_APPLICATION_CREDENTIALS environment variable
        env_cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        local_cred_path = os.path.join(os.path.dirname(__file__), 'firebase_credentials.json')
        
        if env_cred_path and os.path.exists(env_cred_path):
            cred = credentials.Certificate(env_cred_path)
            app.logger.info("Using Firebase credentials from GOOGLE_APPLICATION_CREDENTIALS")
        elif os.path.exists(local_cred_path):
            cred = credentials.Certificate(local_cred_path)
            app.logger.info("Using Firebase credentials from local firebase_credentials.json")
        else:
            app.logger.error("No Firebase credentials found!")
            raise ValueError("Firebase credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS env var.")

        firebase_admin.initialize_app(cred, {
            'storageBucket': app.config['FIREBASE_STORAGE_BUCKET']
        })
        app.logger.info("Firebase initialized successfully")
            
    from extensions import jwt, bcrypt, jwt_blocklist
    jwt.init_app(app)
    bcrypt.init_app(app)
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Register JWT blocklist checker for token revocation on logout
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return jti in jwt_blocklist
    
    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Register blueprints
    from routes.upload_routes import upload_bp
    from routes.receipt_routes import receipt_bp
    from routes.report_routes import report_bp
    from routes.auth_routes import auth_bp
    
    app.register_blueprint(upload_bp)
    app.register_blueprint(receipt_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(auth_bp)

    # Register centralized error handlers
    register_error_handlers(app)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=app.config.get('DEBUG', False), host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))