import { useCallback, useEffect, useState } from 'react'

/**
 * Tiny data-loading hook for the admin screens.
 *
 *   const { status, data, message, reload } = useAsync(() => api.adminOrders(), [])
 *
 * status: 'loading' | 'refreshing' | 'ready' | 'error'
 */
export default function useAsync(loader, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, message: '' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    setState((current) => ({ ...current, status: current.data ? 'refreshing' : 'loading' }))

    loader()
      .then((data) => {
        if (active) setState({ status: 'ready', data, message: '' })
      })
      .catch((error) => {
        if (active) {
          setState({ status: 'error', data: null, message: error.message, code: error.status })
        }
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  return { ...state, reload }
}
