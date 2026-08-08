from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# --- Processing Pipeline Stage Schema ---
class StageStatus(BaseModel):
    stage_id: int
    stage_name: str
    status: str  # "pending", "processing", "completed", "failed"
    detail: Optional[str] = None

class DocumentProcessingStatus(BaseModel):
    doc_id: str
    filename: str
    current_stage: str
    stages: List[StageStatus]
    is_complete: bool
    error: Optional[str] = None

# --- Document Metadata Schema ---
class DocumentInfo(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size_bytes: int
    upload_timestamp: str
    chunk_count: int
    concept_count: int
    status: str

class UploadResponse(BaseModel):
    """Response schema for POST /api/documents/upload."""
    message: str
    documents: List[DocumentInfo]

# --- RAG Query & Citation Schemas ---
class QueryRequest(BaseModel):
    question: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)

class Citation(BaseModel):
    document_id: str
    document_name: str
    page_or_row: str
    snippet: str

class QueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[Citation]
    used_mock: bool = False

# --- Knowledge Graph Schemas ---
class GraphNode(BaseModel):
    id: str
    label: str
    category: str  # Concept, Technology, Organization, Process, Document
    doc_sources: List[str] = Field(default_factory=list)
    description: Optional[str] = ""

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str

class GraphDataResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]

class NodeDetailResponse(BaseModel):
    node: GraphNode
    connected_nodes: List[GraphNode]
    related_documents: List[DocumentInfo]

# --- Metrics Dashboard Schema ---
class MetricsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_concepts: int
    total_relationships: int
    storage_size_kb: float
