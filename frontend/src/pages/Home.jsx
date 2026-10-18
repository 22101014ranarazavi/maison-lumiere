import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import PerfumeBottle from '../components/PerfumeBottle'
import ProductCard from '../components/ProductCard'
import Reveal from '../components/Reveal'
import { formatPrice, initials } from '../lib/format'

const TESTIMONIALS = [
  {
    quote:
      'I have worn niche perfume for twenty years. Nuit d’Or is the first bottle I have finished and immediately reordered.',
    name: 'Camille R.',
    place: 'Paris',
  },
  {
    quote:
      'The consultation was generous rather than salesy — they talked me out of what I thought I wanted and into something better.',
    name: 'Marcus T.',
    place: 'New York',
  },
  {
    quote:
      'Beautifully made, beautifully packed. It smells like something my grandmother would have kept on a marble dressing table.',
    name: 'Priya N.',
    place: 'Singapore',
  },
]

export default function Home() {
  const [featured, setFeatured] = useState({ status: 'loading', items: [] })
  const [families, setFamilies] = useState({ status: 'loading', items: [] })

  useEffect(() => {
    let active = true

    api
      .listProducts({ featured: 1, limit: 6 })
      .then((response) => {
        if (active) setFeatured({ status: 'ready', items: response.data })
      })
      .catch(() => {
        if (active) setFeatured({ status: 'error', items: [] })
      })

    api
      .listCategories()
      .then((response) => {
        if (active) setFamilies({ status: 'ready', items: response.data })
      })
      .catch(() => {
        if (active) setFamilies({ status: 'error', items: [] })
      })

    return () => {
      active = false
    }
  }, [])

  const heroProduct = featured.items[0]

  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <Reveal className="hero__copy">
            <span className="eyebrow">Grasse · Est. 1998</span>
            <h1>
              Scent is the silent
              <br />
              signature of elegance.
            </h1>
            <p className="hero__lede">
              Fourteen compositions, each blended in small batches from naturals
              sourced across the Mediterranean. Nothing loud. Everything memorable.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn">
                Shop the collection
              </Link>
              <Link to="/about" className="btn btn--ghost">
                Our story
              </Link>
            </div>
            <ul className="hero__facts">
              <li>Extrait de parfum, 20–30% concentration</li>
              <li>Complimentary shipping over $150</li>
              <li>Two samples with every order</li>
            </ul>
          </Reveal>

          <Reveal className="hero__art" delay={120}>
            <span className="hero__glow" aria-hidden="true" />
            <div className="hero__bottle hero__bottle--back">
              <PerfumeBottle
                colors={{ a: '#f2c6d4', b: '#a56b8a', shape: 'round' }}
                label="FL"
              />
            </div>
            <div className="hero__bottle hero__bottle--front">
              <PerfumeBottle
                colors={{ a: '#d8b36a', b: '#7a5230', shape: 'faceted' }}
                label="NO"
              />
            </div>
            <span className="hero__seal">
              <em>Since</em>
              <strong>1998</strong>
            </span>
          </Reveal>
        </div>
      </section>

      <section className="trust-band">
        <div className="container trust-band__inner">
          <span>Blended in Grasse</span>
          <span>Naturals first formulation</span>
          <span>30-day returns</span>
          <span>Shipping worldwide</span>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">The house signatures</span>
            <h2>Most loved compositions</h2>
            <p>
              The bottles our clients return for — chosen by the atelier for their
              balance of presence and restraint.
            </p>
          </Reveal>

          {featured.status === 'loading' && (
            <div className="product-grid">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="product-card skeleton-card">
                  <div className="skeleton skeleton--art" />
                  <div className="skeleton skeleton--line" />
                  <div className="skeleton skeleton--line skeleton--short" />
                </div>
              ))}
            </div>
          )}

          {featured.status === 'error' && (
            <p className="inline-note">
              We couldn’t reach the boutique just now. Make sure the PHP API is running
              (<code>php -S 127.0.0.1:8000 router.php</code>) and refresh.
            </p>
          )}

          {featured.status === 'ready' && (
            <div className="product-grid">
              {featured.items.map((product, index) => (
                <Reveal key={product.id} delay={index * 60}>
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          )}

          <div className="section-foot">
            <Link to="/shop" className="btn btn--ghost">
              View all 14 fragrances
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--tinted">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Find your family</span>
            <h2>Six olfactory families</h2>
            <p>Start with a mood rather than a note — the atelier can refine it from there.</p>
          </Reveal>

          <div className="family-grid">
            {families.status === 'loading' &&
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton skeleton--family" />
              ))}

            {families.status === 'ready' &&
              families.items.map((family, index) => (
                <Reveal key={family.slug} delay={index * 50}>
                  <Link
                    to={`/shop?family=${family.slug}`}
                    className="family-card"
                    style={{ '--accent': family.accent }}
                  >
                    <span className="family-card__initial" aria-hidden="true">
                      {family.name[0]}
                    </span>
                    <h3>{family.name}</h3>
                    <p>{family.description}</p>
                    <span className="family-card__count">{family.product_count} fragrances</span>
                  </Link>
                </Reveal>
              ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container story">
          <Reveal className="story__art">
            <div className="story__panel">
              <span className="story__monogram">ML</span>
              <p className="story__caption">
                The atelier on Rue des Fleurs — 340 m² of maceration tanks, oak shelves
                and, always, jasmine.
              </p>
            </div>
          </Reveal>

          <Reveal className="story__copy" delay={100}>
            <span className="eyebrow">Three generations</span>
            <h2>A house built on patience</h2>
            <p>
              Lumière began in 1998 with a single lavender cologne and a stubborn belief:
              that a fragrance should be composed, not manufactured. Every formula still
              macerates for eight weeks before it earns a label.
            </p>
            <p>
              We buy jasmine and rose from the same three families we did in 1998, and we
              still refuse synthetic musks where a natural will do.
            </p>

            <div className="stats">
              <div>
                <strong>27</strong>
                <span>years in Grasse</span>
              </div>
              <div>
                <strong>14</strong>
                <span>compositions in print</span>
              </div>
              <div>
                <strong>4.7</strong>
                <span>average rating</span>
              </div>
            </div>

            <Link to="/about" className="link-arrow">
              Read the full story →
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="section section--tinted">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">In their words</span>
            <h2>Worn and loved</h2>
          </Reveal>

          <div className="quote-grid">
            {TESTIMONIALS.map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 70} className="quote-card">
                <span className="quote-card__mark" aria-hidden="true">
                  “
                </span>
                <p>{testimonial.quote}</p>
                <footer>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.place}</span>
                </footer>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {heroProduct && (
        <section className="section">
          <div className="container spotlight">
            <Reveal className="spotlight__art" style={{ '--tint': heroProduct.colors.a }}>
              <PerfumeBottle colors={heroProduct.colors} label={initials(heroProduct.name)} animate />
            </Reveal>

            <Reveal className="spotlight__copy" delay={80}>
              <span className="eyebrow">Bottle of the month</span>
              <h2>{heroProduct.name}</h2>
              <p>{heroProduct.description}</p>
              <ul className="notes-inline">
                {heroProduct.notes.heart.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <p className="spotlight__price">{formatPrice(heroProduct.price)}</p>
              <Link to={`/products/${heroProduct.id}`} className="btn">
                Discover {heroProduct.name}
              </Link>
            </Reveal>
          </div>
        </section>
      )}
    </>
  )
}
