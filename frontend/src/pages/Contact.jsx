import { useState } from 'react'
import { api } from '../api/client'
import Reveal from '../components/Reveal'
import { useToast } from '../context/ToastContext'

const EMPTY_FORM = { name: '', email: '', subject: '', message: '' }

export default function Contact() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const { push } = useToast()

  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('submitting')

    try {
      const response = await api.sendContact(form)
      push(response.message || 'Message received.')
      setForm(EMPTY_FORM)
      setErrors({})
      setStatus('sent')
    } catch (error) {
      setStatus('idle')
      if (error.errors) setErrors(error.errors)
      push(error.message, 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div className="container">
          <span className="eyebrow">Concierge</span>
          <h1>Write to the maison</h1>
          <p>
            Fragrance advice, orders, press or wholesale — a real person answers within one
            business day.
          </p>
        </div>
      </div>

      <div className="container contact-layout">
        <Reveal className="contact-info">
          <div>
            <h3>The atelier</h3>
            <p>
              14 Rue des Fleurs
              <br />
              06130 Grasse
              <br />
              France
            </p>
          </div>

          <div>
            <h3>Direct lines</h3>
            <p>
              <a href="mailto:concierge@maisonlumiere.example">concierge@maisonlumiere.example</a>
              <br />
              <a href="tel:+33493000000">+33 4 93 00 00 00</a>
            </p>
          </div>

          <div>
            <h3>Opening hours</h3>
            <p>
              Monday to Friday, 9h – 18h CET
              <br />
              Saturday, 10h – 17h CET
              <br />
              Closed Sunday
            </p>
          </div>

          <div className="contact-info__note">
            <strong>Sample programme</strong>
            <p>
              Not ready to commit to a full bottle? Ask for the three-sample discovery set
              — it is credited against your first order.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="name">Name<span className="field__required">*</span></label>
                <input
                  id="name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  className={errors.name ? 'has-error' : undefined}
                  autoComplete="name"
                />
                {errors.name && <span className="field__error">{errors.name}</span>}
              </div>

              <div className="field">
                <label htmlFor="email">Email<span className="field__required">*</span></label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => update('email', event.target.value)}
                  className={errors.email ? 'has-error' : undefined}
                  autoComplete="email"
                />
                {errors.email && <span className="field__error">{errors.email}</span>}
              </div>

              <div className="field field--wide">
                <label htmlFor="subject">Subject<span className="field__required">*</span></label>
                <input
                  id="subject"
                  value={form.subject}
                  onChange={(event) => update('subject', event.target.value)}
                  className={errors.subject ? 'has-error' : undefined}
                  placeholder="Fragrance advice, order question…"
                />
                {errors.subject && <span className="field__error">{errors.subject}</span>}
              </div>

              <div className="field field--wide">
                <label htmlFor="message">Message<span className="field__required">*</span></label>
                <textarea
                  id="message"
                  rows="6"
                  value={form.message}
                  onChange={(event) => update('message', event.target.value)}
                  className={errors.message ? 'has-error' : undefined}
                  placeholder="Tell us what you already wear and what you are looking for."
                />
                {errors.message && <span className="field__error">{errors.message}</span>}
              </div>
            </div>

            <button type="submit" className="btn" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : 'Send message'}
            </button>

            {status === 'sent' && (
              <p className="form-success">
                Thank you — your message is with the concierge. Expect a reply within one
                business day.
              </p>
            )}
          </form>
        </Reveal>
      </div>
    </div>
  )
}
