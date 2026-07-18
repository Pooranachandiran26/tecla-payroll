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
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    if (!message) return null;

    let createdId = null;

    setToasts(prev => {
      // Prevent adding duplicate active toasts with the exact same message and type
      if (prev.some(t => !t.exiting && t.message === message && t.type === type)) {
        return prev;
      }

      const id = ++toastIdCounter;
      createdId = id;
      const toast = { id, type, title, message, duration, exiting: false };
      return [...prev, toast];
    });

    if (duration > 0 && createdId) {
      setTimeout(() => {
        dismissToast(createdId);
      }, duration);
    }

    return createdId;
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
