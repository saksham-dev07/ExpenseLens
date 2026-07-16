import os
import threading
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import limiter
import services.db_service as db_service
from ocr.engine import perform_ocr, process_pdf, extract_receipt_details
from utils.parsers import parse_date, parse_decimal, categorize_expense
from services.receipt_service import process_receipt_file

upload_bp = Blueprint('upload', __name__)

def allowed_file(filename: str) -> bool:
    if not filename or '.' not in filename:
        return False
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in current_app.config['ALLOWED_EXTENSIONS']

def run_background_task(app, task_id, file_path, user_id):
    """Background worker to process OCR and update Task status."""
    with app.app_context():
        try:
            receipt = process_receipt_file(file_path, user_id=user_id)
            task = db_service.get_task(task_id)
            if not task:
                return
            
            if receipt:
                db_service.update_task(task_id, {'status': 'completed', 'result_id': receipt.get('id')})
            else:
                db_service.update_task(task_id, {'status': 'failed', 'error': 'OCR Extraction failed to return a receipt.'})
                
        except Exception as e:
            task = db_service.get_task(task_id)
            if task:
                db_service.update_task(task_id, {'status': 'failed', 'error': str(e)})

@upload_bp.route('/api/upload_files', methods=['POST'])
@jwt_required()
@limiter.limit("20 per minute")
def api_upload_files():
    files = request.files.getlist('receipt_files')
    user_id = get_jwt_identity()
    
    if not files or not any(file.filename for file in files):
        return jsonify({'error': 'No files selected.'}), 400
    
    app = current_app._get_current_object()
    tasks_created = []
    
    for file in files:
        if file and file.filename and allowed_file(file.filename):
            try:
                filename = secure_filename(file.filename)
                if not filename:
                    continue
                    
                unique_filename = f"{uuid.uuid4()}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                
                # Create Task in DB
                task_id = str(uuid.uuid4())
                db_service.create_task(task_id, filename, user_id=user_id)
                
                tasks_created.append({'task_id': task_id, 'filename': filename})
                
                # Start background thread
                thread = threading.Thread(target=run_background_task, args=(app, task_id, file_path, user_id))
                thread.daemon = True
                thread.start()
                
            except Exception as e:
                app.logger.exception(f"Error saving file {file.filename}: {e}")

    return jsonify({
        'success': True,
        'tasks': tasks_created
    })

@upload_bp.route('/api/tasks/<task_id>', methods=['GET'])
@jwt_required()
def get_task_status(task_id):
    user_id = get_jwt_identity()
    task = db_service.get_task(task_id)
    if not task or task.get('user_id') != user_id:
        return jsonify({'error': 'Task not found'}), 404
        
    return jsonify(task)

@upload_bp.route('/api/ocr_preview', methods=['POST'])
@jwt_required()
@limiter.limit("30 per minute")
def ocr_preview():
    try:
        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({'error': 'No file uploaded.'}), 400
            
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed.'}), 400
        
        filename = secure_filename(file.filename)
        if not filename:
            return jsonify({'error': 'Invalid filename.'}), 400
            
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], f"preview_{uuid.uuid4()}_{filename}")
        file.save(file_path)
        
        try:
            if file_path.lower().endswith('.pdf'):
                poppler_path = current_app.config.get('POPPLER_PATH')
                ocr_text = process_pdf(file_path, poppler_path=poppler_path)
            else:
                ocr_text, _ = perform_ocr(file_path)
            
            details = extract_receipt_details(ocr_text)
            
            return jsonify({
                'ocr_text': ocr_text,
                'merchant': details.get('merchant'),
                'total_amount': details.get('total_amount'),
                'date_time': details.get('date_time'),
                'items_count': len(details.get('items', []))
            })
            
        finally:
            if os.path.exists(file_path):
                os.remove(file_path)
                
    except Exception as e:
        current_app.logger.exception(f"Error in OCR preview: {e}")
        return jsonify({'error': 'Error processing file.'}), 500
