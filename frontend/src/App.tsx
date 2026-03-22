import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AnalyticsPanel } from './components/AnalyticsPanel';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { ChatPanel } from './components/ChatPanel';
import { DocumentIngestionPanel } from './components/DocumentIngestionPanel';
import { MarkdownPreviewModal } from './components/MarkdownPreviewModal';
import { MetaStrip } from './components/MetaStrip';
import { Sidebar } from './components/Sidebar';
import { ToastStack } from './components/ToastStack';
import { TopBar } from './components/TopBar';
import { WorkspaceSettingsPanel } from './components/WorkspaceSettingsPanel';

import { api } from './lib/api';
import type {
  ConfigStatus,
  DocumentItem,
  DocumentStatus,
  DocumentStatusEvent,
  LLMCapabilities,
  PersistedChatMessage,
  ProjectAnalytics,
  RAGStats,
  ToastItem,
  UIMessage,
  Workspace,
} from './types';

const MAX_CHAT_HISTORY_CONTEXT = 10;

function toUIMessage(msg: PersistedChatMessage): UIMessage {
  return {
    id: `${msg.id}-${msg.message_id}`,
    role: msg.role,
    content: msg.content,
    sources: msg.sources ?? [],
    image_refs: msg.image_refs ?? [],
    thinking: msg.thinking ?? undefined,
    related_entities: msg.related_entities ?? undefined,
    created_at: msg.created_at,
  };
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [stats, setStats] = useState<RAGStats | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState('Idle');
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [newWorkspaceLanguage, setNewWorkspaceLanguage] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLanguage, setEditLanguage] = useState('');
  const [enableThinking, setEnableThinking] = useState(false);
  const [forceSearch, setForceSearch] = useState(true);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [capabilities, setCapabilities] = useState<LLMCapabilities | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewMarkdown, setPreviewMarkdown] = useState('');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [processingDocumentIds, setProcessingDocumentIds] = useState<number[]>([]);
  const previousProcessingRef = useRef(false);

  const selectedWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === workspaceId) ?? null,
    [workspaces, workspaceId],
  );

  const pushToast = useCallback((tone: ToastItem['tone'], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    const list = await api.listWorkspaces();
    setWorkspaces(list);
    setWorkspaceId((prev) => {
      if (list.length === 0) {
        return null;
      }
      if (prev && list.some((item) => item.id === prev)) {
        return prev;
      }
      return list[0].id;
    });
  }, []);

  const loadWorkspaceData = useCallback(async (id: number) => {
    setLoadingWorkspace(true);
    try {
      const [docs, statsResult, analyticsResult, history] = await Promise.all([
        api.listDocuments(id),
        api.getStats(id),
        api.getAnalytics(id),
        api.getChatHistory(id),
      ]);
      setDocuments(docs);
      setStats(statsResult);
      setAnalytics(analyticsResult);
      setChatMessages(history.messages.map(toUIMessage));
      setStreamStatus('Ready');
    } catch (error) {
      pushToast('error', (error as Error).message);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [pushToast]);

  useEffect(() => {
    (async () => {
      try {
        const [cfg, caps] = await Promise.all([
          api.getConfigStatus(),
          api.getCapabilities(),
        ]);
        setConfigStatus(cfg);
        setCapabilities(caps);
        setEnableThinking(caps.thinking_default);
      } catch (error) {
        pushToast('error', (error as Error).message);
      }

      try {
        await refreshWorkspaces();
      } catch (error) {
        pushToast('error', (error as Error).message);
      }
    })();
  }, [pushToast, refreshWorkspaces]);

  useEffect(() => {
    if (!workspaceId) {
      setDocuments([]);
      setStats(null);
      setAnalytics(null);
      setChatMessages([]);
      return;
    }

    void loadWorkspaceData(workspaceId);
  }, [workspaceId, loadWorkspaceData]);

  useEffect(() => {
    if (!selectedWorkspace) {
      return;
    }
    setEditName(selectedWorkspace.name);
    setEditDescription(selectedWorkspace.description ?? '');
    setEditLanguage(selectedWorkspace.kg_language ?? '');
  }, [selectedWorkspace]);

  const processingInProgress = useMemo(
    () =>
      documents.some(
        (doc) =>
          doc.status === 'processing' ||
          doc.status === 'parsing' ||
          doc.status === 'indexing',
      ) || processingDocumentIds.length > 0,
    [documents, processingDocumentIds],
  );

  useEffect(() => {
    if (!workspaceId || !processingInProgress) {
      return;
    }

    const controller = new AbortController();
    void api
      .streamDocumentEvents(
        workspaceId,
        ({ data }) => {
          const event = data as DocumentStatusEvent;
          const documentId = Number(event.document_id);
          const rawStatus = event.status;
          const mappedStatus: DocumentStatus = rawStatus === 'queued' ? 'processing' : rawStatus;

          if (!Number.isFinite(documentId) || !mappedStatus) {
            return;
          }

          setDocuments((prev) =>
            prev.map((doc) => {
              if (doc.id !== documentId) {
                return doc;
              }

              return {
                ...doc,
                status: mappedStatus,
                chunk_count: typeof event.chunk_count === 'number' ? event.chunk_count : doc.chunk_count,
                error_message: event.error_message ?? doc.error_message,
                updated_at: event.timestamp || doc.updated_at,
              };
            }),
          );

          setProcessingDocumentIds((prev) => {
            const terminal = mappedStatus === 'indexed' || mappedStatus === 'failed';
            if (terminal) {
              return prev.filter((id) => id !== documentId);
            }
            return prev.includes(documentId) ? prev : [...prev, documentId];
          });
        },
        controller.signal,
      )
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') {
          pushToast('info', 'Live status stream disconnected. Falling back to refresh.');
          void loadWorkspaceData(workspaceId);
        }
      });

    return () => controller.abort();
  }, [workspaceId, processingInProgress, pushToast, loadWorkspaceData]);

  useEffect(() => {
    if (!workspaceId) {
      previousProcessingRef.current = false;
      return;
    }

    const justCompleted = previousProcessingRef.current && !processingInProgress;
    previousProcessingRef.current = processingInProgress;

    if (justCompleted) {
      void loadWorkspaceData(workspaceId);
    }
  }, [workspaceId, processingInProgress, loadWorkspaceData]);

  useEffect(() => {
    if (!processingDocumentIds.length) {
      return;
    }

    const existingIds = new Set(documents.map((doc) => doc.id));
    setProcessingDocumentIds((prev) => {
      const next = prev.filter((id) => {
        if (!existingIds.has(id)) {
          return false;
        }
        const doc = documents.find((item) => item.id === id);
        if (!doc) {
          return false;
        }
        if (doc.status === 'indexed' || doc.status === 'failed') {
          return false;
        }
        return true;
      });
      return next.length === prev.length ? prev : next;
    });
  }, [documents, processingDocumentIds.length]);

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) {
      pushToast('error', 'Workspace name is required');
      return;
    }

    try {
      const created = await api.createWorkspace({
        name: newWorkspaceName.trim(),
        description: newWorkspaceDescription.trim(),
        kg_language: newWorkspaceLanguage || undefined,
      });
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
      setNewWorkspaceLanguage('');
      await refreshWorkspaces();
      setWorkspaceId(created.id);
      pushToast('success', `Workspace ${created.name} created`);
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleSaveWorkspace() {
    if (!selectedWorkspace) {
      return;
    }
    try {
      await api.updateWorkspace(selectedWorkspace.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        kg_language: editLanguage || undefined,
      });
      await refreshWorkspaces();
      setEditingWorkspace(false);
      pushToast('success', 'Workspace updated');
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleDeleteWorkspace() {
    if (!selectedWorkspace) {
      return;
    }
    const ok = window.confirm(`Delete workspace ${selectedWorkspace.name}?`);
    if (!ok) {
      return;
    }
    try {
      await api.deleteWorkspace(selectedWorkspace.id);
      await refreshWorkspaces();
      pushToast('success', 'Workspace deleted');
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleUploadDocuments(files: FileList | null) {
    if (!workspaceId || !files || files.length === 0) {
      return;
    }

    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(workspaceId, file);
      }
      pushToast('success', `Uploaded ${files.length} file(s)`);
      await loadWorkspaceData(workspaceId);
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleProcessDocument(documentId: number) {
    try {
      setProcessingDocumentIds((prev) => (prev.includes(documentId) ? prev : [...prev, documentId]));
      await api.processDocument(documentId);
      pushToast('info', 'Processing started');
      if (workspaceId) {
        await loadWorkspaceData(workspaceId);
      }
    } catch (error) {
      setProcessingDocumentIds((prev) => prev.filter((id) => id !== documentId));
      pushToast('error', (error as Error).message);
    }
  }

  async function handleReindexDocument(documentId: number) {
    try {
      await api.reindexDocument(documentId);
      pushToast('info', 'Reindex started');
      if (workspaceId) {
        await loadWorkspaceData(workspaceId);
      }
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleDeleteDocument(documentId: number) {
    const ok = window.confirm('Delete this document?');
    if (!ok) {
      return;
    }
    try {
      await api.deleteDocument(documentId);
      pushToast('success', 'Document deleted');
      if (workspaceId) {
        await loadWorkspaceData(workspaceId);
      }
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handlePreviewMarkdown(documentId: number, title: string) {
    try {
      const markdown = await api.getDocumentMarkdown(documentId);
      setPreviewTitle(title);
      setPreviewMarkdown(markdown);
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleClearHistory() {
    if (!workspaceId) {
      return;
    }
    try {
      await api.clearChatHistory(workspaceId);
      setChatMessages([]);
      pushToast('success', 'Chat history cleared');
    } catch (error) {
      pushToast('error', (error as Error).message);
    }
  }

  async function handleSendMessage() {
    if (!workspaceId || !chatInput.trim() || streaming) {
      return;
    }

    const now = new Date().toISOString();
    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      sources: [],
      image_refs: [],
      created_at: now,
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: UIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
      image_refs: [],
      created_at: now,
    };

    const historyPayload = chatMessages
      .slice(-MAX_CHAT_HISTORY_CONTEXT)
      .map((msg) => ({ role: msg.role, content: msg.content }));
    const question = chatInput.trim();

    setChatInput('');
    setStreaming(true);
    setStreamStatus('Analyzing question...');
    setChatMessages((prev) => [...prev, userMessage, assistantMessage]);

    const patchAssistant = (partial: Partial<UIMessage>) => {
      setChatMessages((prev) =>
        prev.map((msg) => (msg.id === assistantId ? { ...msg, ...partial } : msg)),
      );
    };

    try {
      await api.streamChat(
        workspaceId,
        {
          message: question,
          history: historyPayload,
          enable_thinking: enableThinking,
          force_search: forceSearch,
        },
        ({ event, data }) => {
          if (event === 'status') {
            const detail = (data.detail as string) || (data.step as string) || 'Working...';
            setStreamStatus(detail);
            return;
          }

          if (event === 'thinking') {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      thinking: `${msg.thinking ?? ''}${String(data.text ?? '')}`,
                    }
                  : msg,
              ),
            );
            return;
          }

          if (event === 'token') {
            setChatMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      content: `${msg.content}${String(data.text ?? '')}`,
                    }
                  : msg,
              ),
            );
            return;
          }

          if (event === 'token_rollback') {
            patchAssistant({ content: '' });
            return;
          }

          if (event === 'sources') {
            patchAssistant({ sources: (data.sources as UIMessage['sources']) ?? [] });
            return;
          }

          if (event === 'images') {
            patchAssistant({ image_refs: (data.image_refs as UIMessage['image_refs']) ?? [] });
            return;
          }

          if (event === 'complete') {
            patchAssistant({
              content: String(data.answer ?? ''),
              sources: (data.sources as UIMessage['sources']) ?? [],
              image_refs: (data.image_refs as UIMessage['image_refs']) ?? [],
              thinking: (data.thinking as string | undefined) ?? undefined,
              related_entities: (data.related_entities as string[]) ?? [],
            });
            setStreamStatus('Complete');
            return;
          }

          if (event === 'error') {
            patchAssistant({
              content: `Error: ${String(data.message ?? 'Unknown stream error')}`,
            });
            setStreamStatus('Error');
          }
        },
      );

      if (workspaceId) {
        const history = await api.getChatHistory(workspaceId);
        setChatMessages(history.messages.map(toUIMessage));
      }
    } catch (error) {
      patchAssistant({ content: `Error: ${(error as Error).message}` });
      pushToast('error', (error as Error).message);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_10%,#144055_0%,transparent_28%),radial-gradient(circle_at_80%_16%,#1b6c84_0%,transparent_36%),linear-gradient(160deg,#07151c,#0d232f)] text-slate-100">
      <BackgroundOrbs />
      <ToastStack toasts={toasts} />

      <div className="relative z-10 grid min-h-screen grid-cols-1 md:grid-cols-[300px_1fr]">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          workspaces={workspaces}
          workspaceId={workspaceId}
          newWorkspaceName={newWorkspaceName}
          newWorkspaceDescription={newWorkspaceDescription}
          newWorkspaceLanguage={newWorkspaceLanguage}
          setNewWorkspaceName={setNewWorkspaceName}
          setNewWorkspaceDescription={setNewWorkspaceDescription}
          setNewWorkspaceLanguage={setNewWorkspaceLanguage}
          onCreateWorkspace={handleCreateWorkspace}
          onSelectWorkspace={setWorkspaceId}
        />

        <main className="flex flex-col gap-3 p-4">
          <TopBar
            selectedWorkspace={selectedWorkspace}
            workspaceId={workspaceId}
            loadingWorkspace={loadingWorkspace}
            onRefresh={() => {
              if (workspaceId) {
                void loadWorkspaceData(workspaceId);
              }
            }}
            onDeleteWorkspace={handleDeleteWorkspace}
          />

          <MetaStrip
            configStatus={configStatus}
            capabilities={capabilities}
            streamStatus={streamStatus}
          />

          <section className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
              <WorkspaceSettingsPanel
                selectedWorkspace={selectedWorkspace}
                editingWorkspace={editingWorkspace}
                editName={editName}
                editDescription={editDescription}
                editLanguage={editLanguage}
                setEditingWorkspace={setEditingWorkspace}
                setEditName={setEditName}
                setEditDescription={setEditDescription}
                setEditLanguage={setEditLanguage}
                onSaveWorkspace={handleSaveWorkspace}
              />

              <DocumentIngestionPanel
                documents={documents}
                processingDocumentIds={processingDocumentIds}
                processingInProgress={processingInProgress}
                onUploadDocuments={(files) => void handleUploadDocuments(files)}
                onProcessDocument={(documentId) => void handleProcessDocument(documentId)}
                onReindexDocument={(documentId) => void handleReindexDocument(documentId)}
                onPreviewMarkdown={(documentId, title) => void handlePreviewMarkdown(documentId, title)}
                onDeleteDocument={(documentId) => void handleDeleteDocument(documentId)}
              />

              <AnalyticsPanel stats={stats} analytics={analytics} />
            </div>

            <ChatPanel
              chatMessages={chatMessages}
              chatInput={chatInput}
              streaming={streaming}
              workspaceId={workspaceId}
              enableThinking={enableThinking}
              forceSearch={forceSearch}
              setEnableThinking={setEnableThinking}
              setForceSearch={setForceSearch}
              setChatInput={setChatInput}
              onSendMessage={() => void handleSendMessage()}
              onClearHistory={() => void handleClearHistory()}
            />
          </section>
        </main>
      </div>

      <MarkdownPreviewModal
        open={Boolean(previewMarkdown)}
        title={previewTitle}
        markdown={previewMarkdown}
        onClose={() => setPreviewMarkdown('')}
      />
    </div>
  );
}

export default App;
