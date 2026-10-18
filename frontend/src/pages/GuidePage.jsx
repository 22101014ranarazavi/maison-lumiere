import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import ErrorState from '../components/ErrorState'
import PerfumeBottle from '../components/PerfumeBottle'
import Reveal from '../components/Reveal'
import Spinner from '../components/Spinner'
import Stars from '../components/Stars'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatPrice, initials } from '../lib/format'

const LAYER_ORDER = ['top', 'heart', 'base']

/** The long-form "about this fragrance" explainer. */
export default function GuidePage() {
  const { id } = useParams()
  const { addItem } = useCart()
  const { push } = useToast()

  const [state, setState] = useState({ status: 'loading', guide: null })

  useEffect(() => {
    let active = true
    setState({ status: 'loading', guide: null })

    api
      .getGuide(id)
      .then((response) => {
        if (active) setState({ status: 'ready', guide: response.data })
      })
      .catch((error) => {
        if (active) setState({ status: 'error', guide: null, message: error.message })
      })

    return () => {
      active = false
    }
  }, [id])

  if (state.status === 'loading') {
    return (
      <div className="page">
        <div className="container section">
          <Spinner label="Opening the guide" />
        </div>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        <div className="container section">
          <ErrorState message={state.message} onRetry={() => window.location.reload()} />
          <p className="guide__back">
            <Link to="/shop" className="link-arrow">← Back to the shop</Link>
          </p>
        </div>
      </div>
    )
  }

  const { product, profile } = state.guide
  const guide = state.guide
  const soldOut = product.stock <= 0

  const askConcierge = () => {
    window.dispatchEvent(
      new CustomEvent('chat:open', {
        detail: { message: `Tell me about ${product.name}` },
      }),
    )
  }

  const handleAdd = () => {
    addItem(product, 1)
    push(`${product.name} added to your bag.`)
  }

  return (
    <div className="page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <span>/</span>
          <Link to="/shop">Shop</Link>
          <span>/</span>
          <Link to={`/products/${product.id}`}>{product.name}</Link>
          <span>/</span>
          <span className="breadcrumb__current">Guide</span>
        </nav>

        {/* Hero ------------------------------------------------------------- */}
        <section className="guide-hero">
          <Reveal className="guide-hero__art" style={{ '--tint': product.colors.a }}>
            <PerfumeBottle colors={product.colors} label={initials(product.name)} animate />
          </Reveal>

          <Reveal className="guide-hero__copy" delay={80}>
            <span className="eyebrow">{product.category.name} · The guide</span>
            <h1>{product.name}</h1>
            <p className="guide-hero__tagline">{guide.tagline}</p>

            <div className="guide-hero__rating">
              <Stars rating={product.rating} count={product.review_count} />
              <span className="pdp__sku">Réf. {product.sku}</span>
            </div>

            <p className="guide-hero__story">{guide.story}</p>

            <div className="guide-hero__actions">
              <button type="button" className="btn" onClick={handleAdd} disabled={soldOut}>
                {soldOut ? 'Currently unavailable' : `Add to bag · ${formatPrice(product.price)}`}
              </button>
              <button type="button" className="btn btn--ghost" onClick={askConcierge}>
                Ask the concierge
              </button>
            </div>
          </Reveal>
        </section>

        {/* At a glance ------------------------------------------------------ */}
        <section className="guide-facts">
          {[
            { label: 'Longevity', value: profile.longevity },
            { label: 'Sillage', value: profile.sillage },
            { label: 'Best season', value: profile.season },
            { label: 'Best for', value: profile.occasion },
            { label: 'Format', value: profile.format },
          ].map((fact, index) => (
            <Reveal key={fact.label} className="guide-fact" delay={index * 45}>
              <span className="guide-fact__label">{fact.label}</span>
              <span className="guide-fact__value">{fact.value}</span>
            </Reveal>
          ))}
        </section>

        {/* The curve -------------------------------------------------------- */}
        <section className="section">
          <Reveal className="section-head section-head--left">
            <span className="eyebrow">On skin</span>
            <h2>How it unfolds</h2>
            <p>An extrait de parfum reveals itself in three acts. Here is what to expect.</p>
          </Reveal>

          <ol className="guide-curve">
            {guide.curve.map((step, index) => (
              <Reveal as="li" key={step.title} className="guide-curve__step" delay={index * 70}>
                <span className="guide-curve__label">{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Note by note ----------------------------------------------------- */}
        <section className="notes section--tinted section">
          <div className="container">
            <Reveal className="section-head section-head--left">
              <span className="eyebrow">Note by note</span>
              <h2>What you are smelling</h2>
              <p>Every ingredient, explained in plain words.</p>
            </Reveal>

            <div className="notes__grid notes__grid--detailed">
              {LAYER_ORDER.map((key, layerIndex) => {
                const layer = guide.layers[key]

                return (
                  <Reveal key={key} className="notes__layer" delay={layerIndex * 70}>
                    <span className="notes__index">0{layerIndex + 1}</span>
                    <h3>{layer.title}</h3>
                    <p className="notes__hint">{layer.hint}</p>

                    <ul className="note-list">
                      {layer.notes.map((note) => (
                        <li key={note.name} className="note">
                          <div className="note__head">
                            <strong>{note.name}</strong>
                            <span className="note__family">{note.family_label}</span>
                          </div>
                          <p className="note__desc">{note.description}</p>
                          <span className="note__mood">{note.mood}</span>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )
              })}
            </div>
          </div>
        </section>

        {/* Wearing + layering ---------------------------------------------- */}
        <section className="section">
          <div className="guide-columns">
            <Reveal className="guide-column">
              <span className="eyebrow">Wearing it</span>
              <h2>How to apply</h2>
              <p>{profile.sprays}.</p>

              <div className="intensity" aria-label={`Intensity ${profile.intensity} out of 5`}>
                <span className="intensity__label">Intensity</span>
                <span className="intensity__dots">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span key={dot} className={dot <= profile.intensity ? 'is-on' : ''} />
                  ))}
                </span>
              </div>

              <p className="inline-note">{guide.craft}</p>
            </Reveal>

            <Reveal className="guide-column" delay={90}>
              <span className="eyebrow">Layering</span>
              <h2>Wear it with</h2>

              {guide.layering.length === 0 ? (
                <p className="inline-note">
                  This one is best worn alone — it has enough to say on its own.
                </p>
              ) : (
                <ul className="layering">
                  {guide.layering.map((pairing) => (
                    <li key={pairing.product.id} className="layering__item">
                      <Link
                        to={`/fragrances/${pairing.product.id}/guide`}
                        className="layering__art"
                        style={{ '--tint': pairing.product.colors.a }}
                        aria-label={`Read the guide for ${pairing.product.name}`}
                      >
                        <PerfumeBottle colors={pairing.product.colors} label={initials(pairing.product.name)} />
                      </Link>
                      <div>
                        <Link to={`/products/${pairing.product.id}`} className="layering__name">
                          {pairing.product.name}
                        </Link>
                        <p>{pairing.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </div>
        </section>

        {/* FAQ -------------------------------------------------------------- */}
        <section className="section section--tinted">
          <div className="container container--narrow">
            <Reveal className="section-head section-head--left">
              <span className="eyebrow">Questions</span>
              <h2>Before you commit</h2>
            </Reveal>

            <div className="faq">
              {guide.faq.map((item, index) => (
                <Reveal key={item.question} delay={index * 40}>
                  <details className="faq__item" open={index === 0}>
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                </Reveal>
              ))}
            </div>

            <div className="section-foot">
              <button type="button" className="btn btn--ghost" onClick={askConcierge}>
                Ask the concierge about {product.name}
              </button>
            </div>
          </div>
        </section>

        {/* Related guides --------------------------------------------------- */}
        {guide.related.length > 0 && (
          <section className="section">
            <Reveal className="section-head section-head--left">
              <span className="eyebrow">Keep exploring</span>
              <h2>More {product.category.name.toLowerCase()} guides</h2>
            </Reveal>

            <div className="guide-related">
              {guide.related.map((related, index) => (
                <Reveal key={related.id} delay={index * 50}>
                  <Link to={`/fragrances/${related.id}/guide`} className="guide-related__card">
                    <span className="guide-related__art" style={{ '--tint': related.colors.a }}>
                      <PerfumeBottle colors={related.colors} label={initials(related.name)} />
                    </span>
                    <strong>{related.name}</strong>
                    <span className="guide-related__meta">
                      {related.category.name} · {formatPrice(related.price)}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
