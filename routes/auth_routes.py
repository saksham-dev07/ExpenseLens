import re
from flask import Blueprint, request, jsonify
from extensions import bcrypt, limiter, jwt_blocklist
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
import services.db_service as db_service

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    # Validate username format
    username = data['username'].strip()
    if not re.match(r'^[a-zA-Z0-9_]{3,30}$', username):
        return jsonify({'error': 'Username must be 3-30 characters, alphanumeric and underscores only'}), 400

    # Validate email format
    email = data['email'].strip().lower()
    if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Enforce password complexity
    password = data['password']
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long'}), 400
    if not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        return jsonify({'error': 'Password must contain at least one uppercase letter and one digit'}), 400
        
    if db_service.get_user_by_username(username):
        return jsonify({'error': 'Username already exists'}), 400
        
    if db_service.get_user_by_email(email):
        return jsonify({'error': 'Email already exists'}), 400
        
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = db_service.create_user(
        username=username,
        email=email,
        password_hash=hashed_password
    )
    
    access_token = create_access_token(identity=str(new_user['id']))
    return jsonify({
        'message': 'User created successfully',
        'token': access_token,
        'user': {'id': new_user['id'], 'username': new_user['username'], 'email': new_user['email']}
    }), 201

@auth_bp.route('/api/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing username or password'}), 400
        
    user = db_service.get_user_by_username(data['username'])
    if not user or not bcrypt.check_password_hash(user['password_hash'], data['password']):
        return jsonify({'error': 'Invalid username or password'}), 401
        
    access_token = create_access_token(identity=str(user['id']))
    return jsonify({
        'token': access_token,
        'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
    }), 200

@auth_bp.route('/api/logout', methods=['POST'])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]  # JWT ID — unique identifier for this token
    jwt_blocklist.add(jti)
    return jsonify({'message': 'Successfully logged out'}), 200

@auth_bp.route('/api/me', methods=['GET'])
@jwt_required()
def get_me():
    current_user_id = get_jwt_identity()
    user = db_service.get_user_by_id(current_user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    return jsonify({
        'user': {'id': user['id'], 'username': user['username'], 'email': user['email']}
    }), 200

@auth_bp.route('/api/users/me', methods=['DELETE'])
@jwt_required()
def delete_me():
    current_user_id = get_jwt_identity()
    # Also revoke the current token so it can't be reused
    jti = get_jwt()["jti"]
    jwt_blocklist.add(jti)
    db_service.delete_user_account(current_user_id)
    return jsonify({'message': 'Account and all associated personal data successfully deleted'}), 200
