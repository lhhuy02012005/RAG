# NexusRAG (RAGAI)

Hệ thống RAG local-first kết hợp:
- Vector Search (ChromaDB)
- Knowledge Graph (LightRAG)
- Cross-encoder reranking (bge-reranker-v2-m3)
- Agentic chat streaming qua SSE

Mục tiêu: tải tài liệu nội bộ, đặt câu hỏi, nhận câu trả lời có trích dẫn nguồn rõ ràng.

## 1. Kiến trúc tổng quan

![NexusRAG Architecture](backend/docs/assets/nexusrag-architecture.svg)

File ảnh kiến trúc nằm tại:
- `backend/docs/assets/nexusrag-architecture.svg`

## Demo

![NexusRAG Demo](backend/docs/assets/demo.gif)


## 2. Luồng hoạt động chuẩn hóa của hệ thống

### Giai đoạn A - Upload và tiền xử lý
1. Người dùng tải tài liệu từ UI (PDF, DOCX, PPTX, HTML, TXT, MD).
2. Backend parse tài liệu bằng Docling (`DeepDocumentParser`).
3. Trích xuất:
	 - Nội dung văn bản
	 - Bảng
	 - Ảnh
4. Chunking theo ngữ nghĩa + cấu trúc, kèm metadata trang/heading.
5. Dedup chunk trước khi indexing.

### Giai đoạn B - Indexing
1. Chunk được embedding bằng `BAAI/bge-m3`.
2. Embedding + metadata được lưu vào ChromaDB.
3. Markdown được ingest vào LightRAG để tạo graph entity/relation theo workspace.

### Giai đoạn C - Retrieval (Hybrid)
Khi người dùng đặt câu hỏi:
1. Tạo query embedding.
2. Chạy song song:
	 - Vector retrieval từ ChromaDB
	 - KG context retrieval từ LightRAG
3. Rerank danh sách ứng viên bằng cross-encoder `BAAI/bge-reranker-v2-m3`.
4. Hợp nhất context cuối: chunk + KG summary + media refs.

### Giai đoạn D - Generation và Streaming
1. Context hợp nhất được đưa vào LLM (Ollama).
2. Trả kết quả về frontend qua SSE theo event:
	 - `thinking`
	 - `token`
	 - `sources`
	 - `images`
	 - `complete`
3. UI hiển thị câu trả lời có citation, liên kết về document theo trang/heading.

## 3. Điểm nổi bật so với RAG truyền thống

- Không chỉ vector search: có thêm Knowledge Graph cho câu hỏi liên kết quan hệ.
- Không chỉ cosine top-k: có bước cross-encoder rerank để tăng độ chính xác.
- Có xử lý ảnh/bảng: caption được đưa vào chunk để truy vấn ngữ nghĩa tốt hơn.
- Có SSE streaming: trải nghiệm phản hồi theo token thời gian thực.

## 4. Công nghệ chính

- Backend: FastAPI, SQLAlchemy async, Pydantic Settings
- Frontend: React 19, Vite 8, TypeScript
- Vector DB: ChromaDB
- Metadata DB: PostgreSQL 15
- KG: LightRAG (file-based theo workspace)
- LLM runtime: Ollama
- Embedding/Rerank: sentence-transformers (`bge-m3`, `bge-reranker-v2-m3`)

## 5. Hướng dẫn chạy hệ thống

## 5.1 Yêu cầu môi trường

- Python 3.11+ (khuyến nghị 3.12)
- Node.js 20+
- Docker + Docker Compose
- Ollama cài local

## 5.2 Chạy local dev (khuyến nghị)

### Bước 1 - chạy PostgreSQL + ChromaDB

```bash
docker compose -f docker-compose.services.yml up -d
```

Port mặc định:
- PostgreSQL: `localhost:5433`
- ChromaDB: `localhost:8002`

### Bước 2 - cài backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Bước 3 - chuẩn bị `.env` ở thư mục gốc

Ví dụ tối thiểu:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/rag
CHROMA_HOST=localhost
CHROMA_PORT=8002

LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_ENABLE_THINKING=false

