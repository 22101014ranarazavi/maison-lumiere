import { Link } from 'react-router-dom'
import PerfumeBottle from './PerfumeBottle'
import Stars from './Stars'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatPrice, initials } from '../lib/format'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { push } = useToast()

  const soldOut = product.stock <= 0
  const onSale = product.compare_at_price && product.compare_at_price > product.price

  const handleAdd = () => {
    addItem(product, 1)
    push(`${product.name} added to your bag.`)
  }

  return (
    <article className="product-card">
      <Link
        to={`/products/${product.id}`}
        className="product-card__art"
        style={{ '--tint': product.colors.a }}
        aria-label={`View ${product.name}`}
      >
        {product.featured && <span className="badge badge--featured">Signature</span>}
        {onSale && <span className="badge badge--sale">Sale</span>}
        {soldOut && <span className="badge badge--out">Sold out</span>}
        <PerfumeBottle colors={product.colors} label={initials(product.name)} />
      </Link>

      <div className="product-card__body">
        <span className="eyebrow eyebrow--small">{product.category.name}</span>
        <h3 className="product-card__name">
          <Link to={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <div className="product-card__meta">
          <Stars rating={product.rating} />
          <span className="product-card__size">{product.size_ml} ml</span>
        </div>
        <div className="product-card__footer">
          <p className="price">
            {formatPrice(product.price)}
            {onSale && <s className="price__was">{formatPrice(product.compare_at_price)}</s>}
          </p>
          <button
            type="button"
            className="btn btn--small"
            onClick={handleAdd}
            disabled={soldOut}
          >
            {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
    </article>
  )
}
