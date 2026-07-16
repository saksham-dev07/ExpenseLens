import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
import json
import csv
import io
import services.db_service as db_service
from utils.parsers import parse_date, parse_decimal

receipt_bp = Blueprint('receipts', __name__)

@receipt_bp.route('/api/receipts', methods=['GET'])
@jwt_required()
def api_receipts():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 10, type=int), 100)
    per_page = max(per_page, 1)  # Prevent zero/negative
    category = request.args.get('category')
    
    receipts = db_service.get_user_receipts(user_id, category)
    total = len(receipts)
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1
    start = (page - 1) * per_page
    end = start + per_page
    paginated = receipts[start:end]
    
    # Format datetime and float fields for JSON serialization
    for r in paginated:
        if isinstance(r.get('date_time'), datetime):
            r['date_time'] = r['date_time'].isoformat()
        if isinstance(r.get('created_at'), datetime):
            r['created_at'] = r['created_at'].isoformat()
        for field in ['total_amount', 'tax', 'discount', 'usd_total', 'subtotal', 'tip']:
            if r.get(field) is not None:
                r[field] = str(r[field])
    
    return jsonify({
        'receipts': paginated,
        'pagination': {
            'page': page,
            'pages': pages,
            'per_page': per_page,
            'total': total
        }
    })

@receipt_bp.route('/api/receipt/<receipt_id>', methods=['GET', 'PUT', 'DELETE'])
@jwt_required()
def api_receipt_crud(receipt_id):
    user_id = get_jwt_identity()
    receipt = db_service.get_receipt(receipt_id, user_id=user_id)
    if not receipt:
        return jsonify({'error': 'Receipt not found'}), 404
    
    if request.method == 'GET':
        if isinstance(receipt.get('date_time'), datetime):
            receipt['date_time'] = receipt['date_time'].isoformat()
        if isinstance(receipt.get('created_at'), datetime):
            receipt['created_at'] = receipt['created_at'].isoformat()
        for field in ['total_amount', 'tax', 'discount', 'usd_total', 'subtotal', 'tip']:
            if receipt.get(field) is not None:
                receipt[field] = str(receipt[field])
        return jsonify(receipt)
        
    elif request.method == 'PUT':
        data = request.json
        if not data:
            return jsonify({'error': 'No JSON payload provided'}), 400
            
        update_data = {}
        if 'merchant' in data: update_data['merchant'] = data.get('merchant', '').strip() or receipt.get('merchant')
        if 'date_time' in data and data.get('date_time'): update_data['date_time'] = parse_date(data.get('date_time'))
        if 'total_amount' in data and data.get('total_amount'): update_data['total_amount'] = float(parse_decimal(data.get('total_amount')) or 0)
        if 'tax' in data and data.get('tax'): update_data['tax'] = float(parse_decimal(data.get('tax')) or 0)
        if 'discount' in data and data.get('discount'): update_data['discount'] = float(parse_decimal(data.get('discount')) or 0)
        if 'category' in data: update_data['category'] = data.get('category', '').strip() or receipt.get('category')
        if 'location' in data: update_data['location'] = data.get('location', '').strip() or receipt.get('location')
        if 'ocr_text' in data: update_data['ocr_text'] = data.get('ocr_text', '').strip() or receipt.get('ocr_text')
        
        db_service.save_receipt(update_data, receipt_id=receipt_id)
        return jsonify({'success': True, 'message': 'Receipt updated successfully'})
        
    elif request.method == 'DELETE':
        db_service.delete_receipt(receipt_id, user_id=user_id)
        return jsonify({'message': 'Receipt deleted successfully'})

@receipt_bp.route('/api/export', methods=['GET'])
@jwt_required()
def export_csv():
    user_id = get_jwt_identity()
    receipts = db_service.get_user_receipts(user_id)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Merchant', 'Date', 'Total Amount', 'Tax', 'Discount', 'Tip', 'Category', 'Location'])
    
    for r in receipts:
        writer.writerow([
            r.get('id', ''),
            r.get('merchant', ''),
            r.get('date_time').strftime('%Y-%m-%d %H:%M:%S') if isinstance(r.get('date_time'), datetime) else '',
            str(r.get('total_amount', '')),
            str(r.get('tax', '')),
            str(r.get('discount', '')),
            str(r.get('tip', '')),
            r.get('category', ''),
            r.get('location', '')
        ])
        
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=receipts_export.csv"}
    )

