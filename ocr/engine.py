import os
import re
import tempfile
import logging
from typing import Tuple, Dict, Any, List
from contextlib import contextmanager

from PIL import Image, ImageOps, ImageEnhance
import pytesseract
import fitz

from utils.parsers import parse_decimal

logger = logging.getLogger(__name__)


def configure_tesseract():
    """Configure Tesseract executable path based on the operating system."""
    import sys
    
    pytesseract.pytesseract.tesseract_cmd = "/usr/bin/tesseract"
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    if sys.platform.startswith('win'):
        tesseract_executable = os.path.join(current_dir, 'tesseract', 'tesseract.exe')
    else:
        tesseract_executable = os.path.join(current_dir, 'tesseract', 'tesseract')
    
    if os.path.exists(tesseract_executable):
        pytesseract.pytesseract.tesseract_cmd = tesseract_executable
        logger.info(f"Using local Tesseract executable: {tesseract_executable}")
    else:
        logger.warning(f"Local Tesseract executable not found at: {tesseract_executable}")
        logger.info("Falling back to system Tesseract installation")


# Initialize Tesseract configuration on module import
configure_tesseract()


@contextmanager
def handle_file_operations():
    """Context manager for safe file operations."""
    temp_files = []
    try:
        yield temp_files
    finally:
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.debug(f"Cleaned up temporary file: {temp_file}")
            except OSError as e:
                logger.error(f"Error cleaning up temporary file {temp_file}: {e}")


def preprocess_image(file_path: str) -> str:
    """
    Convert an image to grayscale and apply binary thresholding.
    Saves the preprocessed image with '_preprocessed' appended to its filename.
    Returns the preprocessed image file path.
    """
    try:
        with Image.open(file_path) as img:
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.5)
            
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.2)
            
            gray_img = ImageOps.grayscale(img)
            threshold_img = gray_img.point(lambda x: 0 if x < 128 else 255, mode='1')
            
            preprocessed_path = f"{os.path.splitext(file_path)[0]}_preprocessed.jpg"
            threshold_img.save(preprocessed_path, quality=95, optimize=True)
            logger.debug(f"Preprocessed image saved at {preprocessed_path}")
            return preprocessed_path
            
    except Exception as e:
        logger.exception(f"Error preprocessing image {file_path}: {e}")
        raise


def ocr_receipt(file_path: str) -> Tuple[str, str]:
    """
    Preprocess the image and perform OCR using Tesseract.
    Saves the OCR text to a file and returns a tuple (ocr_text, text_file_path).
    """
    ocr_text = ""
    text_file_path = ""
    preprocessed_path = None
    
    try:
        preprocessed_path = preprocess_image(file_path)
        
        with Image.open(preprocessed_path) as processed_img:
            configs = [
                r'--oem 3 --psm 6',
                r'--oem 3 --psm 4',
                r'--oem 3 --psm 3'
            ]
            
            best_text = ""
            
            for config in configs:
                try:
                    text = pytesseract.image_to_string(processed_img, config=config)
                    if len(text.strip()) > len(best_text.strip()):
                        best_text = text
                except Exception as e:
                    logger.warning(f"OCR config {config} failed: {e}")
                    continue
            
            ocr_text = best_text if best_text else pytesseract.image_to_string(processed_img)
        
        text_file_path = f"{os.path.splitext(file_path)[0]}.txt"
        with open(text_file_path, 'w', encoding='utf-8') as f:
            f.write(ocr_text)
        
        logger.debug(f"OCR completed. Text length: {len(ocr_text)} characters")
        logger.debug(f"OCR text saved at {text_file_path}")
            
    except Exception as e:
        logger.exception(f"OCR error processing {file_path}: {e}")
    finally:
        if preprocessed_path and os.path.exists(preprocessed_path):
            try:
                os.remove(preprocessed_path)
            except OSError as e:
                logger.error(f"Error cleaning up preprocessed image: {e}")
        
    return ocr_text, text_file_path


perform_ocr = ocr_receipt


