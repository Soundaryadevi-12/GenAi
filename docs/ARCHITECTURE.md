# DocInsight AI Architecture

This document outlines the system architecture, main components, and data flow for the DocInsight AI application.

## System Overview

DocInsight AI is an intelligent Multi-Document Knowledge Graph & RAG (Retrieval-Augmented Generation) Explorer. It is built with a decoupled client-server architecture consisting of a modern React frontend and a FastAPI Python backend.

### Tech Stack
* **Frontend**: React, Vite, Tailwind CSS, React Flow (`@xyflow/react`)
* **Backend**: FastAPI, LangChain, ChromaDB, OpenAI API
* **Language**: JavaScript (Frontend), Python (Backend)

## Main Components

### 1. Frontend (React)
The frontend is responsible for the user interface, handling document uploads, queries, and rendering the knowledge graph.
* **DocumentUpload**: Handles file uploads via drag-and-drop (`react-dropzone`).
* **KnowledgeGraph**: Visualizes entity relationships using React Flow (`@xyflow/react`).
* **Navbar**: Main navigation and application layout.
* **API Client**: Communicates with the backend using Axios.

### 2. Backend (FastAPI)
The backend manages data ingestion, processing, vector storage, and answering queries via LLMs.
* **API Routers**:
  * `/documents`: Handles document uploading and processing.
  * `/query`: Handles natural language queries over processed documents.
  * `/graph`: Generates and serves data for the knowledge graph.
* **LangChain & OpenAI**: Used for text splitting, embedding generation, and LLM orchestration.
* **ChromaDB**: Local vector database for storing document embeddings and enabling semantic search.

## Data Flow

### Document Ingestion Flow
1. **Upload**: User uploads a document (PDF, DOCX) via the frontend `DocumentUpload` component.
2. **API Request**: The frontend sends the file as a multipart form data request to the backend `/documents` endpoint.
3. **Processing**: The backend parses the document and uses LangChain to chunk the text into smaller segments.
4. **Embedding**: The backend calls the OpenAI API to generate vector embeddings for each text chunk.
5. **Storage**: The chunks and their corresponding embeddings are stored in ChromaDB.

### Query Flow (RAG)
1. **Query**: User enters a natural language question in the frontend.
2. **API Request**: The frontend sends the query to the backend `/query` endpoint.
3. **Retrieval**: The backend embeds the user's query and performs a similarity search in ChromaDB to retrieve relevant document chunks.
4. **Generation**: The backend sends the retrieved chunks along with the user's prompt to the OpenAI LLM to generate a contextual answer.
5. **Response**: The generated answer is sent back to the frontend and displayed to the user.

### Knowledge Graph Flow
1. **Request**: Frontend requests graph data from the `/graph` endpoint.
2. **Extraction**: Backend queries its processed data/LLM to extract entities and relationships.
3. **Visualization**: Backend returns nodes and edges to the frontend, which renders them interactively using React Flow in the `KnowledgeGraph` component.