@receipt_bp.route('/api/search', methods=['POST'])
@jwt_required()
def semantic_search():
    user_id = get_jwt_identity()
    data = request.json
    query = (data.get('query', '') if data else '').strip()[:200]
    if not query: return jsonify({'error': 'Query is required'}), 400
        
    receipts = db_service.get_user_receipts(user_id)
    receipt_data = [{'id': r.get('id'), 'merchant': r.get('merchant'), 'date': str(r.get('date_time')), 'total': str(r.get('total_amount')), 'category': r.get('category'), 'items': r.get('items', [])} for r in receipts]
    
    prompt = f"""
    You are an AI assistant helping a user find receipts.
    User's search query: "{query}"
    Here is the list of all receipts in JSON format:
    {json.dumps(receipt_data)}
    Analyze the receipts and the user's query. Return ONLY a JSON array containing the IDs (strings) of the receipts that match the user's query.
    If none match, return an empty array [].
    Do not output any other text or markdown formatting. Just the JSON array.
    """
    try:
        from google import genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key: return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model='gemini-3.1-flash-lite', contents=prompt)
        response_text = response.text.strip()
        if response_text.startswith('```json'): response_text = response_text[7:]
        if response_text.endswith('```'): response_text = response_text[:-3]
        matched_ids = json.loads(response_text)
        return jsonify({'matched_ids': matched_ids})
    except Exception as e:
        current_app.logger.exception(f"Semantic search error: {e}")
        return jsonify({'error': 'An internal error occurred while processing your search.'}), 500

@receipt_bp.route('/api/advisor', methods=['GET'])
@jwt_required()
def ai_advisor():
    user_id = get_jwt_identity()
    receipts = db_service.get_user_receipts(user_id)
    if not receipts:
        return jsonify({'advice': 'No receipts found to analyze. Please upload some receipts first!'})
        
    receipt_data = [{'merchant': r.get('merchant'), 'date': str(r.get('date_time')), 'total': str(r.get('total_amount')), 'category': r.get('category'), 'items': r.get('items', [])} for r in receipts]
    
    prompt = f"""
    You are an expert AI Financial Advisor.
    Analyze the following user receipts and provide personalized budgeting advice, spending trends, and insights.
    Keep the advice concise, engaging, and structured with markdown.
    Receipts Data:
    {json.dumps(receipt_data)}
    Provide your financial advice in markdown format. Do not use ```markdown wrapper, just raw markdown text.
    """
    try:
        from google import genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key: return jsonify({'error': 'GEMINI_API_KEY not configured'}), 500
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model='gemini-3.1-flash-lite', contents=prompt)
        return jsonify({'advice': response.text.strip()})
    except Exception as e:
        current_app.logger.exception(f"AI Advisor error: {e}")
        return jsonify({'error': 'An internal error occurred while generating advice.'}), 500

@receipt_bp.route('/api/voice_search', methods=['POST'])
@jwt_required()
def voice_search():
    user_id = get_jwt_identity()
    query = request.form.get('query', '').strip()
    if not query:
        return jsonify({'error': 'No query provided.'}), 400
    
    receipts = db_service.get_user_receipts(user_id)
    query_lower = query.lower()
    
    results = []
    for r in receipts:
        if (query_lower in str(r.get('ocr_text', '')).lower() or 
            query_lower in str(r.get('merchant', '')).lower() or 
            query_lower in str(r.get('category', '')).lower()):
            if isinstance(r.get('date_time'), datetime): r['date_time'] = r['date_time'].isoformat()
            if isinstance(r.get('created_at'), datetime): r['created_at'] = r['created_at'].isoformat()
            results.append(r)
            if len(results) >= 20:
                break
                
    return jsonify({'results': results, 'count': len(results)})

@receipt_bp.route('/api/notifications')
@jwt_required()
def notifications():
    user_id = get_jwt_identity()
    recent_time = datetime.now(timezone.utc) - timedelta(hours=24)
    receipts = db_service.get_user_receipts(user_id)
    
    recent_receipts = sum(1 for r in receipts if r.get('date_time') and (isinstance(r['date_time'], datetime) and r['date_time'] >= recent_time))
    
    notifications = []
    if recent_receipts > 0:
        notifications.append({
            'type': 'info',
            'message': f'{recent_receipts} new receipt(s) processed in the last 24 hours',
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
    
    return jsonify({'notifications': notifications})
