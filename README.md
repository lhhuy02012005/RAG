# NexusRAG (RAGAI)

NexusRAG la he thong RAG local-first gom:
- Frontend: React 19 + Vite 8
- Backend: FastAPI + SSE streaming
- Retrieval: Hybrid (Vector + Knowledge Graph)
- Data: PostgreSQL 15 + ChromaDB + local file storage
- LLM runtime: Ollama (mac dinh qwen2.5:3b)

## Architecture image

Anh kien truc da duoc luu tai:
- `backend/docs/assets/nexusrag-architecture.svg`

Xem truc tiep trong README:

![NexusRAG Architecture](backend/docs/assets/nexusrag-architecture.svg)

## Standardized RAG flow

### 1) Upload and preprocess
- Nguoi dung upload tai lieu tu UI (PDF, DOCX, PPTX, HTML, TXT).
- Backend goi Docling de parse text, table, image.
- Pipeline thuc hien chunking, dedup, va enrich metadata.

### 2) Indexing
- Chunk duoc embedding bang `BAAI/bge-m3`.
- Vector duoc luu vao ChromaDB.
- Markdown/noi dung parse duoc ingest vao LightRAG de tao entity/relation graph.

### 3) Retrieval
- Khi user hoi, he thong tao query embedding.
- Lay ung vien tu ChromaDB (vector retrieval).
- Lay context bo sung tu LightRAG (local/global/hybrid).
- Dung cross-encoder `BAAI/bge-reranker-v2-m3` de rerank top chunks.
- Hop nhat context: chunks + KG context + media refs.

### 4) Generation and streaming
- Context hop nhat duoc dua vao Ollama LLM.
- Backend stream ve frontend qua SSE theo event:
	- `thinking`
	- `token`
	- `sources`
	- `images`
	- `complete`
- UI hien thi cau tra loi cung citation.

## Run guide

## Option A - Local dev (recommended)

Option nay phu hop voi cau truc hien tai nhat cua repo.

### Prerequisites
- Python 3.11+ (khuyen nghi 3.12)
- Node.js 20+
- Docker + Docker Compose (de chay PostgreSQL + ChromaDB)
- Ollama da cai dat local

### Step 1: Start infra services

```bash
docker compose -f docker-compose.services.yml up -d
```

Services duoc mo:
- PostgreSQL: `localhost:5433`
- ChromaDB: `localhost:8002`

### Step 2: Start backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API:
- Base: `http://localhost:8000`
- Health: `http://localhost:8000/health`
- Docs: `http://localhost:8000/docs`

### Step 3: Start frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mac dinh chay o:
- `http://localhost:5173` hoac `http://localhost:5174` (tuy Vite)

Neu can, set API base trong `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Step 4: Prepare Ollama model

```bash
ollama pull qwen2.5:3b
```

Neu muon dung model khac, cap nhat bien `OLLAMA_MODEL` trong `.env` o thu muc goc.

## Option B - Full docker compose

Repo co `docker-compose.yml` cho full stack, tuy nhien file nay dang tham chieu:
- `Dockerfile.backend`
- `Dockerfile.frontend`

Neu ban da bo sung 2 Dockerfile tren, co the chay:

```bash
docker compose up -d
```

## Useful checks

```bash
# list running containers
docker ps

# check backend health
curl http://localhost:8000/health

# tail backend logs (neu chay docker)
docker logs -f nexusrag-backend
```

## Project structure (high-level)

```text
RAGAI/
	backend/
		app/
		data/
		uploads/
		docs/assets/nexusrag-architecture.svg
	frontend/
		src/
	docker-compose.yml
	docker-compose.services.yml
	.env
```

## Notes

- He thong uu tien local stack (Ollama + local embeddings).
- Co the bat/tat KG bang `RAG_ENABLE_KG` trong `.env`.
- Co the dieu chinh retrieval quality qua:
	- `RAG_VECTOR_PREFETCH`
	- `RAG_RERANKER_TOP_K`
	- `RAG_MIN_RELEVANCE_SCORE`
