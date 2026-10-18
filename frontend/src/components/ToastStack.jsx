import { useToast } from '../context/ToastContext'

export default function ToastStack() {
  const { toasts, remove } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span className="toast__glyph" aria-hidden="true">
            {toast.tone === 'error' ? '!' : '✓'}
          </span>
          <p>{toast.message}</p>
          <button type="button" onClick={() => remove(toast.id)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
