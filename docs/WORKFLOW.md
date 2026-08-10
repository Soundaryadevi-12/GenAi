# DocInsight AI End-to-End Workflow

This document explains the end-to-end workflow of the application, detailing how data moves through the system and the AI components involved at each stage.

## 1. Document Upload & Ingestion Pipeline

When a user uploads a new document, the system processes it to make its contents searchable and understandable by the AI.

*   **Step 1: File Upload (Frontend)**
    *   The user uploads a PDF or DOCX file via the `DocumentUpload` component.
    *   The file is sent to the backend's `/documents` endpoint.
*   **Step 2: Text Extraction (Backend)**
    *   The backend extracts raw text from the uploaded file using parsing libraries (e.g., `pypdf`, `docx2txt`).
*   **Step 3: Chunking (AI Component: LangChain)**
    *   **LangChain Text Splitters** break the extracted text into smaller, manageable chunks. This is necessary because LLMs have context window limits.
*   **Step 4: Vector Embedding (AI Component: OpenAI API)**
    *   The chunks are sent to the **OpenAI Embeddings API**. This model converts the human-readable text into dense numerical vectors that capture the semantic meaning of the text.
*   **Step 5: Storage (Component: ChromaDB)**
    *   The generated vectors, along with the original text chunks and metadata, are saved into **ChromaDB**, a local vector database optimized for similarity search.

## 2. Querying Pipeline (RAG - Retrieval-Augmented Generation)

When a user asks a question, the system retrieves relevant information to formulate an accurate answer.

*   **Step 1: User Query (Frontend)**
    *   The user types a natural language question. The frontend sends this to the backend's `/query` endpoint.
*   **Step 2: Query Embedding (AI Component: OpenAI API)**
    *   The backend sends the user's question to the **OpenAI Embeddings API** to convert it into a vector, just like the document chunks.
*   **Step 3: Semantic Search (Component: ChromaDB)**
    *   The backend queries **ChromaDB** to find the document chunks whose vectors are mathematically most similar (closest in vector space) to the query's vector.
*   **Step 4: Prompt Construction (AI Component: LangChain)**
    *   **LangChain** takes the user's original question and the text from the retrieved chunks (context) and combines them into a structured prompt for the LLM.
*   **Step 5: Answer Generation (AI Component: OpenAI LLM)**
    *   The combined prompt is sent to an **OpenAI LLM** (e.g., GPT-3.5 or GPT-4). The model generates a response based *only* on the provided context chunks, minimizing hallucinations.
*   **Step 6: Display Response (Frontend)**
    *   The generated answer is returned to the frontend and displayed to the user.

## 3. Knowledge Graph Generation Pipeline

The system visualizes connections between concepts found within the documents.

*   **Step 1: Graph Request (Frontend)**
    *   The frontend requests graph data from the `/graph` endpoint.
*   **Step 2: Entity & Relationship Extraction (AI Component: OpenAI LLM)**
    *   During or after ingestion, the backend uses an **OpenAI LLM** to analyze the document text and extract key entities (people, places, concepts) and the relationships between them (e.g., "Person A" -> "works at" -> "Company B").
*   **Step 3: Graph Structuring (Backend)**
    *   The backend formats these extracted entities and relationships into a standardized graph structure consisting of nodes and edges.
*   **Step 4: Visualization (Frontend Component: React Flow)**
    *   The frontend receives the node and edge data and uses the **React Flow** library to render an interactive, visual representation of the knowledge graph.
