import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(0)

  const remove = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message, tone = 'success') => {
      const id = ++nextId.current
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const value = useMemo(() => ({ toasts, push, remove }), [toasts, push, remove])

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }

  return context
}
