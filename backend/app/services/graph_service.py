import json
import re
import math
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.config import settings
from app.models.schemas import GraphNode, GraphEdge, GraphDataResponse, NodeDetailResponse, DocumentInfo

try:
    from langchain_openai import ChatOpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

class GraphService:
    def __init__(self):
        self.store_file = settings.GRAPH_DATA_PATH
        self.store_file.parent.mkdir(parents=True, exist_ok=True)
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        self._load_graph()

    def extract_and_update_graph(self, documents_text: str, filename: str, doc_id: str):
        """Extracts concept entities and relationships from uploaded document and adds them to graph store."""
        extracted_nodes, extracted_edges = self._extract_with_llm_or_fallback(documents_text, filename, doc_id)
        
        for n in extracted_nodes:
            if n.id in self.nodes:
                # Merge document sources
                existing = self.nodes[n.id]
                if doc_id not in existing.doc_sources:
                    existing.doc_sources.append(doc_id)
            else:
                n.doc_sources = [doc_id]
                self.nodes[n.id] = n

        for e in extracted_edges:
            if e.id not in self.edges:
                self.edges[e.id] = e

        self._save_graph()

    def remove_document_from_graph(self, doc_id: str):
        """Clears concepts exclusive to the deleted document and updates remaining node sources."""
        nodes_to_delete = []
        for nid, node in self.nodes.items():
            if doc_id in node.doc_sources:
                node.doc_sources.remove(doc_id)
            if not node.doc_sources:
                nodes_to_delete.append(nid)

        for nid in nodes_to_delete:
            del self.nodes[nid]

        edges_to_delete = [
            eid for eid, edge in self.edges.items()
            if edge.source in nodes_to_delete or edge.target in nodes_to_delete
        ]
        for eid in edges_to_delete:
            del self.edges[eid]

        self._save_graph()

    def get_react_flow_data(self) -> GraphDataResponse:
        """Formats graph state into React Flow compatible nodes and edges with computed coordinates."""
        rf_nodes = []
        rf_edges = []

        # Per-category inline style tokens for React Flow nodes.
        # Defined once outside the loop — these are constants.
        # (React Flow renders inline styles, not Tailwind class strings)
        CATEGORY_STYLES = {
            "Concept": {
                "background": "#1e1b4b",            # indigo-950
                "border": "2px solid #6366f1",      # indigo-500
                "color": "#a5b4fc",                 # indigo-300
                "boxShadow": "0 0 14px rgba(99,102,241,0.35)",
            },
            "Technology": {
                "background": "#083344",            # cyan-950
                "border": "2px solid #06b6d4",      # cyan-500
                "color": "#67e8f9",                 # cyan-300
                "boxShadow": "0 0 14px rgba(6,182,212,0.35)",
            },
            "Organization": {
                "background": "#1c1100",            # amber-950
                "border": "2px solid #f59e0b",      # amber-500
                "color": "#fcd34d",                 # amber-300
                "boxShadow": "0 0 14px rgba(245,158,11,0.35)",
            },
            "Process": {
                "background": "#052e16",            # emerald-950
                "border": "2px solid #10b981",      # emerald-500
                "color": "#6ee7b7",                 # emerald-300
                "boxShadow": "0 0 14px rgba(16,185,129,0.35)",
            },
            "Document": {
                "background": "#2e1065",            # purple-950
                "border": "2px solid #a855f7",      # purple-500
                "color": "#d8b4fe",                 # purple-300
                "boxShadow": "0 0 14px rgba(168,85,247,0.35)",
            },
        }
        DEFAULT_STYLE = {
            "background": "#0c1a2e",
            "border": "2px solid #3b82f6",
            "color": "#93c5fd",
            "boxShadow": "0 0 14px rgba(59,130,246,0.35)",
        }

        node_list = list(self.nodes.values())
        total_nodes = len(node_list)
        radius = max(200, total_nodes * 35)

        for idx, node in enumerate(node_list):
            angle = (2 * math.pi * idx) / max(1, total_nodes)
            x_pos = 400 + radius * math.cos(angle)
            y_pos = 300 + radius * math.sin(angle)

            cat_style = CATEGORY_STYLES.get(node.category, DEFAULT_STYLE)

            rf_nodes.append({
                "id": node.id,
                "type": "default",
                "data": {
                    "label": node.label,
                    "category": node.category,      # category string drives frontend badge color
                    "doc_sources": node.doc_sources,
                    "description": node.description,
                },
                "position": {"x": round(x_pos, 2), "y": round(y_pos, 2)},
                "style": {
                    **cat_style,
                    "borderRadius": "10px",
                    "padding": "10px 16px",
                    "fontSize": "13px",
                    "fontWeight": "700",
                    "minWidth": "120px",
                    "textAlign": "center",
                }
            })

        for edge in self.edges.values():
            rf_edges.append({
                "id": edge.id,
                "source": edge.source,
                "target": edge.target,
                "label": edge.relation,
                "animated": True,
                "style": {"stroke": "#64748b", "strokeWidth": 2},
                "labelStyle": {"fill": "#94a3b8", "fontSize": 11, "fontWeight": 500}
            })

        return GraphDataResponse(nodes=rf_nodes, edges=rf_edges)


    def get_node_detail(self, node_id: str, all_docs: List[DocumentInfo]) -> Optional[NodeDetailResponse]:
        """Provides node inspector payload: concept info, connected nodes, and source documents."""
        if node_id not in self.nodes:
            return None

        target_node = self.nodes[node_id]
        
        # Find connected neighbor concepts
        connected_ids = set()
        for edge in self.edges.values():
            if edge.source == node_id:
                connected_ids.add(edge.target)
            elif edge.target == node_id:
                connected_ids.add(edge.source)

        connected_nodes = [self.nodes[cid] for cid in connected_ids if cid in self.nodes]
        related_documents = [doc for doc in all_docs if doc.id in target_node.doc_sources]

        return NodeDetailResponse(
            node=target_node,
            connected_nodes=connected_nodes,
            related_documents=related_documents
        )

    def get_counts(self) -> Tuple[int, int]:
        return len(self.nodes), len(self.edges)

    def _extract_with_llm_or_fallback(self, text: str, filename: str, doc_id: str) -> Tuple[List[GraphNode], List[GraphEdge]]:
        use_openai = bool(settings.OPENAI_API_KEY and HAS_OPENAI)
        nodes: List[GraphNode] = []
        edges: List[GraphEdge] = []

        if use_openai:
            try:
                llm = ChatOpenAI(
                    openai_api_key=settings.OPENAI_API_KEY,
                    model_name=settings.OPENAI_MODEL_NAME,
                    temperature=0.1
                )
                prompt = (
                    "Extract key entities and relationships from this document snippet.\n"
                    "Return ONLY valid JSON matching this exact structure:\n"
                    "{\n"
                    '  "entities": [{"id": "e1", "name": "ChromaDB", "category": "Technology", "description": "Vector store"}],\n'
                    '  "relationships": [{"source": "e1", "target": "e2", "relation": "USES"}]\n'
                    "}\n\n"
                    "Categories allowed: Concept, Technology, Organization, Process.\n"
                    f"Document snippet:\n{text[:2000]}"
                )
                res = llm.invoke(prompt)
                content = res.content
                json_match = re.search(r"\{.*\}", content, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group())
                    raw_entities = parsed.get("entities", [])
                    raw_relations = parsed.get("relationships", [])

                    id_map = {}
                    for item in raw_entities:
                        clean_id = re.sub(r"\W+", "_", item["name"].lower())
                        id_map[item["id"]] = clean_id
                        nodes.append(GraphNode(
                            id=clean_id,
                            label=item["name"],
                            category=item.get("category", "Concept"),
                            description=item.get("description", "")
                        ))

                    for rel in raw_relations:
                        s_id = id_map.get(rel["source"], rel["source"])
                        t_id = id_map.get(rel["target"], rel["target"])
                        if s_id and t_id:
                            edges.append(GraphEdge(
                                id=f"rel_{s_id}_{t_id}",
                                source=s_id,
                                target=t_id,
                                relation=rel.get("relation", "CONNECTED_TO")
                            ))
                    return nodes, edges
            except Exception as e:
                print(f"[GraphService] LLM extraction error ({e}). Using rule-based entity extractor.")

        # Rule-based fallback concept extraction
        doc_node_id = f"doc_{doc_id}"
        nodes.append(GraphNode(
            id=doc_node_id,
            label=filename,
            category="Document",
            description=f"Source file {filename}"
        ))

        # Extract capitalized technical terms & keywords
        words = re.findall(r"\b[A-Z][a-zA-Z0-9\-]{2,}\b", text[:3000])
        unique_terms = list(dict.fromkeys(words))[:6]
        if not unique_terms:
            unique_terms = ["Document Pipeline", "Data Extraction", "ChromaDB Storage"]

        for term in unique_terms:
            c_id = f"concept_{re.sub(r'\W+', '_', term.lower())}"
            nodes.append(GraphNode(
                id=c_id,
                label=term,
                category="Concept" if len(term) < 10 else "Technology",
                description=f"Extracted concept from {filename}"
            ))
            edges.append(GraphEdge(
                id=f"edge_{doc_node_id}_{c_id}",
                source=doc_node_id,
                target=c_id,
                relation="CONTAINS"
            ))

        return nodes, edges

    def _load_graph(self):
        if not self.store_file.exists():
            return
        try:
            with open(self.store_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.nodes = {k: GraphNode(**v) for k, v in data.get("nodes", {}).items()}
                self.edges = {k: GraphEdge(**v) for k, v in data.get("edges", {}).items()}
        except Exception as e:
            print(f"[GraphService] Load graph error: {e}")

    def _save_graph(self):
        try:
            with open(self.store_file, "w", encoding="utf-8") as f:
                json.dump({
                    "nodes": {k: v.model_dump() for k, v in self.nodes.items()},
                    "edges": {k: v.model_dump() for k, v in self.edges.items()}
                }, f, indent=2)
        except Exception as e:
            print(f"[GraphService] Save graph error: {e}")

graph_service = GraphService()
