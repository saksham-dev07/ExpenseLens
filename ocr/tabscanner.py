import time
import json
import logging
import requests
from typing import Dict, Any

logger = logging.getLogger(__name__)

import os

TABSCANNER_API_KEY = os.environ.get("TABSCANNER_API_KEY")
PROCESS_ENDPOINT = "https://api.tabscanner.com/api/2/process"
RESULT_ENDPOINT = "https://api.tabscanner.com/api/result"

def upload_receipt_to_tabscanner(file_path: str) -> str:
    """Uploads a receipt to Tabscanner and returns the token for polling."""
    try:
        with open(file_path, 'rb') as file:
            response = requests.post(
                PROCESS_ENDPOINT,
                headers={"apikey": TABSCANNER_API_KEY},
                files={"file": file}
            )
        
        response.raise_for_status()
        data = response.json()
        token = data.get("token")
        
        if not token:
            logger.error(f"Tabscanner API error: No token returned. Response: {data}")
            return None
            
        logger.info(f"Successfully uploaded receipt to Tabscanner. Token: {token}")
        return token
    except Exception as e:
        logger.exception(f"Error uploading receipt to Tabscanner: {e}")
        return None

def poll_tabscanner_result(token: str, max_retries: int = 20, wait_seconds: int = 2) -> Dict[str, Any]:
    """Polls the Tabscanner result endpoint until data is available or max retries exceeded."""
    url = f"{RESULT_ENDPOINT}/{token}"
    headers = {"apikey": TABSCANNER_API_KEY}
    
    for attempt in range(max_retries):
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            status = data.get("status", "").lower()
            
            if status in ["done", "complete", "completed"]:
                logger.info(f"Tabscanner processing complete for token: {token}")
                return data.get("result", {})
                
            logger.debug(f"Tabscanner status: {status}. Waiting {wait_seconds} seconds... (Attempt {attempt + 1}/{max_retries})")
            time.sleep(wait_seconds)
            
        except Exception as e:
            logger.exception(f"Error polling Tabscanner result: {e}")
            time.sleep(wait_seconds)
            
    logger.error(f"Tabscanner processing timed out for token: {token}")
    return {}

def extract_with_tabscanner(file_path: str) -> Dict[str, Any]:
    """
    Uploads file to Tabscanner, polls for result, and maps to the app's internal details format.
    """
    token = upload_receipt_to_tabscanner(file_path)
    if not token:
        return {}
        
    raw_result = poll_tabscanner_result(token)
    if not raw_result:
        return {}
        
    # Map Tabscanner result to our internal format
    details: Dict[str, Any] = {
        'bill_no': None,
        'merchant': None,
        'date_time': None,
        'items': [],
        'total_amount': None,
        'subtotal': None,
        'tax': None,
        'tip': None,
        'discount': None,
        'location': None,
        'currency': None,
        'payment_method': None,
        'card_last_four': None,
        'phone_number': None
    }
    
    # Debug: log all available keys from Tabscanner so we can map them
    logger.info(f"Tabscanner raw result keys: {list(raw_result.keys())}")
    logger.info(f"Tabscanner raw result: {json.dumps(raw_result, indent=2, default=str)[:2000]}")
    
    # Map merchant
    details['merchant'] = raw_result.get('establishment') or raw_result.get('merchantName') or raw_result.get('merchant')
    
    # Map bill no - try every possible field name Tabscanner might use
    details['bill_no'] = (
        raw_result.get('documentNumber') or 
        raw_result.get('invoiceNumber') or 
        raw_result.get('receiptNumber') or
        raw_result.get('billNumber') or
        raw_result.get('transactionNumber') or
        raw_result.get('referenceNumber') or
        raw_result.get('orderNumber')
    )
    
    # Map date (Prefer ISO format to ensure parsers.py can parse it)
    details['date_time'] = raw_result.get('dateISO') or raw_result.get('date')
    
    # Map total, tax, discount (Tabscanner usually returns string or float, we'll convert to string)
    total = raw_result.get('total')
    if total is not None:
        details['total_amount'] = str(total)
        
        
    tax = raw_result.get('tax')
    if tax is not None:
        details['tax'] = str(tax)
        
    subtotal = raw_result.get('subTotal')
    if subtotal is not None:
        details['subtotal'] = str(subtotal)
        
    tip = raw_result.get('tip')
    if tip is not None:
        details['tip'] = str(tip)
        
    discount = raw_result.get('discount')
    if discount is not None:
        details['discount'] = str(discount)
        
    details['currency'] = raw_result.get('currency')
    details['phone_number'] = raw_result.get('phoneNumber')
    details['payment_method'] = raw_result.get('paymentMethod')
    
    # Custom fields mapping for extra Tabscanner data
    custom_fields = raw_result.get('customFields', {})
    if custom_fields.get('CardLast4Digits'):
        details['card_last_four'] = custom_fields.get('CardLast4Digits')
        
    # Address mapping
    address = raw_result.get('address')
    if address:
        details['location'] = address
        
    # Map items
    line_items = raw_result.get('lineItems', [])
    for item in line_items:
        # Check standard properties Tabscanner might return
        desc = item.get('desc') or item.get('description') or item.get('name')
        if desc:
            qty = item.get('qty') or item.get('quantity') or 1
            price = item.get('lineTotal') or item.get('total') or item.get('price') or 0.00
            
            details['items'].append({
                'name': str(desc)[:100],
                'amount': str(price),
                'quantity': str(qty)
            })
            
    # As a fallback, we can add the raw JSON string as 'ocr_text' so it's stored and searchable
    # even though it's not raw OCR text anymore.
    details['_raw_json'] = json.dumps(raw_result, indent=2)
    
    return details
