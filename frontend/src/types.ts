export type DocumentStatus =
  | 'pending'
  | 'processing'
  | 'parsing'
  | 'indexing'
  | 'indexed'
  | 'failed';

export interface Workspace {
  id: number;
  name: string;
  description: string | null;
  system_prompt: string | null;
  kg_language: string | null;
  kg_entity_types: string[] | null;
  document_count: number;
  indexed_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSummary {
  id: number;
  name: string;
  document_count: number;
}

export interface WorkspaceCreatePayload {
  name: string;
  description?: string;
  kg_language?: string;
  kg_entity_types?: string[];
}

export interface WorkspaceUpdatePayload {
  name?: string;
  description?: string;
  system_prompt?: string;
  kg_language?: string;
  kg_entity_types?: string[];
}

export interface DocumentItem {
  id: number;
  workspace_id: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  page_count: number;
  image_count: number;
  table_count: number;
  parser_version: string | null;
  processing_time_ms: number;
}

export interface DocumentUploadResponse {
  id: number;
  filename: string;
  status: DocumentStatus;
  message: string;
}

export interface DocumentProcessResponse {
  document_id: number;
  status: string;
  chunk_count: number;
  message: string;
}

export interface RAGStats {
  workspace_id: number;
  total_documents: number;
  indexed_documents: number;
  total_chunks: number;
  image_count: number;
  nexusrag_documents: number;
}

export interface KGEntity {
  name: string;
  entity_type: string;
  description: string;
  degree: number;
}

export interface KGRelationship {
  source: string;
  target: string;
  description: string;
  keywords: string;
  weight: number;
}

export interface ProjectAnalytics {
  stats: RAGStats;
  kg_analytics: {
    entity_count: number;
    relationship_count: number;
    entity_types: Record<string, number>;
    top_entities: KGEntity[];
    avg_degree: number;
  } | null;
  document_breakdown: Array<{
    document_id: number;
    filename: string;
    chunk_count: number;
    image_count: number;
    page_count: number;
    file_size: number;
    status: string;
  }>;
}

export interface ChatSource {
  index: string;
  chunk_id: string;
  content: string;
  document_id: number;
  page_no: number;
  heading_path: string[];
  score: number;
  source_type: string;
}

export interface ChatImageRef {
  ref_id?: string;
  image_id: string;
  document_id: number;
  page_no: number;
  caption: string;
  url: string;
  width: number;
  height: number;
}

export interface PersistedChatMessage {
  id: number;
  message_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[] | null;
  related_entities: string[] | null;
  image_refs: ChatImageRef[] | null;
  thinking: string | null;
  agent_steps: Array<Record<string, unknown>> | null;
  created_at: string;
}

export interface ChatHistoryResponse {
  workspace_id: number;
  messages: PersistedChatMessage[];
  total: number;
}

export interface ChatRequestPayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  document_ids?: number[];
  enable_thinking?: boolean;
  force_search?: boolean;
}

export interface ChatResponse {
  answer: string;
  sources: ChatSource[];
  related_entities: string[];
  kg_summary: string | null;
  image_refs: ChatImageRef[];
  thinking: string | null;
}

export interface LLMCapabilities {
  provider: string;
  model: string;
  supports_thinking: boolean;
  supports_vision: boolean;
  thinking_default: boolean;
}

export interface ConfigStatus {
  llm_provider: string;
  llm_model: string;
  kg_embedding_provider: string;
  kg_embedding_model: string;
  kg_embedding_dimension: number;
  nexusrag_embedding_model: string;
  nexusrag_reranker_model: string;
}

export interface SSEEnvelope<T = unknown> {
  event: string;
  data: T;
}

export interface DocumentStatusEvent {
  document_id: number;
  workspace_id: number;
  status: DocumentStatus | 'queued';
  timestamp: string;
  message?: string;
  chunk_count?: number;
  error_message?: string;
}

export interface ChatStreamState {
  answer: string;
  thinking: string;
  sources: ChatSource[];
  image_refs: ChatImageRef[];
  related_entities: string[];
}

export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: ChatSource[];
  image_refs: ChatImageRef[];
  thinking?: string;
  related_entities?: string[];
  created_at: string;
}

export interface ToastItem {
  id: string;
  tone: 'success' | 'error' | 'info';
  message: string;
}
