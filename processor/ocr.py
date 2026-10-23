"""OCR and text extraction for Pramaan AI processor."""
import os
import io
import logging
from pathlib import Path

logger = logging.getLogger("processor.ocr")

# Configure Tesseract path if set
TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if TESSERACT_CMD:
    import pytesseract
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

OCR_CONFIDENCE_THRESHOLD = int(os.getenv("OCR_CONFIDENCE_THRESHOLD", 60))


def extract_pdf(file_path: str) -> tuple[str, str]:
    """
    Extract text from a PDF.
    Returns (text, method) where method is 'pdf_text' or 'ocr'.
    """
    from pypdf import PdfReader

    try:
        reader = PdfReader(file_path)
        pages_text = []
        for page in reader.pages:
            pages_text.append(page.extract_text() or "")

        combined = "\n".join(pages_text).strip()
        if combined and len(combined) > 50:
            logger.info(f"PDF text extracted directly: {len(combined)} chars")
            return combined, "pdf_text"

        # Fallback to OCR for scanned PDFs
        logger.info("PDF appears scanned — falling back to OCR")
        return _ocr_pdf_pages(file_path, reader)
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise


def _ocr_pdf_pages(file_path: str, reader) -> tuple[str, str]:
    """Convert PDF pages to images and OCR them."""
    try:
        import fitz  # PyMuPDF — optional
        doc = fitz.open(file_path)
        texts = []
        for page_num, page in enumerate(doc):
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            text = _ocr_bytes(img_bytes)
            texts.append(text)
        return "\n".join(texts), "ocr"
    except ImportError:
        # PyMuPDF not installed — use Pillow+pytesseract on first page
        logger.warning("PyMuPDF not available — OCR quality may be limited for PDFs")
        return "", "ocr_unavailable"


def extract_image(file_path: str) -> tuple[str, str]:
    """OCR an image file."""
    try:
        import pytesseract
        from PIL import Image
        import cv2
        import numpy as np

        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f"Could not read image: {file_path}")

        # Pre-processing: grayscale + denoise
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gray = cv2.fastNlMeansDenoising(gray, h=10)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        pil_img = Image.fromarray(thresh)
        text = pytesseract.image_to_string(pil_img, lang="eng")
        logger.info(f"Image OCR completed: {len(text)} chars")
        return text, "ocr"
    except Exception as e:
        logger.error(f"Image OCR failed: {e}")
        raise


def _ocr_bytes(img_bytes: bytes) -> str:
    """OCR raw PNG/JPEG bytes."""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(io.BytesIO(img_bytes))
        return pytesseract.image_to_string(img, lang="eng")
    except Exception as e:
        logger.warning(f"OCR on bytes failed: {e}")
        return ""


def decode_qr(file_path: str) -> str | None:
    """
    Decode QR code from an image or first page of a PDF.
    Returns the decoded data string, or None if no QR found.
    """
    try:
        from pyzbar.pyzbar import decode
        from PIL import Image
        import cv2

        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            # Try rendering first page
            try:
                import fitz
                doc = fitz.open(file_path)
                pix = doc[0].get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                import numpy as np
                nparr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            except ImportError:
                logger.warning("PyMuPDF not available — cannot decode QR from PDF")
                return None
        else:
            img = cv2.imread(file_path)

        if img is None:
            return None

        decoded_objects = decode(img)
        for obj in decoded_objects:
            data = obj.data.decode("utf-8", errors="replace")
            logger.info(f"QR decoded: {data[:80]}")
            return data
        return None
    except Exception as e:
        logger.warning(f"QR decode error: {e}")
        return None
