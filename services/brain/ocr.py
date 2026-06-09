import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io

def extract_text_from_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    try:
        content_type_lower = content_type.lower() if content_type else ""
        filename_lower = filename.lower() if filename else ""
        
        # 1. Plain Text
        if "text/" in content_type_lower or filename_lower.endswith('.txt') or filename_lower.endswith('.csv'):
            return file_bytes.decode('utf-8').strip()
            
        # 2. PDF Documents
        if "pdf" in content_type_lower or filename_lower.endswith('.pdf'):
            try:
                import pypdf
                pdf = pypdf.PdfReader(io.BytesIO(file_bytes))
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
                return text.strip()
            except ImportError:
                print("pypdf is not installed. PDF extraction failed.")
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
