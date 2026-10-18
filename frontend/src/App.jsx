import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import AdminApp from './admin/AdminApp'
import CartDrawer from './components/CartDrawer'
import ChatWidget from './components/ChatWidget'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import ToastStack from './components/ToastStack'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import About from './pages/About'
import CartPage from './pages/CartPage'
import Checkout from './pages/Checkout'
import Contact from './pages/Contact'
import GuidePage from './pages/GuidePage'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import ProductDetail from './pages/ProductDetail'
import Shop from './pages/Shop'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

/** The customer-facing shop: navigation, pages, cart drawer and toasts. */
function Storefront() {
  return (
    <>
      <Navbar />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/fragrances/:id/guide" element={<GuidePage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <CartDrawer />
      <ChatWidget />
      <ToastStack />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CartProvider>
          <ScrollToTop />

          <Routes>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/*" element={<Storefront />} />
          </Routes>
        </CartProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
