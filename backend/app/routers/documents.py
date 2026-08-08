import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Annotated
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.config import settings
from app.models.schemas import DocumentInfo, DocumentProcessingStatus, StageStatus, UploadResponse
from app.services.document_loader import DocumentLoaderService
from app.services.rag_service import rag_service
from app.services.graph_service import graph_service

router = APIRouter(prefix="/api/documents", tags=["documents"])

# In-memory status tracker for real-time 7-stage progress indicator
processing_statuses: Dict[str, DocumentProcessingStatus] = {}

STAGE_NAMES = [
    "Upload Documents",
    "Text Extraction",
    "Chunking",
    "Embedding Generation",
    "ChromaDB Storage",
    "Concept Extraction",
    "Knowledge Graph Generation",
    "Ready for Questions"
]

def initialize_stages() -> List[StageStatus]:
    return [
        StageStatus(stage_id=i+1, stage_name=name, status="pending")
        for i, name in enumerate(STAGE_NAMES)
    ]

def update_stage(doc_id: str, stage_index: int, status: str, detail: str = ""):
    if doc_id in processing_statuses:
        st = processing_statuses[doc_id]
        st.stages[stage_index].status = status
        st.stages[stage_index].detail = detail
        st.current_stage = STAGE_NAMES[stage_index]
        if status == "completed" and stage_index == len(STAGE_NAMES) - 1:
            st.is_complete = True

def get_docs_metadata() -> List[DocumentInfo]:
    if not settings.DOCS_METADATA_PATH.exists():
        return []
    try:
        with open(settings.DOCS_METADATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [DocumentInfo(**item) for item in data]
    except Exception:
        return []

def save_docs_metadata(docs: List[DocumentInfo]):
    try:
        with open(settings.DOCS_METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump([d.model_dump() for d in docs], f, indent=2)
    except Exception as e:
        print(f"Error saving docs metadata: {e}")

@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload and process documents",
    description="Upload one or more PDF, DOCX, CSV, or TXT files. Each file is processed through the "
                "7-stage pipeline: Upload → Text Extraction → Chunking → Embeddings → ChromaDB → Concept Extraction → Graph.",
)
async def upload_documents(files: Annotated[List[UploadFile], File(...)]):
    """
    Processes uploaded PDF, DOCX, CSV, and TXT files through the 7-stage processing pipeline:
    Upload -> Extraction -> Chunking -> Embeddings -> ChromaDB -> Concepts -> Knowledge Graph.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    processed_docs: List[DocumentInfo] = []
    existing_meta = get_docs_metadata()

    for file in files:
        filename = file.filename
        ext = Path(filename).suffix.lower()
        if ext not in [".pdf", ".docx", ".doc", ".csv", ".txt", ".md"]:
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' format not supported. Upload PDF, DOCX, CSV, or TXT."
            )

        doc_id = str(uuid.uuid4())[:8]
        save_path = settings.UPLOAD_DIR / f"{doc_id}_{filename}"
        
        # Initialize 7-Stage Status Tracking
        status_obj = DocumentProcessingStatus(
            doc_id=doc_id,
            filename=filename,
            current_stage=STAGE_NAMES[0],
            stages=initialize_stages(),
            is_complete=False
        )
        processing_statuses[doc_id] = status_obj

        try:
            # Stage 1: Upload Documents
            update_stage(doc_id, 0, "processing", "Saving file to disk")
            content = await file.read()
            with open(save_path, "wb") as f:
                f.write(content)
            update_stage(doc_id, 0, "completed", "File uploaded successfully")

            # Stage 2: Text Extraction
            update_stage(doc_id, 1, "processing", "Extracting text content")
            raw_docs = DocumentLoaderService.load_document(save_path, filename, doc_id)
            total_text = "\n\n".join([d.page_content for d in raw_docs])
            update_stage(doc_id, 1, "completed", f"Extracted {len(raw_docs)} sections")

            # Stage 3: Chunking
            update_stage(doc_id, 2, "processing", "Splitting into overlapping text chunks")
            chunks = rag_service.chunk_documents(raw_docs)
            update_stage(doc_id, 2, "completed", f"Created {len(chunks)} text chunks")

            # Stage 4: Embedding Generation & Stage 5: ChromaDB Storage
            update_stage(doc_id, 3, "processing", "Generating vector embeddings")
            update_stage(doc_id, 4, "processing", "Storing vectors in ChromaDB collection")
            rag_service.add_chunks_to_chroma(chunks, doc_id)
            update_stage(doc_id, 3, "completed", "Embeddings generated")
            update_stage(doc_id, 4, "completed", "Chunks persistent in ChromaDB")

            # Stage 6: Concept Extraction & Stage 7: Knowledge Graph Generation
            update_stage(doc_id, 5, "processing", "Parsing entities & relationships with LLM")
            update_stage(doc_id, 6, "processing", "Synthesizing React Flow graph nodes & edges")
            graph_service.extract_and_update_graph(total_text, filename, doc_id)
            update_stage(doc_id, 5, "completed", "Extracted concepts")
            update_stage(doc_id, 6, "completed", "Knowledge graph updated")

            # Stage 8: Ready for Questions
            update_stage(doc_id, 7, "completed", "Document fully indexed and ready")

            doc_info = DocumentInfo(
                id=doc_id,
                filename=filename,
                file_type=ext.replace(".", "").upper(),
                file_size_bytes=len(content),
                upload_timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                chunk_count=len(chunks),
                concept_count=len(graph_service.nodes),
                status="Ready"
            )
            processed_docs.append(doc_info)
            existing_meta.append(doc_info)

        except Exception as e:
            update_stage(doc_id, status_obj.stages.index(next(s for s in status_obj.stages if s.status == "processing")), "failed", str(e))
            status_obj.error = str(e)
            raise HTTPException(status_code=500, detail=f"Failed processing '{filename}': {str(e)}")

    save_docs_metadata(existing_meta)
    return {"message": "Files processed successfully", "documents": processed_docs}

@router.get("", response_model=List[DocumentInfo])
async def list_documents():
    """Returns list of all ingested documents."""
    return get_docs_metadata()

@router.get("/{doc_id}/status", response_model=DocumentProcessingStatus)
async def get_processing_status(doc_id: str):
    """Polls real-time progress through the 7 processing pipeline stages."""
    if doc_id in processing_statuses:
        return processing_statuses[doc_id]
    raise HTTPException(status_code=404, detail="Processing status not found.")

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Deletes uploaded document file, associated ChromaDB chunks, and graph concepts."""
    docs = get_docs_metadata()
    target_doc = next((d for d in docs if d.id == doc_id), None)
    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove file from disk
    file_path = settings.UPLOAD_DIR / f"{doc_id}_{target_doc.filename}"
    if file_path.exists():
        file_path.unlink()

    # Remove chunks from ChromaDB
    rag_service.delete_document_chunks(doc_id)

    # Remove concepts from graph
    graph_service.remove_document_from_graph(doc_id)

    # Save updated metadata list
    updated_docs = [d for d in docs if d.id != doc_id]
    save_docs_metadata(updated_docs)

    return {"message": f"Document '{target_doc.filename}' deleted successfully."}
