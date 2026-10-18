export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state-block">
      <span className="state-block__glyph" aria-hidden="true">
        !
      </span>
      <h3>We couldn’t load this page</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--ghost" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
