# DocInsight AI Agents & LLM Components

This document lists the specific AI agents and Large Language Model (LLM) components utilized within the DocInsight AI system, detailing their purpose, implementation location, and execution triggers.

## 1. Vector Embedder Agent (OpenAI Embeddings)

*   **Purpose**: Converts raw human-readable text into dense numerical vectors (embeddings) that capture the semantic meaning. This allows the system to perform mathematical similarity searches to find relevant information.
*   **Implemented In**: `backend/app/services/rag_service.py` (Methods: `add_chunks_to_chroma`, `_search_relevant_chunks`)
*   **Triggered By**:
    *   **Document Upload Pipeline**: Triggered automatically when a new document is uploaded and chunked. It generates embeddings for every text chunk to be stored in ChromaDB.
    *   **User Query Pipeline**: Triggered automatically when a user submits a question. It generates an embedding for the search query to perform the similarity search against the ChromaDB vector store.

## 2. RAG Q&A Assistant (OpenAI Chat LLM)

*   **Purpose**: Acts as an expert research assistant. It takes the user's natural language question and the relevant text chunks retrieved from ChromaDB (the context), and synthesizes a coherent, accurate answer based *only* on that context to prevent hallucinations.
*   **Implemented In**: `backend/app/services/rag_service.py` (Method: `query_rag`)
*   **Triggered By**:
    *   **User Query**: Triggered when the frontend sends a `POST` request to the `/api/query` endpoint after the user types a question in the chat interface.

## 3. Graph Entity & Relationship Extractor (OpenAI Chat LLM)

*   **Purpose**: Analyzes raw document text snippets to identify key concepts, technologies, organizations, and processes. It extracts these entities and determines the relationships between them, formatting the output as structured JSON to build the Knowledge Graph.
*   **Implemented In**: `backend/app/services/graph_service.py` (Method: `_extract_with_llm_or_fallback`)
*   **Triggered By**:
    *   **Document Upload Pipeline**: Triggered automatically during the "Concept Extraction" stage of the document ingestion process, immediately after the document is chunked and embedded.
