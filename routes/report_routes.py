import csv
import io
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_file
import services.db_service as db_service
from flask_jwt_extended import jwt_required, get_jwt_identity

report_bp = Blueprint('reports', __name__)

@report_bp.route('/api/stats')
@jwt_required()
def api_stats():
    try:
        user_id = get_jwt_identity()
        receipts = db_service.get_user_receipts(user_id)
        total_amount = sum(float(r.get('total_amount', 0) or 0) for r in receipts)
        average_amount = total_amount / len(receipts) if receipts else 0.0
        
        return jsonify({
            'total_receipts': len(receipts),
            'total_amount': total_amount,
            'average_amount': average_amount
        })
    except Exception as e:
        current_app.logger.exception(f"Error loading stats: {e}")
        return jsonify({'error': 'Error loading dashboard data.'}), 500

@report_bp.route('/api/reports_data')
@jwt_required()
def api_reports_data():
    try:
        user_id = get_jwt_identity()
        receipts = db_service.get_user_receipts(user_id)
        category_data = {}
        monthly_data = {}
        
        for receipt in receipts:
            category = receipt.get('category') or 'others'
            amount = float(receipt.get('total_amount', 0) or 0)
            
            category_data[category] = category_data.get(category, 0.0) + amount
            
            dt = receipt.get('date_time')
            if dt and isinstance(dt, datetime):
                month_key = dt.strftime('%Y-%m')
            elif dt and isinstance(dt, str):
                try:
                    month_key = dt[:7]
                except:
                    month_key = 'unknown'
            else:
                month_key = 'unknown'
                
            monthly_data[month_key] = monthly_data.get(month_key, 0.0) + amount
        
        monthly_data = dict(sorted(monthly_data.items()))
        
        return jsonify({
            'category_data': category_data,
            'monthly_data': monthly_data
        })
    except Exception as e:
        current_app.logger.exception(f"Error generating reports: {e}")
        return jsonify({'error': 'Error generating reports.'}), 500

@report_bp.route('/api/export/<string:export_format>')
@jwt_required()
def export_data(export_format: str):
    if export_format.lower() != 'csv':
        return jsonify({'error': 'Only CSV export is supported.'}), 400
    
    try:
        user_id = get_jwt_identity()
        receipts = db_service.get_user_receipts(user_id)
        output_stream = io.StringIO()
        writer = csv.writer(output_stream)
        
        writer.writerow([
            'ID', 'Bill Number', 'Merchant', 'Date', 'Total Amount', 
            'Tax', 'Discount', 'Category', 'Location'
        ])
        
        for receipt in receipts:
            dt = receipt.get('date_time')
            dt_str = dt.isoformat() if isinstance(dt, datetime) else str(dt) if dt else ''
            writer.writerow([
                receipt.get('id', ''),
                receipt.get('bill_no', ''),
                receipt.get('merchant', ''),
                dt_str,
                str(receipt.get('total_amount', '0.00')),
                str(receipt.get('tax', '0.00')),
                str(receipt.get('discount', '0.00')),
                receipt.get('category') or 'others',
                receipt.get('location', '')
            ])
        
        output_data = output_stream.getvalue()
        output_stream.close()
        
        return send_file(
            io.BytesIO(output_data.encode('utf-8')),
            mimetype='text/csv',
            as_attachment=True,
            download_name=f'receipts_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
        
    except Exception as e:
        current_app.logger.exception(f"Error exporting data: {e}")
        return jsonify({'error': 'Error exporting data.'}), 500
