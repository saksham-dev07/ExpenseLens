import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("CRITICAL: No SECRET_KEY set for Flask application. You must set this in your environment.")
        
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("CRITICAL: No JWT_SECRET_KEY set for Flask application. You must set this in your environment.")
    if len(JWT_SECRET_KEY) < 32:
        raise ValueError("CRITICAL: JWT_SECRET_KEY must be at least 32 characters. Generate one with: python -c 'import secrets; print(secrets.token_hex(64))'")
        
    JWT_ACCESS_TOKEN_EXPIRES = 3600 # 1 hour
    
    FIREBASE_STORAGE_BUCKET = os.environ.get('FIREBASE_STORAGE_BUCKET')
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB limit
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
    OCR_CONFIDENCE_THRESHOLD = int(os.getenv('OCR_CONFIDENCE_THRESHOLD', 30))
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ['true', '1', 'yes']
