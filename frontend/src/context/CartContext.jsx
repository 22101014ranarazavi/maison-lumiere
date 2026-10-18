import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'maison_lumiere_cart_v1'
const MAX_PER_LINE = 10

function loadStoredItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadStoredItems)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable (private mode) — cart simply won't persist */
    }
  }, [items])

  const addItem = useCallback((product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.id === product.id)

      if (existing) {
        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_PER_LINE) }
            : item,
        )
      }

      return [
        ...current,
        {
          id: product.id,
          name: product.name,
          house: product.house,
          price: Number(product.price),
          size_ml: product.size_ml,
          colors: product.colors,
          quantity: Math.min(quantity, MAX_PER_LINE),
        },
      ]
    })

    setIsDrawerOpen(true)
  }, [])

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity < 1) {
      setItems((current) => current.filter((item) => item.id !== id))
      return
    }

    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, quantity: Math.min(quantity, MAX_PER_LINE) } : item)),
    )
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const count = items.reduce((sum, item) => sum + item.quantity, 0)

    return {
      items,
      count,
      subtotal,
      shipping: subtotal >= 150 || subtotal === 0 ? 0 : 12,
      total: subtotal === 0 ? 0 : subtotal + (subtotal >= 150 ? 0 : 12),
      isDrawerOpen,
      openDrawer: () => setIsDrawerOpen(true),
      closeDrawer: () => setIsDrawerOpen(false),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }
  }, [items, isDrawerOpen, addItem, removeItem, updateQuantity, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used inside a <CartProvider>')
  }

  return context
}
