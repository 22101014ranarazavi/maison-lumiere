import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { formatPrice, initials } from '../lib/format'
import PerfumeBottle from './PerfumeBottle'

const OPENING = {
  role: 'bot',
  text: "Bonjour — I'm the Maison Lumière concierge. Ask me about a note, an occasion, a budget, or the status of an order (LM-XXXXXX).",
  products: [],
  suggestions: [
    'What do you recommend?',
    'Something for a summer wedding',
    'What lasts the longest?',
    'Where is my order?',
  ],
}

const FALLBACK = {
  role: 'bot',
  text: "I couldn't reach the atelier just now. Do try again in a moment — or read one of the fragrance guides while you wait.",
  products: [],
  suggestions: ['What do you recommend?', 'What lasts the longest?'],
}

/** A compact card so a recommendation can be added to the bag or read up on. */
function ChatProduct({ product }) {
  const soldOut = product.stock <= 0

  return (
    <div className="chat-card">
      <Link
        to={`/products/${product.id}`}
        className="chat-card__art"
        style={{ '--tint': product.colors.a }}
        aria-label={`View ${product.name}`}
      >
        <PerfumeBottle colors={product.colors} label={initials(product.name)} />
      </Link>

      <div className="chat-card__body">
        <span className="eyebrow eyebrow--small">{product.category.name}</span>
        <Link to={`/products/${product.id}`} className="chat-card__name">
          {product.name}
        </Link>
        <p className="chat-card__meta">
          {formatPrice(product.price)} · {product.size_ml} ml
          {soldOut && ' · sold out'}
        </p>
        <Link to={`/fragrances/${product.id}/guide`} className="chat-card__guide">
          Read the guide ↗
        </Link>
      </div>
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([OPENING])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [pending, setPending] = useState(null)

  const logRef = useRef(null)
  const inputRef = useRef(null)

  // Another component can summon the concierge with window.dispatchEvent(
  // new CustomEvent('chat:open', { detail: { message } })).
  useEffect(() => {
    const onOpen = (event) => {
      setOpen(true)
      setPending(event.detail?.message ?? null)
    }

    window.addEventListener('chat:open', onOpen)
    return () => window.removeEventListener('chat:open', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return undefined

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const node = logRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, thinking, open])

  const send = async (raw) => {
    const text = (raw ?? input).trim()
    if (!text || thinking) return

    setMessages((current) => [...current, { role: 'user', text }])
    setInput('')
    setThinking(true)

    try {
      const response = await api.chat(text)
      const data = response.data || {}
      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: data.reply || FALLBACK.text,
          products: data.products || [],
          suggestions: data.suggestions || [],
        },
      ])
    } catch {
      setMessages((current) => [...current, FALLBACK])
    } finally {
      setThinking(false)
    }
  }

  // Handle a summons from elsewhere on the site.
  useEffect(() => {
    if (open && pending) {
      const message = pending
      setPending(null)
      send(message)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending])

  const lastBot = [...messages].reverse().find((message) => message.role === 'bot')

  return (
    <>
      <button
        type="button"
        className={`chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="chat-panel"
        aria-label={open ? 'Close the concierge' : 'Ask the fragrance concierge'}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 5h16v11H9l-5 4V5Z" strokeLinejoin="round" />
        </svg>
        <span className="chat-fab__label">Concierge</span>
      </button>

      {open && (
        <aside
          className="chat"
          id="chat-panel"
          role="dialog"
          aria-label="Fragrance concierge"
        >
          <header className="chat__head">
            <div>
              <strong className="chat__title">Fragrance concierge</strong>
              <span className="chat__status">Answers from the live catalogue</span>
            </div>
            <button
              type="button"
              className="chat__close"
              onClick={() => setOpen(false)}
              aria-label="Close the concierge"
            >
              ×
            </button>
          </header>

          <div className="chat__log" ref={logRef} aria-live="polite">
            {messages.map((message, index) => (
              <div key={index} className={`chat__row chat__row--${message.role}`}>
                <p className="chat__bubble">{message.text}</p>

                {message.products?.length > 0 && (
                  <div className="chat__products">
                    {message.products.map((product) => (
                      <ChatProduct key={product.id} product={product} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="chat__row chat__row--bot">
                <p className="chat__bubble chat__bubble--thinking" aria-label="The concierge is typing">
                  <span />
                  <span />
                  <span />
                </p>
              </div>
            )}
          </div>

          {lastBot?.suggestions?.length > 0 && !thinking && (
            <div className="chat__suggestions">
              {lastBot.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="chat__chip"
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <form
            className="chat__form"
            onSubmit={(event) => {
              event.preventDefault()
              send()
            }}
          >
            <input
              ref={inputRef}
              className="chat__input"
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a note, an occasion, an order…"
              aria-label="Your message to the concierge"
              maxLength={500}
            />
            <button type="submit" className="chat__send" disabled={!input.trim() || thinking}>
              Send
            </button>
          </form>
        </aside>
      )}
    </>
  )
}
