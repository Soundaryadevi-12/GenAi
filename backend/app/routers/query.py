from fastapi import APIRouter, HTTPException
from app.models.schemas import QueryRequest, QueryResponse
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/query", tags=["query"])

@router.post("", response_model=QueryResponse)
async def query_rag_chat(request: QueryRequest):
    """
    Performs RAG search over ChromaDB vector embeddings and returns answer with exact citations.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        response = rag_service.query_rag(request.question.strip())
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")
