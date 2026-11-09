import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [serverWaking, setServerWaking] = useState(false);

  // Listen to server waking events from the shared API client
  useEffect(() => {
    const handleWaking = (e) => {
      setServerWaking(Boolean(e.detail?.show));
    };
    window.addEventListener('samanvitha:server-waking', handleWaking);
    return () => window.removeEventListener('samanvitha:server-waking', handleWaking);
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast({ message, type: 'success', duration }),
    error: (message, duration) => addToast({ message, type: 'error', duration }),
    warning: (message, duration) => addToast({ message, type: 'warning', duration }),
    info: (message, duration) => addToast({ message, type: 'info', duration }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Render Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {/* Calm server waking notice (auto-dismissed when request completes) */}
        {serverWaking && (
          <div
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-sand-300 bg-sand-100/95 text-charcoal-900 shadow-soft-md transition-all duration-300 animate-fade-in"
            role="status"
            aria-live="polite"
          >
            <div className="w-4 h-4 mt-0.5 border-2 border-sage-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-xs sm:text-sm font-medium leading-relaxed flex-1">
              The server is waking up (free hosting). This can take up to a minute, please wait.
            </p>
          </div>
        )}

        {toasts.map((t) => {
          const typeStyles = {
            success: 'bg-sage-50 text-sage-900 border-sage-300',
            error: 'bg-red-50 text-red-900 border-red-300',
            warning: 'bg-amber-50 text-amber-900 border-amber-300',
            info: 'bg-sand-100 text-charcoal-900 border-sand-300',
          }[t.type];

          const IconComponent = {
            success: CheckCircle2,
            error: AlertCircle,
            warning: AlertTriangle,
            info: Info,
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-soft-md transition-all duration-300 ${typeStyles}`}
              role="alert"
            >
              <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-90" />
              <p className="text-sm font-medium leading-relaxed flex-1">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded focus-visible:outline-sage-600"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Hook to observe whether a server request is currently in slow / cold-start waking state (>5s)
 */
export function useServerWaking() {
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const handleWaking = (e) => {
      setIsWaking(Boolean(e.detail?.show));
    };
    window.addEventListener('samanvitha:server-waking', handleWaking);
    return () => window.removeEventListener('samanvitha:server-waking', handleWaking);
  }, []);

  return isWaking;
}

export default useToast;
