import os
import json
import logging
from typing import Dict, Any
from PIL import Image

logger = logging.getLogger(__name__)

# The path where the fine-tuned model will be saved after running training/train.py
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "donut-receipt-parser")

_processor = None
_model = None

def load_model():
    """Lazily load the model and processor to save memory until first inference."""
    global _processor, _model
    
    if _processor is not None and _model is not None:
        return True
        
    if not os.path.exists(MODEL_DIR):
        logger.warning(f"Custom AI model not found at {MODEL_DIR}. Please run the training pipeline first.")
        return False
        
    try:
        from transformers import DonutProcessor, VisionEncoderDecoderModel
        import torch
        
        logger.info("Loading custom Donut receipt parser...")
        _processor = DonutProcessor.from_pretrained(MODEL_DIR)
        _model = VisionEncoderDecoderModel.from_pretrained(MODEL_DIR)
        
        if torch.cuda.is_available():
            _model.to("cuda")
            _model.half() # Use FP16 for faster inference if on GPU
            
        _model.eval()
        return True
    except ImportError:
        logger.error("Missing ML dependencies. Please install requirements from training/requirements-ml.txt")
        return False
    except Exception as e:
        logger.exception(f"Failed to load custom AI model: {e}")
        return False

def extract_with_custom_ai(file_path: str) -> Dict[str, Any]:
    """
    Runs the custom-trained Donut model on a receipt image.
    Returns a dictionary mapping to the application's internal details format.
    """
    if not load_model():
        return {}
        
    try:
        import torch
        
        image = Image.open(file_path).convert("RGB")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        pixel_values = _processor(image, return_tensors="pt").pixel_values.to(device)
        if device == "cuda":
            pixel_values = pixel_values.half()
            
        task_prompt = "<s_receipt>"
        decoder_input_ids = _processor.tokenizer(task_prompt, add_special_tokens=False, return_tensors="pt").input_ids.to(device)
        
        outputs = _model.generate(
            pixel_values,
            decoder_input_ids=decoder_input_ids,
            max_length=_model.config.decoder.max_position_embeddings,
            pad_token_id=_processor.tokenizer.pad_token_id,
            eos_token_id=_processor.tokenizer.eos_token_id,
            use_cache=True,
            bad_words_ids=[[_processor.tokenizer.unk_token_id]],
            return_dict_in_generate=True,
        )
        
        sequence = _processor.batch_decode(outputs.sequences)[0]
        sequence = sequence.replace(_processor.tokenizer.eos_token, "").replace(_processor.tokenizer.pad_token, "")
        
        # Extract the JSON string from the generated sequence
        import re
        json_match = re.search(r"<s_receipt>(.*)", sequence, re.DOTALL)
        if not json_match:
            logger.error("Failed to parse JSON out of model generated sequence.")
            return {}
            
        raw_json_str = json_match.group(1).strip()
        parsed_data = _processor.token2json(raw_json_str)
        
        # Donut output is usually wrapped in the task prompt or 'gt_parse'
        if 'gt_parse' in parsed_data:
            parsed_data = parsed_data['gt_parse']
            
        logger.info(f"Custom AI raw extraction: {parsed_data}")
        
        # Map to app format
        details: Dict[str, Any] = {
            'bill_no': parsed_data.get('bill_no') or parsed_data.get('invoice_no'),
            'merchant': parsed_data.get('merchant') or parsed_data.get('establishment'),
            'date_time': parsed_data.get('date') or parsed_data.get('date_time'),
            'total_amount': str(parsed_data.get('total')) if parsed_data.get('total') else None,
            'subtotal': str(parsed_data.get('subtotal')) if parsed_data.get('subtotal') else None,
            'tax': str(parsed_data.get('tax')) if parsed_data.get('tax') else None,
            'tip': str(parsed_data.get('tip')) if parsed_data.get('tip') else None,
            'discount': str(parsed_data.get('discount')) if parsed_data.get('discount') else None,
            'location': parsed_data.get('address') or parsed_data.get('location'),
            'currency': parsed_data.get('currency'),
            'payment_method': parsed_data.get('payment_method'),
            'card_last_four': parsed_data.get('card_last_four'),
            'phone_number': parsed_data.get('phone_number'),
            'items': [],
            '_raw_json': json.dumps(parsed_data, indent=2)
        }
        
        # Attempt to map line items if present
        items = parsed_data.get('line_items') or parsed_data.get('items') or []
        for item in items:
            name = item.get('name') or item.get('desc')
            if name:
                details['items'].append({
                    'name': str(name)[:100],
                    'amount': str(item.get('price') or item.get('total') or 0.00),
                    'quantity': str(item.get('qty') or item.get('quantity') or 1)
                })
                
        return details

    except Exception as e:
        logger.exception(f"Error during Custom AI inference: {e}")
        return {}
