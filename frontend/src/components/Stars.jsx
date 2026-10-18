export default function Stars({ rating = 0, count, className = '' }) {
  const rounded = Math.round(rating)

  return (
    <span className={`stars ${className}`.trim()} title={`${rating} out of 5`}>
      <span aria-hidden="true">
        {'★'.repeat(rounded)}
        <span className="stars__empty">{'★'.repeat(5 - rounded)}</span>
      </span>
      <span className="stars__value">
        {Number(rating).toFixed(1)}
        {typeof count === 'number' && <span className="stars__count"> ({count})</span>}
      </span>
    </span>
  )
}
