import os
from flask import current_app
import services.db_service as db_service
from ocr.engine import perform_ocr, process_pdf, extract_receipt_details
from utils.parsers import parse_date, parse_decimal, categorize_expense

import uuid
from firebase_admin import storage

def process_receipt_file(file_path: str, user_id: int = None):
    """
    Process a receipt file (image or PDF): perform OCR, extract details,
    convert values to appropriate types, categorize, and store the record in the database.
    """
    app = current_app._get_current_object()
    with app.app_context():
        try:
            if not os.path.exists(file_path) or not os.access(file_path, os.R_OK):
                app.logger.error(f"File not readable: {file_path}")
                return None
            
            from ocr.custom_ai import extract_with_custom_ai
            from ocr.tabscanner import extract_with_tabscanner
            
            app.logger.info(f"Attempting to extract data using Custom AI for {file_path}")
            details = extract_with_custom_ai(file_path)
            ocr_text = ""
            
            if not details or not details.get('merchant'):
                app.logger.info(f"Custom AI unavailable or failed. Falling back to Local OCR + Gemini AI for {file_path}")
                
                if file_path.lower().endswith('.pdf'):
                    ocr_text = process_pdf(file_path)
                else:
                    ocr_text, _ = perform_ocr(file_path)
                    
                if ocr_text and ocr_text.strip():
                    from ocr.llm_parser import extract_with_llm
                    app.logger.info(f"Using LLM intelligent parser for {file_path}")
                    details = extract_with_llm(ocr_text)
                    
                    if not details or not details.get('merchant'):
                        app.logger.info(f"LLM parser unavailable or failed. Falling back to regex parser for {file_path}")
                        from ocr.engine import extract_receipt_details
                        details = extract_receipt_details(ocr_text)
                else:
                    app.logger.warning(f"No OCR text extracted from {file_path}")
            else:
                ocr_text = details.pop('_raw_json', '')
                
            if not details or not details.get('merchant'):
                app.logger.info(f"Local OCR returned empty or failed. Falling back to Tabscanner API for {file_path}")
                details = extract_with_tabscanner(file_path)
                if details:
                    ocr_text = details.pop('_raw_json', '')

        except Exception as e:
            app.logger.exception(f"Error processing file {file_path}: {e}")
            return None

        if not details.get('merchant'):
            details['merchant'] = "Unknown Merchant"
        
        category = details.get('category') or categorize_expense(details.get('merchant'), details.get('items'))
        
        receipt_date = parse_date(details.get('date_time'))
        total_amt = parse_decimal(details.get('total_amount'))
        tax_amt = parse_decimal(details.get('tax'))
        discount_amt = parse_decimal(details.get('discount'))

        try:
            items_list = []
            for item in details.get('items', [])[:20]:
                if item.get('name') and item.get('amount'):
                    items_list.append({
                        'name': item.get('name')[:100],
                        'amount': float(parse_decimal(item.get('amount')) or 0)
                    })
            
            receipt = {
                'user_id': user_id,
                'bill_no': details.get('bill_no'),
                'merchant': details.get('merchant'),
                'date_time': receipt_date,
                'total_amount': float(total_amt or 0),
                'usd_total': float(parse_decimal(details.get('usd_total')) or 0),
                'tax': float(tax_amt or 0),
                'discount': float(discount_amt or 0),
                'ocr_text': ocr_text[:5000],
                'category': category,
                'location': details.get('location'),
                'currency': details.get('currency'),
                'subtotal': float(parse_decimal(details.get('subtotal')) or 0),
                'tip': float(parse_decimal(details.get('tip')) or 0),
                'payment_method': details.get('payment_method'),
                'card_last_four': details.get('card_last_four'),
                'phone_number': details.get('phone_number'),
                'taxes': details.get('taxes'),
                'items': items_list
            }
            
            # Firebase Upload logic
            firebase_bucket_name = os.environ.get('FIREBASE_STORAGE_BUCKET')
            if firebase_bucket_name:
                try:
                    bucket = storage.bucket()
                    filename = f"user_{user_id}/{uuid.uuid4()}_{os.path.basename(file_path)}"
                    blob = bucket.blob(filename)
                    blob.upload_from_filename(file_path)
                    
                    # Generate a signed URL that expires in 1 hour (don't make blobs public)
                    from datetime import timedelta
                    firebase_url = blob.generate_signed_url(
                        version="v4",
                        expiration=timedelta(hours=1),
                        method="GET"
                    )
                    receipt['s3_url'] = firebase_url
                    app.logger.info(f"Uploaded receipt to Firebase: {firebase_url}")
                except Exception as e:
                    app.logger.error(f"Failed to upload to Firebase: {e}")
                    # Fallback to local storage naturally
            else:
                app.logger.warning("FIREBASE_STORAGE_BUCKET not set. Falling back to local storage.")
            
            # Save receipt using db_service
            saved_receipt = db_service.save_receipt(receipt)
            app.logger.info(f"Successfully processed receipt with ID: {saved_receipt.get('id')}")
            return saved_receipt
            
        except Exception as e:
            app.logger.exception(f"Database error processing {file_path}: {e}")
            return None
