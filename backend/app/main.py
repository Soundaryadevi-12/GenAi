import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import documents, query, graph

app = FastAPI(
    title="DocInsight AI Backend API",
    description="Intelligent Multi-Document Knowledge Graph & RAG Explorer API",
    version="1.0.0"
)

# Configure CORS Middleware
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(documents.router)
app.include_router(query.router)
app.include_router(graph.router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "DocInsight AI Backend API",
        "version": "1.0.0",
        "vector_db": "ChromaDB",
        "docs_url": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "chroma_dir": str(settings.CHROMA_DB_DIR),
        "openai_configured": bool(settings.OPENAI_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.PORT, reload=True)
