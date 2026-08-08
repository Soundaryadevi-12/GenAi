import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from backend directory if present
backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=backend_dir / ".env")

class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL_NAME: str = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    
    BASE_DIR: Path = backend_dir
    DATA_DIR: Path = backend_dir / "data"
    UPLOAD_DIR: Path = backend_dir / "data" / "uploads"
    CHROMA_DB_DIR: Path = backend_dir / "data" / "chroma_db"
    GRAPH_DATA_PATH: Path = backend_dir / "data" / "graph_store.json"
    DOCS_METADATA_PATH: Path = backend_dir / "data" / "docs_metadata.json"
    
    PORT: int = int(os.getenv("PORT", 8000))
    # Minimum cosine similarity (0.0–1.0) a chunk must score to be included in RAG citations.
    # Chunks below this threshold are discarded as irrelevant. Raise to tighten, lower to relax.
    RAG_SIMILARITY_THRESHOLD: float = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.45"))
    
    def setup_directories(self):
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        self.CHROMA_DB_DIR.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.setup_directories()
