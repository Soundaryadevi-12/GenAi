import csv
import io
from pathlib import Path
from typing import List, Dict, Any

from langchain_core.documents import Document
from pypdf import PdfReader
import docx2txt

class DocumentLoaderService:
    @staticmethod
    def load_document(file_path: Path, filename: str, doc_id: str) -> List[Document]:
        """
        Parses PDF, DOCX, CSV, TXT files into LangChain Document objects with detailed metadata.
        """
        ext = file_path.suffix.lower()
        documents: List[Document] = []

        if ext == ".pdf":
            try:
                reader = PdfReader(str(file_path))
                for page_num, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    if text.strip():
                        documents.append(
                            Document(
                                page_content=text,
                                metadata={
                                    "doc_id": doc_id,
                                    "filename": filename,
                                    "page_or_row": f"Page {page_num}",
                                    "file_type": "PDF",
                                }
                            )
                        )
            except Exception as e:
                raise ValueError(f"Error parsing PDF '{filename}': {str(e)}")

        elif ext in [".docx", ".doc"]:
            try:
                text = docx2txt.process(str(file_path))
                if text and text.strip():
                    documents.append(
                        Document(
                            page_content=text,
                            metadata={
                                "doc_id": doc_id,
                                "filename": filename,
                                "page_or_row": "Section 1",
                                "file_type": "DOCX",
                            }
                        )
                    )
            except Exception as e:
                raise ValueError(f"Error parsing DOCX '{filename}': {str(e)}")

        elif ext == ".csv":
            try:
                with open(file_path, mode="r", encoding="utf-8", errors="ignore") as f:
                    reader = csv.DictReader(f)
                    for row_num, row in enumerate(reader, start=1):
                        row_str = ", ".join([f"{k}: {v}" for k, v in row.items() if v])
                        if row_str.strip():
                            documents.append(
                                Document(
                                    page_content=row_str,
                                    metadata={
                                        "doc_id": doc_id,
                                        "filename": filename,
                                        "page_or_row": f"Row {row_num}",
                                        "file_type": "CSV",
                                    }
                                )
                            )
            except Exception as e:
                raise ValueError(f"Error parsing CSV '{filename}': {str(e)}")

        elif ext in [".txt", ".md", ".json"]:
            try:
                with open(file_path, mode="r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                    if text.strip():
                        documents.append(
                            Document(
                                page_content=text,
                                metadata={
                                    "doc_id": doc_id,
                                    "filename": filename,
                                    "page_or_row": "File Content",
                                    "file_type": "TXT",
                                }
                            )
                        )
            except Exception as e:
                raise ValueError(f"Error parsing text file '{filename}': {str(e)}")

        else:
            raise ValueError(f"Unsupported file format '{ext}'. Supported: PDF, DOCX, CSV, TXT")

        if not documents:
            raise ValueError(f"No extractable text content found in file '{filename}'.")

        return documents
