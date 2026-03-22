import type {
  ChatHistoryResponse,
  ChatRequestPayload,
  ChatResponse,
  ConfigStatus,
  DocumentItem,
  DocumentProcessResponse,
  DocumentStatusEvent,
  DocumentUploadResponse,
  LLMCapabilities,
  ProjectAnalytics,
  RAGStats,
  SSEEnvelope,
  Workspace,
  WorkspaceCreatePayload,
  WorkspaceUpdatePayload,
} from '../types';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.toString().trim() ||
  'http://localhost:8000/api/v1';

const BACKEND_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const json = (await response.json()) as { detail?: string };
      if (json?.detail) {
        detail = json.detail;
      }
    } catch {
      // Keep fallback detail when response is not JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function resolveBackendAssetUrl(pathOrUrl: string): string {
  if (!pathOrUrl) {
    return '';
  }
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith('/')) {
    return `${BACKEND_BASE}${pathOrUrl}`;
  }
  return pathOrUrl;
}

export const api = {
  getConfigStatus() {
    return apiFetch<ConfigStatus>('/config/status');
  },

  getCapabilities() {
    return apiFetch<LLMCapabilities>('/rag/capabilities');
  },

  listWorkspaces() {
    return apiFetch<Workspace[]>('/workspaces');
  },

  createWorkspace(payload: WorkspaceCreatePayload) {
    return apiFetch<Workspace>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateWorkspace(workspaceId: number, payload: WorkspaceUpdatePayload) {
    return apiFetch<Workspace>(`/workspaces/${workspaceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteWorkspace(workspaceId: number) {
    return apiFetch<void>(`/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });
  },

  listDocuments(workspaceId: number) {
    return apiFetch<DocumentItem[]>(`/documents/workspace/${workspaceId}`);
  },

  async uploadDocument(workspaceId: number, file: File) {
    const form = new FormData();
    form.append('file', file);

    const response = await fetch(`${API_BASE}/documents/upload/${workspaceId}`, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      let detail = 'Failed to upload document';
      try {
        const json = (await response.json()) as { detail?: string };
        if (json?.detail) {
          detail = json.detail;
        }
      } catch {
        // Keep fallback detail when response is not JSON.
      }
      throw new Error(detail);
    }

    return (await response.json()) as DocumentUploadResponse;
  },

  processDocument(documentId: number) {
    return apiFetch<DocumentProcessResponse>(`/rag/process/${documentId}`, {
      method: 'POST',
    });
  },

  reindexDocument(documentId: number) {
    return apiFetch<DocumentProcessResponse>(`/rag/reindex/${documentId}`, {
      method: 'POST',
    });
  },

  deleteDocument(documentId: number) {
    return apiFetch<void>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  getDocumentMarkdown(documentId: number) {
    return fetch(`${API_BASE}/documents/${documentId}/markdown`).then((response) => {
      if (!response.ok) {
        throw new Error(`Cannot load markdown for document ${documentId}`);
      }
      return response.text();
    });
  },

  getStats(workspaceId: number) {
    return apiFetch<RAGStats>(`/rag/stats/${workspaceId}`);
  },

  getAnalytics(workspaceId: number) {
    return apiFetch<ProjectAnalytics>(`/rag/analytics/${workspaceId}`);
  },

  getChatHistory(workspaceId: number) {
    return apiFetch<ChatHistoryResponse>(`/rag/chat/${workspaceId}/history`);
  },

  clearChatHistory(workspaceId: number) {
    return apiFetch<void>(`/rag/chat/${workspaceId}/history`, {
      method: 'DELETE',
    });
  },

  chat(workspaceId: number, payload: ChatRequestPayload) {
    return apiFetch<ChatResponse>(`/rag/chat/${workspaceId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async streamChat(
    workspaceId: number,
    payload: ChatRequestPayload,
    onEvent: (envelope: SSEEnvelope<Record<string, unknown>>) => void,
  ) {
    const response = await fetch(`${API_BASE}/rag/chat/${workspaceId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Unable to open stream (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim() || block.trim().startsWith(':')) {
          continue;
        }

        const lines = block.split('\n');
        const eventLine = lines.find((line) => line.startsWith('event:'));
        const dataLine = lines.find((line) => line.startsWith('data:'));
        if (!eventLine || !dataLine) {
          continue;
        }

        const event = eventLine.slice('event:'.length).trim();
        const jsonText = dataLine.slice('data:'.length).trim();

        try {
          const data = JSON.parse(jsonText) as Record<string, unknown>;
          onEvent({ event, data });
        } catch {
          // Ignore malformed event payload chunks.
        }
      }
    }
  },

  async streamDocumentEvents(
    workspaceId: number,
    onEvent: (envelope: SSEEnvelope<DocumentStatusEvent>) => void,
    signal?: AbortSignal,
  ) {
    const response = await fetch(`${API_BASE}/documents/workspace/${workspaceId}/events`, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
      },
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`Unable to open document stream (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim() || block.trim().startsWith(':')) {
          continue;
        }

        const lines = block.split('\n');
        const eventLine = lines.find((line) => line.startsWith('event:'));
        const dataLine = lines.find((line) => line.startsWith('data:'));
        if (!eventLine || !dataLine) {
          continue;
        }

        const event = eventLine.slice('event:'.length).trim();
        const jsonText = dataLine.slice('data:'.length).trim();

        try {
          const data = JSON.parse(jsonText) as DocumentStatusEvent;
          onEvent({ event, data });
        } catch {
          // Ignore malformed event payload chunks.
        }
      }
    }
  },
};
