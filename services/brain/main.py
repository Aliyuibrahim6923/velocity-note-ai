from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import ocr
import graph

app = FastAPI(title="Velocity Note AI Brain Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # 1. OCR Extraction
        text = ocr.extract_text_from_image(contents)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from image")
            
        # 2. Graphing (Phase 2 MVP: just save as a Document node)
        node_id = graph.create_document_node(text=text, category="SCANNED_DOC")
        
        return {
            "status": "success",
            "extracted_text": text,
            "neo4j_node_id": node_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
