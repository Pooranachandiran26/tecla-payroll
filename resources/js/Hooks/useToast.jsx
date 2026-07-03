import { useState, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let toastIdCounter = 0;

/**
 * Toast provider state and hook.
 * Wrap your app in <ToastProvider> and use useToast() in any component.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastIdCounter;
    const toast = { id, type, title, message, duration, exiting: false };

    setToasts(prev => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    // Mark as exiting for animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

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
