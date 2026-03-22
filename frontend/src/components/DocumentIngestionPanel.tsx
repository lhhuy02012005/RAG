import { Loader2, Trash2, Upload } from 'lucide-react';

import type { DocumentItem } from '../types';

interface DocumentIngestionPanelProps {
  documents: DocumentItem[];
  processingDocumentIds: number[];
  processingInProgress: boolean;
  onUploadDocuments: (files: FileList | null) => void;
  onProcessDocument: (documentId: number) => void;
  onReindexDocument: (documentId: number) => void;
  onPreviewMarkdown: (documentId: number, title: string) => void;
  onDeleteDocument: (documentId: number) => void;
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

function statusClass(status: string): string {
  if (status === 'indexed') return 'border-emerald-300/40 text-emerald-300';
  if (status === 'failed') return 'border-rose-300/40 text-rose-200';
  if (status === 'processing' || status === 'parsing' || status === 'indexing') {
    return 'border-amber-300/40 text-amber-200';
  }
  return 'border-slate-300/40 text-slate-200';
}

export function DocumentIngestionPanel({
  documents,
  processingDocumentIds,
  processingInProgress,
  onUploadDocuments,
  onProcessDocument,
  onReindexDocument,
  onPreviewMarkdown,
  onDeleteDocument,
}: DocumentIngestionPanelProps) {
  return (
    <div className="rounded-2xl border border-cyan-100/20 bg-slate-900/70 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-100">Document Ingestion</h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-linear-to-r from-emerald-300 to-cyan-300 px-3 py-2 text-sm font-semibold text-slate-900">
          <Upload size={15} /> Upload
          <input
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.txt,.md,.docx,.pptx"
            onChange={(event) => onUploadDocuments(event.target.files)}
          />
        </label>
      </div>

      {processingInProgress && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-900/20 px-3 py-2 text-xs text-amber-100">
          <Loader2 size={14} className="animate-spin" />
          Document processing is running (Docling/Ollama). Please wait until status changes to indexed.
        </div>
      )}

      <div className="flex max-h-87.5 flex-col gap-2 overflow-auto pr-1">
        {documents.map((doc) => (
          <article
            key={doc.id}
            className="flex flex-col justify-between gap-2 rounded-xl border border-cyan-100/20 bg-slate-800/70 p-3 xl:flex-row"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="break-all text-sm text-slate-100">{doc.original_filename}</strong>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${statusClass(doc.status)}`}>
                  {doc.status}
                </span>
              </div>

              <small className="mt-1 block text-xs text-slate-300">
                {formatBytes(doc.file_size)} · {doc.chunk_count} chunks · {doc.image_count} images
              </small>

              {doc.error_message && <p className="mt-2 text-xs text-rose-200">{doc.error_message}</p>}
            </div>

            <div className="flex flex-wrap items-start justify-end gap-1.5">
              {(() => {
                const isBackendProcessing =
                  doc.status === 'processing' || doc.status === 'parsing' || doc.status === 'indexing';
                const isPendingStart = processingDocumentIds.includes(doc.id);
                const isProcessing = isBackendProcessing || isPendingStart;

                return (
                  <>
                    <button
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-100/20 bg-slate-700/50 px-2.5 py-1.5 text-xs text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => onProcessDocument(doc.id)}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <Loader2 size={12} className="animate-spin" /> : null}
                      {isProcessing ? 'Processing...' : 'Process'}
                    </button>
                    <button
                      className="rounded-lg border border-cyan-100/20 bg-slate-700/50 px-2.5 py-1.5 text-xs text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => onReindexDocument(doc.id)}
                      disabled={isProcessing}
                    >
                      Reindex
                    </button>
                  </>
                );
              })()}
              <button
                className="rounded-lg border border-cyan-100/20 bg-slate-700/50 px-2.5 py-1.5 text-xs text-slate-100"
                onClick={() => onPreviewMarkdown(doc.id, doc.original_filename)}
              >
                Preview
              </button>
              <button
                className="inline-flex items-center gap-1 rounded-lg border border-rose-300/40 bg-rose-900/40 px-2.5 py-1.5 text-xs text-rose-100"
                onClick={() => onDeleteDocument(doc.id)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </article>
        ))}

        {documents.length === 0 && (
          <p className="text-sm text-slate-300">No documents yet. Upload files to begin indexing.</p>
        )}
      </div>
    </div>
  );
}