KG_EMBEDDING_PROVIDER=sentence_transformers
KG_EMBEDDING_MODEL=BAAI/bge-m3
KG_EMBEDDING_DIMENSION=1024

RAG_ENABLE_KG=true
RAG_KG_LANGUAGE=Vietnamese
RAG_VECTOR_PREFETCH=20
RAG_RERANKER_TOP_K=5
RAG_MIN_RELEVANCE_SCORE=0.15

CORS_ORIGINS=["http://localhost:5173","http://localhost:5174"]
```

### Bước 4 - chạy backend

```bash
source backend/venv/bin/activate
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

API:
- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

### Bước 5 - chạy frontend

```bash
cd frontend
npm install
```

Tạo file `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Chạy frontend:

```bash
npm run dev
```

Mở trình duyệt tại URL Vite hiển thị (thường là `http://localhost:5173`).

### Bước 6 - pull model Ollama

```bash
ollama pull qwen2.5:3b
```

## 5.3 Chạy full bằng docker compose

Repo có `docker-compose.yml` cho full stack, nhưng hiện tại file này tham chiếu `Dockerfile.backend` và `Dockerfile.frontend` (chưa có trong workspace hiện tại).

Khi đã bổ sung đầy đủ 2 Dockerfile, chạy:

```bash
docker compose up -d
```

## 6. Hướng dẫn sử dụng cho người dùng cuối

## 6.1 Khởi động ứng dụng

1. Đảm bảo backend, frontend, postgres, chroma, ollama đều đang chạy.
2. Mở frontend trên trình duyệt.
3. Tạo workspace mới.

## 6.2 Upload tài liệu

1. Vào khu vực upload.
2. Chọn file tài liệu.
3. Chờ trạng thái chuyển qua các bước:
	 - `PARSING`
	 - `INDEXING`
	 - `INDEXED`

## 6.3 Đặt câu hỏi

1. Chọn workspace đã có tài liệu.
2. Nhập câu hỏi cụ thể.
3. Quan sát streaming trả lời theo thời gian thực.
4. Kiểm tra citation/source đi kèm câu trả lời.

## 6.4 Mẹo để kết quả tốt hơn

- Đặt câu hỏi có ngữ cảnh rõ ràng.
- Với dữ liệu số liệu, thêm mốc thời gian và tên tài liệu.
- Nếu câu trả lời chung chung, chia câu hỏi lớn thành 2-3 câu nhỏ.

## 7. Hướng dẫn cho developers

Mục này tập trung vào tối ưu hiệu năng và chất lượng retrieval, đặc biệt khi máy mạnh hơn.

## 7.1 Các vị trí cấu hình quan trọng

- Biến môi trường runtime: `.env` (thư mục gốc)
- Default/alias settings: `backend/app/core/config.py`
- Chunking parser: `backend/app/services/deep_document_parser.py`
- Hybrid retrieval + timeout: `backend/app/services/deep_retriever.py`
- KG service: `backend/app/services/knowledge_graph_service.py`

## 7.2 Tuning theo cấu hình máy

## Hồ sơ A - Máy trung bình (Mac 16GB / CPU-only)

Khuyến nghị:
- `OLLAMA_MODEL=qwen2.5:3b`
- `NEXUSRAG_EMBEDDING_DEVICE=cpu`
- `NEXUSRAG_KG_EMBEDDING_BATCH_NUM=1`
- `NEXUSRAG_KG_ENTITY_EXTRACTION_LIMIT=5`
- `RAG_VECTOR_PREFETCH=20`
- `RAG_RERANKER_TOP_K=5`
- `RAG_CHUNK_MAX_TOKENS=512`

Mục tiêu: ổn định, ít lỗi OOM, latency vừa phải.

## Hồ sơ B - Máy mạnh (>= 32GB RAM, có GPU)

Khuyến nghị tăng chất lượng:
- Nâng model:
	- `OLLAMA_MODEL=qwen2.5:7b` hoặc `qwen2.5:14b`
- Bật thinking nếu cần lập luận dài:
	- `OLLAMA_ENABLE_THINKING=true`
