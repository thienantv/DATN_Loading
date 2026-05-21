import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import '../styles/toast.css'

const ToastContext = createContext(null)

export const useToast = () => {
  return useContext(ToastContext)
}

let globalAdd = null

export const showToast = (opts) => {
  if (typeof globalAdd === 'function') globalAdd(opts)
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((opts) => {
    const id = Date.now() + Math.random()
    const t = {
      id,
      // Use title if provided, otherwise fall back to message so callers that still
      // pass `message` continue to work without changing all files.
      title: opts.title || opts.message || '',
      // Keep message available in case code reads it, but we won't render it.
      message: opts.message || '',
      type: opts.type || 'info',
      duration: typeof opts.duration === 'number' ? opts.duration : 4500,
      actions: Array.isArray(opts.actions) ? opts.actions : [],
    }
    setToasts((s) => [...s, t])
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((s) => s.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    globalAdd = addToast
    return () => {
      globalAdd = null
    }
  }, [addToast])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-viewport">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ toast, onClose }) {
  const { id, title, message, type, duration } = toast

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  return (
    <div className={`toast toast-${type}`} role="status" aria-live="polite">
      {title && <div className="toast-title">{title}</div>}
      {Array.isArray(toast.actions) && toast.actions.length > 0 && (
        <div className="toast-actions">
          {toast.actions.map((a, idx) => (
            <button
              key={idx}
              className="toast-action"
              onClick={() => {
                try {
                  if (typeof a.onClick === 'function') a.onClick()
                } catch (err) {
                  // eslint-disable-next-line no-console
                  console.error('Toast action error:', err)
                }
                onClose(id)
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      <button className="toast-close" onClick={() => onClose(id)} aria-label="Đóng">×</button>
    </div>
  )
}

export default ToastProvider
