import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io

def extract_text_from_image(image_bytes: bytes) -> str:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        
        # Pre-processing for better OCR accuracy (Receipts are often low contrast)
        # 1. Convert to grayscale
        img = img.convert('L')
        
        # 2. Increase contrast significantly
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.5)
        
        # 3. Apply sharpening
        img = img.filter(ImageFilter.SHARPEN)
        
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"OCR Error: {e}")
        return ""
