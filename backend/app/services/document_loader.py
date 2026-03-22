"""Document loading helpers used by legacy RAG paths.

DeepRAG uses Docling parser directly, but legacy services still import
``load_document`` / ``LoadedDocument`` from this module.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


@dataclass
class LoadedDocument:
    """Normalized document payload for downstream chunking."""

    content: str
    file_type: str
    page_count: int = 0
    metadata: dict = field(default_factory=dict)


def _read_text_file(path: Path) -> LoadedDocument:
    # Try UTF-8 first, then fallback to a permissive decode.
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="latin-1", errors="ignore")

    return LoadedDocument(
        content=text,
        file_type=path.suffix.lower().lstrip("."),
        page_count=1 if text.strip() else 0,
        metadata={"source": str(path)},
    )


def _read_with_docling(path: Path) -> LoadedDocument:
    """Load PDF/DOCX/PPTX/HTML using Docling and export markdown."""
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(str(path))
    doc = result.document

    content = doc.export_to_markdown() or ""

    page_count = 0
    for attr in ("num_pages", "page_count"):
        value = getattr(doc, attr, None)
        if isinstance(value, int):
            page_count = value
            break

    if page_count == 0:
        pages_obj = getattr(doc, "pages", None)
        try:
            page_count = len(pages_obj) if pages_obj is not None else 0
        except Exception:
            page_count = 0

    return LoadedDocument(
        content=content,
        file_type=path.suffix.lower().lstrip("."),
        page_count=page_count,
        metadata={"source": str(path), "parser": "docling"},
    )


def load_document(file_path: str | Path) -> LoadedDocument:
    """Load a document from disk into text/markdown content.

    Supported:
    - text-like: txt, md
    - rich docs via Docling: pdf, docx, pptx, html
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {path}")

    suffix = path.suffix.lower()

    if suffix in {".txt", ".md"}:
        return _read_text_file(path)

    if suffix in {".pdf", ".docx", ".pptx", ".html"}:
        return _read_with_docling(path)

    raise ValueError(f"Unsupported document type: {suffix}")