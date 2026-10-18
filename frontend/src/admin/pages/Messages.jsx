import { useEffect, useState } from 'react'
import { api, formatDateTime } from '../../api/client'
import ErrorState from '../../components/ErrorState'
import Spinner from '../../components/Spinner'
import { useToast } from '../../context/ToastContext'
import useAsync from '../useAsync'

const FILTERS = [
  { value: '', label: 'All' },
  { value: '0', label: 'Awaiting reply' },
  { value: '1', label: 'Handled' },
]

export default function Messages() {
  const { push } = useToast()
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  const messages = useAsync(() => api.adminMessages({ handled: filter, search: debounced }), [filter, debounced])
  const subscribers = useAsync(() => api.adminSubscribers(), [])

  const list = messages.data?.data ?? []
  const unread = messages.data?.meta?.unread ?? 0
  const total = messages.data?.meta?.total ?? 0

  async function toggleHandled(message) {
    setBusyId(message.id)

    try {
      await api.adminUpdateMessage(message.id, { handled: !message.handled })
      push(message.handled ? `“${message.subject}” reopened.` : `“${message.subject}” marked as handled.`)
      messages.reload()
    } catch (error) {
      push(error.message || 'Could not update that message.', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="admin-head">
        <div>
          <span className="eyebrow">Correspondence</span>
          <h1>Inbox</h1>
        </div>
        <span className="admin-head__meta">
          {unread} awaiting reply · {total} in view
        </span>
      </header>

      <div className="toolbar">
        <div className="chip-row">
          {FILTERS.map((option) => (
            <button
              key={option.value || 'all'}
              type="button"
              className={`chip${filter === option.value ? ' is-active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              {option.value === '0' && <em>{unread}</em>}
            </button>
          ))}
        </div>

        <label className="toolbar__search">
          <span className="visually-hidden">Search messages</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name, email or subject…"
          />
        </label>
      </div>

      <div className="admin-split">
        <div className="admin-stack">
          {messages.status === 'loading' ? (
            <Spinner label="Opening the post" />
          ) : messages.status === 'error' ? (
            <ErrorState message={messages.message} onRetry={messages.reload} />
          ) : list.length === 0 ? (
            <p className="admin-empty panel">Nothing in the inbox for this view.</p>
          ) : (
            list.map((message) => (
              <article key={message.id} className={`message${message.handled ? ' is-handled' : ''}`}>
                <header className="message__head">
                  <div>
                    <strong>{message.name}</strong>
                    <a className="admin-link" href={`mailto:${message.email}`}>{message.email}</a>
                  </div>
                  <time className="admin-sub" dateTime={message.created_at}>{formatDateTime(message.created_at)}</time>
                </header>

                <h2 className="message__subject">{message.subject}</h2>
                <p className="message__body">{message.message}</p>

                <footer className="message__foot">
                  <span className={`stock-pill${message.handled ? '' : ' is-low'}`}>
                    {message.handled ? 'Handled' : 'Awaiting reply'}
                  </span>

                  <div className="admin-actions">
                    <a
                      className="btn btn--ghost btn--small"
                      href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                    >
                      Reply by email
                    </a>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => toggleHandled(message)}
                      disabled={busyId === message.id}
                    >
                      {busyId === message.id ? '…' : message.handled ? 'Reopen' : 'Mark handled'}
                    </button>
                  </div>
                </footer>
              </article>
            ))
          )}
        </div>

        <aside className="panel">
          <div className="panel__head">
            <h2>The letter</h2>
            <span className="panel__meta">
              {subscribers.data?.meta?.total ?? 0} subscribers
            </span>
          </div>

          {subscribers.status === 'loading' ? (
            <div className="panel--pad"><Spinner label="Loading" /></div>
          ) : (
            <ul className="subscribe-list">
              {(subscribers.data?.data ?? []).map((subscriber) => (
                <li key={subscriber.id}>
                  <span>{subscriber.email}</span>
                  <span className="admin-sub">{formatDateTime(subscriber.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </>
  )
}
