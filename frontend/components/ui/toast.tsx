"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (props: Omit<Toast, "id">) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, type = "info" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
              layout
              className="glass-panel relative flex gap-3 p-4 rounded-xl shadow-2xl border border-zinc-800 bg-zinc-950/90 text-zinc-100 overflow-hidden"
            >
              {/* Type Indicator vertical line */}
              <div 
                className={`absolute top-0 left-0 bottom-0 w-1 ${
                  t.type === "success" ? "bg-emerald-500" : 
                  t.type === "error" ? "bg-red-500" : "bg-blue-500"
                }`}
              />
              
              <div className="flex-shrink-0 mt-0.5">
                {t.type === "success" && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                {t.type === "error" && <AlertCircle className="h-5 w-5 text-red-500" />}
                {t.type === "info" && <Info className="h-5 w-5 text-blue-400" />}
              </div>

              <div className="flex-grow pr-4">
                <h4 className="text-sm font-semibold text-zinc-50">{t.title}</h4>
                {t.description && (
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{t.description}</p>
                )}
              </div>

              <button
                onClick={() => dismiss(t.id)}
                className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors self-start focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
