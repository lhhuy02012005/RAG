import { AnimatePresence, motion } from 'framer-motion';

import type { ToastItem } from '../types';

interface ToastStackProps {
  toasts: ToastItem[];
}

const toneClass: Record<ToastItem['tone'], string> = {
  success: 'border-emerald-300/70',
  error: 'border-rose-300/70',
  info: 'border-sky-300/70',
};

export function ToastStack({ toasts }: ToastStackProps) {
  return (
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          className={`fixed right-4 top-4 z-60 rounded-xl border bg-slate-900/95 px-4 py-3 text-sm text-slate-100 shadow-2xl ${toneClass[toast.tone]}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
        >
          {toast.message}
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