- Tăng chunk và retrieval:
	- `RAG_CHUNK_MAX_TOKENS=700` hoặc `900`
	- `RAG_VECTOR_PREFETCH=30` hoặc `40`
	- `RAG_RERANKER_TOP_K=8`
	- `RAG_MIN_RELEVANCE_SCORE=0.10` đến `0.20` (tùy domain)
- Tăng khả năng KG:
	- `NEXUSRAG_KG_EMBEDDING_BATCH_NUM=2` đến `4`
	- `NEXUSRAG_KG_ENTITY_EXTRACTION_LIMIT=10` đến `20`
	- `NEXUSRAG_KG_LLM_MAX_TOKEN_SIZE=2048`
- Nếu dùng GPU:
	- `NEXUSRAG_EMBEDDING_DEVICE=auto` (hoặc `cuda` nếu môi trường hỗ trợ)

Mục tiêu: tăng recall/reasoning, chấp nhận tốn tài nguyên hơn.

## 7.3 Chỉnh tham số ở đâu (cụ thể)

### A. Nâng model LLM

Sửa trong `.env`:

```env
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_ENABLE_THINKING=true
```

Sau đó pull model:

```bash
ollama pull qwen2.5:7b
```

### B. Chỉnh chunk size

Sửa trong `.env`:

```env
RAG_CHUNK_MAX_TOKENS=800
```

Tham số này được dùng trong `DeepDocumentParser` khi khởi tạo `HybridChunker`.

### C. Chỉnh độ sâu retrieval và rerank

Sửa trong `.env`:

```env
RAG_VECTOR_PREFETCH=30
RAG_RERANKER_TOP_K=8
RAG_MIN_RELEVANCE_SCORE=0.12
RAG_VECTOR_QUERY_TIMEOUT=60
RAG_RERANK_TIMEOUT=45
```

Các tham số này được dùng trong `backend/app/services/deep_retriever.py`.

### D. Chỉnh chất lượng KG extraction

Sửa trong `.env`:

```env
RAG_ENABLE_KG=true
RAG_KG_LANGUAGE=Vietnamese
NEXUSRAG_KG_ENTITY_EXTRACTION_LIMIT=12
NEXUSRAG_KG_EMBEDDING_BATCH_NUM=3
NEXUSRAG_KG_LLM_MAX_TOKEN_SIZE=2048
```

Các tham số này được dùng trong `backend/app/services/knowledge_graph_service.py`.

## 7.4 Khuyến nghị khi benchmark chất lượng

Khi so sánh before/after tuning, nên cố định:
- Cùng tập tài liệu
- Cùng bộ câu hỏi
- Cùng ngôn ngữ hỏi

Theo dõi:
- Faithfulness (đúng theo nguồn)
- Citation coverage (có dẫn nguồn)
- Latency trung bình
- Tỉ lệ câu trả lời rỗng/không liên quan

## 8. API chính

Base prefix: `/api/v1`

Một số nhóm endpoint:
- Workspaces
- Documents
- RAG chat/search/analytics
- Config status

Xem chi tiết tại Swagger:
- `http://localhost:8000/docs`

## 9. Cấu trúc thư mục mức cao

```text
RAGAI/
	backend/
		app/
		data/
		uploads/
		docs/assets/nexusrag-architecture.svg
	frontend/
		src/
	docker-compose.services.yml
	docker-compose.yml
	README.md
	.env
```

## 10. Troubleshooting nhanh

- Frontend không gọi được backend:
	- Kiểm tra `frontend/.env` và `VITE_API_BASE_URL`
- Chat chậm hoặc timeout:
	- Giảm `RAG_VECTOR_PREFETCH`, `RAG_RERANKER_TOP_K`, model nhỏ hơn
- KG ingest quá lâu:
	- Giảm `NEXUSRAG_KG_ENTITY_EXTRACTION_LIMIT`
	- Giảm `NEXUSRAG_KG_LLM_MAX_TOKEN_SIZE`
- Không có kết quả tốt:
	- Tăng `RAG_VECTOR_PREFETCH`
	- Giảm nhẹ `RAG_MIN_RELEVANCE_SCORE`
	- Dùng model LLM lớn hơn

---
