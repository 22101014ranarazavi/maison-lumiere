import { Link } from 'react-router-dom'
import PerfumeBottle from '../components/PerfumeBottle'
import Reveal from '../components/Reveal'

const VALUES = [
  {
    title: 'Naturals first',
    body: 'We start from raw materials — jasmine absolute from Grasse, Laotian oud, Sicilian bergamot — and use synthetics only where they outlast or outperform nature.',
  },
  {
    title: 'Small batches',
    body: 'Nothing is produced until it has macerated for eight weeks and been worn for a month by the atelier. We would rather run out than rush.',
  },
  {
    title: 'Honest pricing',
    body: 'No celebrity licence, no department-store markup. You pay for juice, glass and the hands that filled it.',
  },
]

const TIMELINE = [
  { year: '1998', text: 'Élise Marchand opens a one-room atelier with a lavender cologne and a second-hand still.' },
  { year: '2006', text: 'Nuit d’Or is composed for a friend’s wedding and never leaves the catalogue.' },
  { year: '2014', text: 'The house moves to Rue des Fleurs; the maceration hall holds forty oak tanks.' },
  { year: '2021', text: 'Second generation joins. Sustainability audit cuts packaging weight by 40%.' },
  { year: '2026', text: 'Fourteen compositions in print, shipped to 61 countries.' },
]

export default function About() {
  return (
    <div className="page">
      <div className="page-head page-head--tall">
        <div className="container">
          <span className="eyebrow">Grasse, Côte d’Azur</span>
          <h1>A house built on patience</h1>
          <p>
            Maison Lumière has been composing fragrance the slow way for twenty-seven
            years: naturals sourced by hand, formulas macerated for eight weeks, and no
            bottle released until the atelier has worn it for a month.
          </p>
        </div>
      </div>

      <section className="section">
        <div className="container story">
          <Reveal className="story__art">
            <div className="story__panel story__panel--alt">
              <PerfumeBottle colors={{ a: '#cbb9a2', b: '#6d5b45', shape: 'square' }} label="ML" animate />
            </div>
          </Reveal>

          <Reveal className="story__copy" delay={100}>
            <span className="eyebrow">The founder</span>
            <h2>“A perfume should be composed, not manufactured.”</h2>
            <p>
              Élise Marchand trained as a chemist in Montpellier before apprenticing with a
              perfumer in Grasse who insisted that every formula be tested on skin, not
              paper. That habit became the house method.
            </p>
            <p>
              Today her daughter Camille runs the lab, and the same three farming families
              still supply our jasmine, rose and iris. When a harvest is poor, we wait a
              year rather than substitute.
            </p>

            <div className="stats">
              <div>
                <strong>8</strong>
                <span>weeks of maceration</span>
              </div>
              <div>
                <strong>61</strong>
                <span>countries served</span>
              </div>
              <div>
                <strong>0</strong>
                <span>celebrity licences</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section section--tinted">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">What we stand for</span>
            <h2>Three rules, never broken</h2>
          </Reveal>

          <div className="value-grid">
            {VALUES.map((value, index) => (
              <Reveal key={value.title} className="value-card" delay={index * 70}>
                <span className="value-card__index">0{index + 1}</span>
                <h3>{value.title}</h3>
                <p>{value.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Reveal className="section-head section-head--left">
            <span className="eyebrow">Milestones</span>
            <h2>Twenty-seven years, five turning points</h2>
          </Reveal>

          <ol className="timeline">
            {TIMELINE.map((entry, index) => (
              <Reveal as="li" key={entry.year} delay={index * 50}>
                <span className="timeline__year">{entry.year}</span>
                <p>{entry.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container cta-band">
          <Reveal>
            <h2>Not sure where to begin?</h2>
            <p>
              Tell the concierge three fragrances you already love and we will send a
              shortlist — plus samples with your first order.
            </p>
            <div className="hero__actions">
              <Link to="/shop" className="btn btn--gold">
                Explore the collection
              </Link>
              <Link to="/contact" className="btn btn--ghost">
                Ask the concierge
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
