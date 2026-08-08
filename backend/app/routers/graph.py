from fastapi import APIRouter, HTTPException
from app.models.schemas import GraphDataResponse, NodeDetailResponse, MetricsResponse
from app.services.graph_service import graph_service
from app.services.rag_service import rag_service
from app.routers.documents import get_docs_metadata

router = APIRouter(prefix="/api/graph", tags=["graph"])

@router.get("/data", response_model=GraphDataResponse)
async def get_graph_data():
    """Returns React Flow formatted nodes and edges for Knowledge Graph canvas.
    Always returns valid JSON with nodes/edges arrays — never crashes with 500.
    """
    try:
        return graph_service.get_react_flow_data()
    except Exception as e:
        print(f"[GraphRouter] Error building React Flow data: {e}")
        return GraphDataResponse(nodes=[], edges=[])

@router.get("/nodes/{node_id}", response_model=NodeDetailResponse)
async def get_node_details(node_id: str):
    """Returns inspector details for a selected node: concept info, connected nodes, and source documents."""
    all_docs = get_docs_metadata()
    detail = graph_service.get_node_detail(node_id, all_docs)
    if not detail:
        raise HTTPException(status_code=404, detail="Concept node not found.")
    return detail

@router.get("/metrics", response_model=MetricsResponse)
async def get_dashboard_metrics():
    """Provides summary overview statistics for the Dashboard."""
    docs = get_docs_metadata()
    total_docs = len(docs)
    total_chunks = rag_service.get_total_chunk_count()
    node_count, edge_count = graph_service.get_counts()
    
    # Calculate storage size in KB
    total_bytes = sum(d.file_size_bytes for d in docs)
    storage_kb = round(total_bytes / 1024.0, 2)

    return MetricsResponse(
        total_documents=total_docs,
        total_chunks=total_chunks,
        total_concepts=node_count,
        total_relationships=edge_count,
        storage_size_kb=storage_kb
    )
