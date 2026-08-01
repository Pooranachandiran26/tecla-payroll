import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

/**
 * Toast provider state and hook.
 * Wrap your app in <ToastProvider> and use useToast() in any component.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    // Mark as exiting for animation
    setToasts(prev => (Array.isArray(prev) ? prev : []).map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => (Array.isArray(prev) ? prev : []).filter(t => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback((opts) => {
    let msg = '';
    let toastType = 'info';
    let toastTitle = null;

    if (typeof opts === 'string') {
      msg = opts;
      toastType = 'success';
    } else if (opts && typeof opts === 'object') {
      msg = opts.message || '';
      toastType = opts.type || 'info';
      toastTitle = opts.title || null;
    }

    if (!msg) return null;

    const effectiveDuration = 2000; // Strictly 2 seconds for all alerts
    const id = ++toastIdCounter;
    const now = Date.now();

    setToasts(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      // Prevent adding duplicate active toasts of the same type triggered within 1200ms
      const isDuplicate = safePrev.some(t => 
        !t.exiting && 
        t.type === toastType && 
        (t.message === msg || (now - (t.timestamp || 0)) < 1200)
      );

      if (isDuplicate) {
        return safePrev;
      }

      const toast = { id, type: toastType, title: toastTitle, message: msg, duration: effectiveDuration, exiting: false, timestamp: now };
      return [...safePrev, toast];
    });

    setTimeout(() => {
      dismissToast(id);
    }, effectiveDuration);

    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export default function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
