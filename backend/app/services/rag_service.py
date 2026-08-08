import json
import os
import math
from pathlib import Path
from typing import List, Dict, Any, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from app.config import settings
from app.models.schemas import Citation, QueryResponse

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    HAS_CHROMADB = False

try:
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

class RAGService:
    def __init__(self):
        self.chroma_dir = settings.CHROMA_DB_DIR
        self.chroma_dir.mkdir(parents=True, exist_ok=True)
        self.text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        self.store_file = settings.DATA_DIR / "vector_store_fallback.json"
        
        # Initialize persistent Chroma client if available
        if HAS_CHROMADB:
            try:
                self.chroma_client = chromadb.PersistentClient(path=str(self.chroma_dir))
                self.collection = self.chroma_client.get_or_create_collection(
                    name="docinsight_chunks",
                    metadata={"hnsw:space": "cosine"}
                )
            except Exception as e:
                print(f"[RAGService] Warning initializing ChromaDB: {e}")
                self.chroma_client = None
                self.collection = None
        else:
            self.chroma_client = None
            self.collection = None

    def chunk_documents(self, documents: List[Document]) -> List[Document]:
        """Splits loaded document pages into overlapping text chunks."""
        chunks = self.text_splitter.split_documents(documents)
        for idx, chunk in enumerate(chunks):
            chunk.metadata["chunk_id"] = f"{chunk.metadata.get('doc_id', 'doc')}_chunk_{idx}"
        return chunks

    def add_chunks_to_chroma(self, chunks: List[Document], doc_id: str):
        """Indexes chunks into ChromaDB vector store (or fallback persistent JSON)."""
        use_openai = bool(settings.OPENAI_API_KEY and HAS_OPENAI)
        
        embeddings_list = []
        if use_openai:
            try:
                embedder = OpenAIEmbeddings(
                    openai_api_key=settings.OPENAI_API_KEY,
                    model=settings.EMBEDDING_MODEL
                )
                texts = [c.page_content for c in chunks]
                embeddings_list = embedder.embed_documents(texts)
            except Exception as e:
                print(f"[RAGService] OpenAI embedding failed ({e}). Falling back to internal vectors.")
                use_openai = False

        if not use_openai:
            # Fallback simple vector generator (frequency/hash vector)
            embeddings_list = [self._simple_embedding(c.page_content) for c in chunks]

        # Try inserting into ChromaDB collection
        if self.collection is not None:
            ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
            documents_text = [c.page_content for c in chunks]
            metadatas = [c.metadata for c in chunks]
            
            try:
                self.collection.add(
                    ids=ids,
                    embeddings=embeddings_list,
                    documents=documents_text,
                    metadatas=metadatas
                )
                print(f"[RAGService] Stored {len(chunks)} chunks in ChromaDB collection.")
                return
            except Exception as e:
                print(f"[RAGService] ChromaDB add error: {e}. Storing in JSON fallback store.")

        # Fallback persistence store
        fallback_data = self._load_fallback_store()
        for idx, chunk in enumerate(chunks):
            fallback_data.append({
                "id": f"{doc_id}_{idx}",
                "doc_id": doc_id,
                "text": chunk.page_content,
                "embedding": embeddings_list[idx],
                "metadata": chunk.metadata
            })
        self._save_fallback_store(fallback_data)

    def delete_document_chunks(self, doc_id: str):
        """Removes document chunks from ChromaDB and fallback store."""
        if self.collection is not None:
            try:
                self.collection.delete(where={"doc_id": doc_id})
            except Exception as e:
                print(f"[RAGService] Delete from Chroma error: {e}")
        
        fallback_data = self._load_fallback_store()
        filtered = [item for item in fallback_data if item.get("doc_id") != doc_id]
        self._save_fallback_store(filtered)

    def get_total_chunk_count(self) -> int:
        """Returns total chunks stored across all documents."""
        if self.collection is not None:
            try:
                return self.collection.count()
            except Exception:
                pass
        return len(self._load_fallback_store())

    def query_rag(self, question: str) -> QueryResponse:
        """Searches ChromaDB vector store for top context chunks and answers via OpenAI or RAG Engine."""
        use_openai = bool(settings.OPENAI_API_KEY and HAS_OPENAI)
        top_chunks = self._search_relevant_chunks(question, top_k=4, use_openai=use_openai)

        if not top_chunks:
            # Distinguish between "no docs uploaded" and "no relevant docs"
            no_docs = (self.collection is None or self.collection.count() == 0) and \
                      not self._load_fallback_store()
            answer = (
                "No documents have been uploaded yet. Please upload documents to ask questions."
                if no_docs else
                "No relevant information found in the uploaded documents for your question. "
                "Try rephrasing or upload documents that cover this topic."
            )
            return QueryResponse(
                question=question,
                answer=answer,
                citations=[],
                used_mock=True
            )

        citations = []
        context_str = ""
        for item in top_chunks:
            meta = item.get("metadata", {})
            citation = Citation(
                document_id=meta.get("doc_id", "unknown"),
                document_name=meta.get("filename", "Document"),
                page_or_row=meta.get("page_or_row", "Section"),
                snippet=item["text"][:250] + "..." if len(item["text"]) > 250 else item["text"]
            )
            citations.append(citation)
            context_str += f"\n--- Source: {citation.document_name} ({citation.page_or_row}) ---\n{item['text']}\n"

        if use_openai:
            try:
                llm = ChatOpenAI(
                    openai_api_key=settings.OPENAI_API_KEY,
                    model_name=settings.OPENAI_MODEL_NAME,
                    temperature=0.2
                )
                prompt = (
                    "You are DocInsight AI, an expert research assistant. Answer the user's question accurately "
                    "using ONLY the retrieved document contexts below. Always cite relevant facts.\n\n"
                    f"Context:\n{context_str}\n\nUser Question: {question}\nAnswer:"
                )
                response = llm.invoke(prompt)
                answer_text = response.content
                return QueryResponse(
                    question=question,
                    answer=answer_text,
                    citations=citations,
                    used_mock=False
                )
            except Exception as e:
                print(f"[RAGService] OpenAI LLM generation failed ({e}). Using grounded extractive RAG fallback.")

        # Extractive Grounded Fallback Answer
        top_text = top_chunks[0]["text"]
        filename = top_chunks[0]["metadata"].get("filename", "uploaded documents")
        answer_text = (
            f"Based on your documents (specifically '{filename}'):\n\n"
            f"{top_text[:400]}...\n\n"
            f"(Synthesized from {len(top_chunks)} retrieved passage segments)"
        )

        return QueryResponse(
            question=question,
            answer=answer_text,
            citations=citations,
            used_mock=True
        )

    def _search_relevant_chunks(self, question: str, top_k: int = 4, use_openai: bool = False) -> List[Dict[str, Any]]:
        """Returns top-k chunks that meet the configured similarity threshold."""
        query_vector = None
        if use_openai:
            try:
                embedder = OpenAIEmbeddings(
                    openai_api_key=settings.OPENAI_API_KEY,
                    model=settings.EMBEDDING_MODEL
                )
                query_vector = embedder.embed_query(question)
            except Exception:
                use_openai = False

        if not use_openai:
            query_vector = self._simple_embedding(question)

        threshold = settings.RAG_SIMILARITY_THRESHOLD
        # For ChromaDB cosine space: distance = 1 - similarity, so max_distance = 1 - threshold
        max_distance = 1.0 - threshold

        # Search ChromaDB collection
        if self.collection is not None:
            try:
                results = self.collection.query(
                    query_embeddings=[query_vector],
                    n_results=min(top_k, max(1, self.collection.count())),
                    include=["documents", "metadatas", "distances"]
                )
                retrieved = []
                if results and results.get("documents") and len(results["documents"][0]) > 0:
                    docs = results["documents"][0]
                    metas = results["metadatas"][0]
                    distances = results.get("distances", [[]])[0]
                    for i, (doc, meta, dist) in enumerate(zip(docs, metas, distances)):
                        # Filter: only include chunks at or below the max distance (at or above threshold similarity)
                        if dist <= max_distance:
                            retrieved.append({"text": doc, "metadata": meta, "similarity": round(1.0 - dist, 4)})
                    if retrieved:
                        print(f"[RAGService] {len(retrieved)}/{len(docs)} chunks met threshold ≥{threshold} (distances filtered at ≤{max_distance:.2f})")
                    else:
                        print(f"[RAGService] All {len(docs)} chunks were below similarity threshold {threshold}. Closest distance: {min(distances):.4f}")
                    return retrieved
            except Exception as e:
                print(f"[RAGService] ChromaDB query error: {e}")

        # Search Fallback Store with direct similarity filtering
        fallback_data = self._load_fallback_store()
        if not fallback_data:
            return []

        scored = []
        for item in fallback_data:
            score = self._cosine_similarity(query_vector, item["embedding"])
            if score >= threshold:
                scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [{**item, "similarity": round(score, 4)} for score, item in scored[:top_k]]

    def _simple_embedding(self, text: str, dim: int = 64) -> List[float]:
        """Generates a deterministic normalized term frequency vector representation."""
        words = [w.lower() for w in text.split() if w.isalnum()]
        vec = [0.0] * dim
        for w in words:
            idx = sum(ord(c) for c in w) % dim
            vec[idx] += 1.0
        norm = math.sqrt(sum(x * x for x in vec)) or 1.0
        return [x / norm for x in vec]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        if not vec1 or not vec2:
            return 0.0
        min_len = min(len(vec1), len(vec2))
        dot = sum(vec1[i] * vec2[i] for i in range(min_len))
        norm1 = math.sqrt(sum(x * x for x in vec1[:min_len])) or 1.0
        norm2 = math.sqrt(sum(x * x for x in vec2[:min_len])) or 1.0
        return dot / (norm1 * norm2)

    def _load_fallback_store(self) -> List[Dict[str, Any]]:
        if not self.store_file.exists():
            return []
        try:
            with open(self.store_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_fallback_store(self, data: List[Dict[str, Any]]):
        try:
            with open(self.store_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"[RAGService] Error writing fallback store: {e}")

rag_service = RAGService()
