import re
import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional, Dict, List, Any

def parse_date(date_str: Optional[str]) -> datetime:
    """
    Attempt to parse a date string using multiple formats.
    Returns a datetime object if parsing is successful, otherwise the current time.
    """
    if not date_str or not isinstance(date_str, str):
        return datetime.utcnow()
    
    # Clean the date string
    date_str = re.sub(r'[^\w\s\-/.:]', '', date_str.strip())
    
    # Enhanced date formats
    date_formats = [
        '%Y-%m-%d', '%d-%m-%Y', '%m-%d-%Y',
        '%Y/%m/%d', '%d/%m/%Y', '%m/%d/%Y',
        '%d.%m.%Y', '%m.%d.%Y', '%Y.%m.%d',
        '%d %b %Y', '%b %d, %Y', '%B %d, %Y',
        '%d-%b-%Y', '%d %B %Y', '%Y%m%d',
        '%d/%m/%y', '%m/%d/%y', '%d-%m-%y',
        '%d-%b-%y', '%b %d %Y', '%d %b %y',
        '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d %H:%M:%S',
    ]
    
    for fmt in date_formats:
        try:
            parsed_date = datetime.strptime(date_str, fmt)
            # Handle 2-digit years
            if parsed_date.year < 1950:
                parsed_date = parsed_date.replace(year=parsed_date.year + 2000)
            return parsed_date
        except ValueError:
            continue
    
    logging.warning(f"Could not parse date: {date_str}")
    return datetime.utcnow()


def parse_decimal(value: Optional[str]) -> Decimal:
    """
    Convert a monetary string to a Decimal.
    Cleans common currency symbols and commas.
    Returns Decimal('0.00') if conversion fails.
    """
    if value is None:
        return Decimal('0.00')
        
    if isinstance(value, (int, float)):
        return Decimal(str(value)).quantize(Decimal('0.01'))
        
    if not isinstance(value, str):
        return Decimal('0.00')
    
    # Remove currency symbols and extra whitespace
    cleaned = re.sub(r'[^\d.,-]', '', value.strip())
    
    if not cleaned:
        return Decimal('0.00')
    
    # Handle different decimal separators and thousands separators
    if ',' in cleaned and '.' in cleaned:
        # Determine which is the decimal separator
        comma_pos = cleaned.rfind(',')
        dot_pos = cleaned.rfind('.')
        if comma_pos > dot_pos:
            # Comma is decimal separator, dot is thousands
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            # Dot is decimal separator, comma is thousands
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned and '.' not in cleaned:
        # Only comma - could be thousands or decimal separator
        if len(cleaned.split(',')[-1]) == 3 and ',' not in cleaned[-4:]:
            # Likely thousands separator
            cleaned = cleaned.replace(',', '')
        else:
            # Likely decimal separator
            cleaned = cleaned.replace(',', '.')
    
    try:
        decimal_value = Decimal(cleaned)
        return decimal_value.quantize(Decimal('0.01'))  # Round to 2 decimal places
    except (InvalidOperation, ValueError) as e:
        logging.warning(f"Could not parse decimal value '{value}': {e}")
        return Decimal('0.00')


def categorize_expense(merchant: Optional[str], items: List[Dict[str, str]]) -> str:
    """
    Categorize the expense based on merchant keywords and items.
    Returns the category as a string.
    """
    categories = {
        'grocery': ['grocery', 'supermarket', 'market', 'walmart', 'target', 'safeway', 'kroger', 'food', 'fresh'],
        'dining': ['restaurant', 'cafe', 'diner', 'pizza', 'burger', 'coffee', 'bar', 'pub', 'kitchen', 'grill'],
        'travel': ['uber', 'lyft', 'taxi', 'flight', 'airline', 'hotel', 'motel', 'gas', 'fuel', 'station', 'shell'],
        'entertainment': ['movie', 'cinema', 'theater', 'theatre', 'netflix', 'spotify', 'game', 'park', 'museum'],
        'shopping': ['store', 'mall', 'shopping', 'amazon', 'ebay', 'best buy', 'costco', 'depot', 'outlet'],
        'health': ['pharmacy', 'hospital', 'clinic', 'doctor', 'medical', 'health', 'drug', 'cvs', 'walgreens'],
        'utilities': ['electric', 'water', 'gas', 'internet', 'phone', 'cable', 'utility', 'power', 'telecom']
    }
    
    # Check merchant name
    if merchant:
        merchant_lower = merchant.lower()
        for category, keywords in categories.items():
            if any(keyword in merchant_lower for keyword in keywords):
                return category
    
    # Check item names if merchant category not found
    if items:
        item_text = ' '.join(item.get('name', '').lower() for item in items)
        for category, keywords in categories.items():
            if any(keyword in item_text for keyword in keywords):
                return category
    
    return 'others'