def process_pdf(file_path: str) -> str:
    """
    Convert a PDF to images and extract OCR text from each page using PyMuPDF.
    Returns the concatenated OCR text.
    """
    full_ocr_text = ""
    
    with handle_file_operations() as temp_files:
        try:
            doc = fitz.open(file_path)
            logger.debug(f"Opened PDF with {len(doc)} page(s)")
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Render page at 300 DPI
                pix = page.get_pixmap(dpi=300)
                
                with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
                    temp_image_path = temp_file.name
                    temp_files.append(temp_image_path)
                
                try:
                    pix.save(temp_image_path)
                    logger.debug(f"Saved temporary image for PDF page {page_num + 1}: {temp_image_path}")
                    
                    page_text, _ = perform_ocr(temp_image_path)
                    if page_text.strip():
                        full_ocr_text += f"--- Page {page_num + 1} ---\n{page_text}\n"
                    
                except Exception as e:
                    logger.exception(f"Error processing PDF page {page_num + 1}: {e}")
                    
        except Exception as e:
            logger.exception(f"Error converting PDF {file_path}: {e}")
            
    return full_ocr_text


def extract_receipt_details(ocr_text: str) -> Dict[str, Any]:
    """
    Extract receipt details such as merchant, bill number, date, total amount,
    tax, discount, and items from the OCR text.
    """
    from decimal import Decimal
    
    details: Dict[str, Any] = {
        'bill_no': None,
        'merchant': None,
        'date_time': None,
        'items': [],
        'total_amount': None,
        'tax': None,
        'discount': None,
        'location': None
    }

    if not ocr_text or not ocr_text.strip():
        return details

    lines = [line.strip() for line in ocr_text.splitlines() if line.strip()]
    
    if not lines:
        return details

    # Merchant Extraction
    merchant_patterns = [
        r'^([A-Za-z\s&\-.\']+(?:Ltd|Inc|Corp|LLC|Co\.)?)\s*$',
        r'^([A-Za-z\s&\-.\']{3,50})\s*$'
    ]
    skip_words = {'receipt', 'bill', 'invoice', 'tax', 'total', 'amount', 'date', 'time'}
    
    for i, line in enumerate(lines[:7]):
        line_lower = line.lower()
        if any(skip_word in line_lower for skip_word in skip_words):
            continue
            
        for pattern in merchant_patterns:
            if re.match(pattern, line) and len(line) > 2:
                details['merchant'] = line.strip()
                break
        if details['merchant']:
            break
            
    if not details['merchant']:
        for line in lines[:5]:
            line_lower = line.lower()
            if not any(skip_word in line_lower for skip_word in skip_words) and len(line) > 2:
                details['merchant'] = line
                break

    # Bill Number Extraction
    bill_no_patterns = [
        r'\b(?:Bill|Invoice|Receipt)\s*(?:No\.?|#|Number)[:\s]*([A-Za-z0-9\-]+)',
        r'\b(?:BILL|INVOICE|RECEIPT)\s*(?:NO\.?|#|NUMBER)[:\s]*([A-Za-z0-9\-]+)',
        r'(?:Order|Ref|Transaction)\s*(?:No\.?|#|ID)[:\s]*([A-Za-z0-9\-]+)',
        r'#\s*([A-Za-z0-9\-]{3,})'
    ]
    
    for line in lines:
        for pattern in bill_no_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                bill_no = match.group(1).strip()
                if len(bill_no) >= 3:
                    details['bill_no'] = bill_no
                    break
        if details['bill_no']:
            break

    # Date Extraction
    date_patterns = [
        r'\b(?P<day>\d{1,2})[/-](?P<month>\d{1,2})[/-](?P<year>\d{2,4})\b',
        r'\b(?P<year>\d{4})[/-](?P<month>\d{1,2})[/-](?P<day>\d{1,2})\b',
        r'\b(?P<day>\d{1,2})\s+(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?P<year>\d{2,4})\b',
        r'\b(?P<month>Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?P<day>\d{1,2}),?\s+(?P<year>\d{2,4})\b',
        r'\b(?P<year>\d{4})(?P<month>\d{2})(?P<day>\d{2})\b'
    ]
    
    for line in lines:
        for pattern in date_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                details['date_time'] = match.group(0)
                break
        if details['date_time']:
            break

    # Total Amount Extraction
    total_patterns = [
        r'\b(?:TOTAL|Grand\s*Total|AMOUNT|Net\s*Amount|Amount\s*Due|Final\s*Total)\b[^\d]*?([\$€£₹]?\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2})?)',
        r'([\$€£₹]\s*\d{1,3}(?:[,\s]\d{3})*(?:\.\d{2}))\s*(?:TOTAL|Grand\s*Total)?',
        r'\bTOTAL[:\s]*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)',
        r'\b(?:Sum|Balance|Pay)\s*:?\s*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)'
    ]
    
    for line in reversed(lines):
        for pattern in total_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                amount = match.group(1).strip()
                try:
                    decimal_amt = parse_decimal(amount)
                    if decimal_amt > Decimal('0.01'):
                        details['total_amount'] = amount
                        break
                except:
                    continue
        if details['total_amount']:
            break

    # Items Extraction
    item_patterns = [
        r'^(?P<item>.{3,40}?)\s+(?P<qty>\d+(?:\.\d+)?)\s*[x×*]\s*(?P<price>[\$€£₹]?\s*\d+(?:[,\.]\d+)*)\s*(?P<total>[\$€£₹]?\s*\d+(?:[,\.]\d+)*)\s*$',
        r'^(?P<item>.{3,40}?)\s+(?P<price>[\$€£₹]?\s*\d+(?:[,\.]\d+)*)\s*$',
        r'^(?P<item>.{3,40}?)\s+(?P<qty>\d+)\s+(?P<total>[\$€£₹]?\s*\d+(?:[,\.]\d+)*)\s*$'
    ]
    
    skip_keywords = {
        'total', 'amount', 'tax', 'discount', 'invoice', 'bill', 'subtotal', 
        'balance', 'change', 'paid', 'cash', 'card', 'credit', 'debit', 
        'payment', 'receipt', 'thank', 'visit', 'welcome', 'phone', 'address'
    }
    
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in skip_keywords):
            continue
            
        if len(line.strip()) < 3 or len(line.strip()) > 80:
            continue
            
        for pattern in item_patterns:
            match = re.match(pattern, line, re.IGNORECASE)
            if match:
                item_name = match.group('item').strip(' -.,')
                
                if (len(item_name) > 2 and 
                    item_name.lower() not in skip_keywords and
                    not re.match(r'^\d+[\.\-/]\d+', item_name)):
                    
                    price = match.group('price') if 'price' in match.groupdict() and match.group('price') else '0.00'
                    qty = match.group('qty') if 'qty' in match.groupdict() and match.group('qty') else '1'
                    
                    details['items'].append({
                        'name': item_name,
                        'amount': price.strip(),
                        'quantity': qty.strip()
                    })
                    logger.debug(f"Extracted item: '{item_name}' with price: '{price}'")
                break

    # Tax Extraction
    tax_patterns = [
        r'\b(?:Tax|VAT|GST|Sales\s*Tax|Service\s*Tax)\b[^\d]*?([\$€£₹]?\s*\d+(?:[,\.]\d+)*)',
        r'\b(?:TAX|VAT|GST)\s*[:\s@]*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)',
        r'(?:Tax|VAT|GST)\s*\([\d.]+%\)\s*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)'
    ]
    
    for line in lines:
        for pattern in tax_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                tax_amount = match.group(1).strip()
                try:
                    if parse_decimal(tax_amount) >= Decimal('0'):
                        details['tax'] = tax_amount
                        break
                except:
                    continue
        if details['tax']:
            break

    # Discount Extraction
    discount_patterns = [
        r'\b(?:Discount|Disc\.?|Savings?|Off|Reduction)\b[^\d]*?([\$€£₹]?\s*\d+(?:[,\.]\d+)*)',
        r'\b(?:DISCOUNT|DISC\.?)\s*[:\s]*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)',
        r'(?:Save|Saved)\s*([\$€£₹]?\s*\d+(?:[,\.]\d+)*)'
    ]
    
    for line in lines:
        for pattern in discount_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                discount_amount = match.group(1).strip()
                try:
                    if parse_decimal(discount_amount) >= Decimal('0'):
                        details['discount'] = discount_amount
                        break
                except:
                    continue
        if details['discount']:
            break

    # Location Extraction
    location_patterns = [
        r'\b(?:Store|Location|Branch)[:\s]*(.{5,50})',
        r'\b(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd)[^,\n]{0,30})',
        r'\b([A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})'
    ]
    
    for line in lines:
        for pattern in location_patterns:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                location = match.group(1).strip()
                if len(location) > 3:
                    details['location'] = location
                    break
        if details['location']:
            break

    return details
