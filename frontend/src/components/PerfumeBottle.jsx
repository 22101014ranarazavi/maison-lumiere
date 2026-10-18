import { useId } from 'react'

const BODIES = {
  round: { type: 'rect', x: 58, y: 62, width: 84, height: 158, rx: 34 },
  square: { type: 'rect', x: 52, y: 70, width: 96, height: 150, rx: 8 },
  tall: { type: 'rect', x: 68, y: 56, width: 64, height: 172, rx: 16 },
}

/**
 * The shop renders every fragrance as a parametric SVG bottle, tinted from the
 * product's colour palette in the database. No image assets required.
 */
export default function PerfumeBottle({ colors, label = 'ML', className = '', animate = false }) {
  const uid = useId().replace(/:/g, '')
  const { a = '#d9c3a5', b = '#8a6f4d', shape = 'round' } = colors || {}

  const gradient = `bottle-grad-${uid}`
  const sheen = `bottle-sheen-${uid}`

  return (
    <svg
      viewBox="0 0 200 260"
      className={`bottle ${animate ? 'bottle--animate' : ''} ${className}`.trim()}
      role="img"
      aria-label="Perfume bottle illustration"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* soft shadow */}
      <ellipse cx="100" cy="234" rx="56" ry="9" fill="#211d18" opacity="0.09" />

      {/* cap + collar */}
      <rect x="84" y="18" width="32" height="26" rx="5" fill={b} />
      <rect x="84" y="18" width="12" height="26" rx="5" fill="#ffffff" opacity="0.14" />
      <rect x="90" y="42" width="20" height="16" rx="2" fill={b} opacity="0.75" />

      {/* body */}
      {shape === 'faceted' ? (
        <>
          <polygon points="100,58 142,76 142,212 58,212 58,76" fill={`url(#${gradient})`} />
          <polygon points="100,58 142,76 142,212 100,212" fill="#211d18" opacity="0.12" />
          <polygon points="100,58 142,76 100,94 58,76" fill="#ffffff" opacity="0.18" />
        </>
      ) : (
        <rect {...BODIES[shape] || BODIES.round} fill={`url(#${gradient})`} />
      )}

      {/* glass sheen */}
      <rect x="64" y="70" width="16" height="140" rx="8" fill={`url(#${sheen})`} />

      {/* label */}
      <rect x="76" y="124" width="48" height="52" rx="3" fill="#faf6ee" opacity="0.94" />
      <rect x="82" y="132" width="36" height="1.5" fill={b} opacity="0.6" />
      <text
        x="100"
        y="156"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontSize="20"
        letterSpacing="1.5"
        fill={b}
      >
        {label}
      </text>
      <rect x="82" y="164" width="36" height="1.5" fill={b} opacity="0.6" />
    </svg>
  )
}
