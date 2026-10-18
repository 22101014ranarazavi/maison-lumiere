const LABELS = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  cancelled: 'Cancelled',
}

export default function StatusBadge({ status }) {
  return <span className={`status status--${status}`}>{LABELS[status] ?? status}</span>
}
