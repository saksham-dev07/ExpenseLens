import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# JSON schema instruction for the LLMs
PROMPT_INSTRUCTION = """
You are an expert AI Receipt Parser. Your job is to extract highly accurate, structured data from the following raw OCR text of a receipt.
Correct any obvious spelling mistakes caused by the OCR.
Analyze the context to determine the best expense category (e.g., 'Food & Dining', 'Travel', 'Office Supplies', etc.).

You must output valid JSON ONLY, using exactly this schema:
{
  "merchant": "String (Merchant name, inferred if possible)",
  "date_time": "String (YYYY-MM-DD HH:MM:SS if possible)",
  "total_amount": "Float",
  "tax": "Float (total tax amount if aggregated, otherwise 0)",
  "taxes": [
    {
      "name": "String (e.g. CGST, SGST, IGST, State Tax, City Tax)",
      "amount": "Float"
    }
  ],
  "discount": "Float",
  "bill_no": "String",
  "category": "String (e.g., Food & Dining, Groceries, Travel, Shopping)",
  "location": "String (City or Address)",
  "currency": "String (e.g., USD, EUR, INR)",
  "usd_total": "Float (Estimate the total_amount in USD based on the receipt's currency and date. If already USD, just copy total_amount)",
  "subtotal": "Float",
  "tip": "Float",
  "payment_method": "String (e.g., Cash, Credit Card, UPI)",
  "card_last_four": "String",
  "phone_number": "String",
  "items": [
    {
      "name": "String",
      "amount": "Float"
    }
  ]
}
Return ONLY the raw JSON object, without any markdown formatting like ```json or ```.
"""

def extract_with_llm(ocr_text: str) -> Dict[str, Any]:
    """
    Pass raw OCR text to an LLM (Gemini or OpenAI) to extract perfectly structured JSON.
    Automatically detects the available API key.
    """
    if not ocr_text or not ocr_text.strip():
        return {}

    gemini_key = os.environ.get("GEMINI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        logger.warning("No LLM API keys found (GEMINI_API_KEY or OPENAI_API_KEY). Skipping Intelligent parsing.")
        return {}

    try:
        if gemini_key:
            return _call_gemini(ocr_text, gemini_key)
        else:
            return _call_openai(ocr_text, openai_key)
    except Exception as e:
        logger.exception(f"LLM Parsing failed: {e}")
        return {}

def _call_gemini(ocr_text: str, api_key: str) -> Dict[str, Any]:
    try:
        from google import genai
    except ImportError:
        logger.error("google-genai is not installed.")
        return {}

    logger.info("Using Gemini for intelligent receipt parsing.")
    client = genai.Client(api_key=api_key)
    
    prompt = f"{PROMPT_INSTRUCTION}\n\nRAW OCR TEXT:\n{ocr_text}"
    
    models_to_try = [
        'gemini-3.1-flash-lite',
        'gemini-3.5-flash',
        'gemini-3.0-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-8b',
        'gemini-1.0-pro',
        'gemini-pro'
    ]
    
    last_error = None
    for model_name in models_to_try:
        try:
            logger.debug(f"Trying Gemini model: {model_name}")
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            text = response.text.strip()
            return _parse_json_from_response(text)
        except Exception as e:
            last_error = e
            logger.warning(f"Failed with {model_name}: {e}")
            continue
            
    logger.error(f"All Gemini models failed. Last error: {last_error}")
    raise last_error

def _call_openai(ocr_text: str, api_key: str) -> Dict[str, Any]:
    try:
        from openai import OpenAI
    except ImportError:
        logger.error("openai is not installed.")
        return {}

    logger.info("Using OpenAI GPT-4o-mini for intelligent receipt parsing.")
    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": PROMPT_INSTRUCTION},
            {"role": "user", "content": f"RAW OCR TEXT:\n{ocr_text}"}
        ],
        response_format={ "type": "json_object" }
    )

    text = response.choices[0].message.content.strip()
    return _parse_json_from_response(text)

def _parse_json_from_response(text: str) -> Dict[str, Any]:
    # Remove markdown code blocks if the LLM hallucinated them
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
        
    text = text.strip()
    
    try:
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from LLM response: {e}\nRaw output: {text}")
        return {}
