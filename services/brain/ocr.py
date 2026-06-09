import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io

def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    try:
        content_type_lower = content_type.lower() if content_type else ""
        
        # 1. Plain Text
        if "text/" in content_type_lower or filename.endswith('.txt') or filename.endswith('.csv'):
            return file_bytes.decode('utf-8').strip()
            
        # 2. PDF Documents
        if "pdf" in content_type_lower or filename.endswith('.pdf'):
            try:
                import fitz  # PyMuPDF
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text() + "\n"
                return text.strip()
            except ImportError:
                print("PyMuPDF (fitz) is not installed. PDF extraction failed.")
                return ""
                
        # 3. Images (Fallback to OCR)
        img = Image.open(io.BytesIO(file_bytes))
        
        # Pre-processing for better OCR accuracy
        img = img.convert('L')
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.5)
        img = img.filter(ImageFilter.SHARPEN)
        
        text = pytesseract.image_to_string(img)
        return text.strip()
        
    except Exception as e:
        print(f"Extraction Error for {filename}: {e}")
        return ""
