# DocInsight AI Test Cases

This document outlines the core test cases for verifying the end-to-end functionality of the DocInsight AI application.

| Test ID | Test Case Name | Description | Status |
| :--- | :--- | :--- | :--- |
| **TC-001** | Backend Health Check | Verify the FastAPI backend is running by pinging the `/api/health` endpoint. | ✅ Pass |
| **TC-002** | Valid Document Upload | Upload a valid PDF/DOCX file via the frontend and verify it processes through all 7 pipeline stages successfully. | ✅ Pass |
| **TC-003** | Invalid File Format | Attempt to upload an unsupported file (e.g., `.exe` or `.png`) and verify the system returns an appropriate error message. | ✅ Pass |
| **TC-004** | RAG Query Response | Submit a natural language question about an uploaded document and verify the LLM returns an accurate answer based on the context. | ✅ Pass |
| **TC-005** | Empty Query Handling | Submit an empty query and verify the backend `/api/query` endpoint returns a 400 Bad Request error. | ✅ Pass |
| **TC-006** | Graph Entity Extraction | Verify that uploading a document successfully extracts entities and relationships, rendering them in the React Flow canvas. | ✅ Pass |
| **TC-007** | Document Deletion | Delete a document from the system and verify its chunks are removed from ChromaDB and concepts from the knowledge graph. | ✅ Pass |
| **TC-008** | Node Inspector Details | Click on a node in the Knowledge Graph and verify the inspector displays the correct concept information, connected nodes, and source documents. | ✅ Pass |
