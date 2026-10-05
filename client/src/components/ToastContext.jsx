import { createContext, useCallback, useContext, useState } from 'react';
import { Check, CircleAlert, Info, X } from 'lucide-react';

const ToastContext = createContext(null);
const icons = { success: Check, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200);
  }, []);
  const dismiss = (id) => setToasts((current) => current.filter((item) => item.id !== id));
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const Icon = icons[type] || Info;
          return <div className={`app-toast app-toast-${type}`} key={id}><Icon size={18} /><span>{message}</span><button aria-label="Dismiss notification" onClick={() => dismiss(id)}><X size={16} /></button></div>;
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast must be used within ToastProvider');
  return toast;
}
