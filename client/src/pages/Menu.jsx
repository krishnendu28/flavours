import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';

const AREAS = ['Shapoorji', 'DLF', 'Elita', 'Newtown Heights', 'Patharghata'];

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (freq, startTime, duration, gainVal) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(gainVal, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    playBeep(880, ctx.currentTime, 0.15, 0.3);
    playBeep(1100, ctx.currentTime + 0.12, 0.15, 0.3);
    playBeep(1320, ctx.currentTime + 0.24, 0.25, 0.25);
    playBeep(1760, ctx.currentTime + 0.45, 0.3, 0.2);
  } catch (e) {}
}

function isItemAvailable(item, orderType) {
  const key = `available_${orderType}`;
  if (item[key] !== undefined) return !!item[key];
  return !!item.available;
}

export default function Menu() {
  const navigate = useNavigate();
  const { user, orderType, logout } = useAuth();
  const { on } = useSocket();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);
  const [block, setBlock] = useState('');
  const [area, setArea] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');
  const cartDrawerRef = useRef(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!orderType) { navigate('/'); return; }
    Promise.all([api.getCategories(), api.getMenuItems()])
      .then(([cats, allItems]) => {
        setCategories(cats);
        setItems(allItems);
        if (cats.length > 0) setActiveCategory(cats[0].id);
        setLoading(false);
      })
      .catch(err => { console.error('Menu API error:', err); setLoading(false); });
  }, [user, orderType]);

  useEffect(() => {
    const unsub1 = on('menu-updated', (updated) => {
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    });
    const unsub2 = on('menu-item-added', (item) => {
      setItems(prev => [...prev, item]);
    });
    const unsub3 = on('menu-item-deleted', ({ id }) => {
      setItems(prev => prev.filter(i => i.id !== id));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [on]);

  useEffect(() => {
    const handleClick = (e) => {
      if (cartDrawerRef.current && !cartDrawerRef.current.contains(e.target) && !e.target.closest('.cart-fab')) {
        setCartOpen(false);
      }
    };
    if (cartOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [cartOpen]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: orderType === 'delivery' ? item.price + 10 : item.price, basePrice: item.price, qty: 1 }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart(prev => {
      const updated = prev.map(c => c.id === itemId ? { ...c, qty: c.qty + delta } : c).filter(c => c.qty > 0);
      return updated;
    });
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const deliveryCharge = orderType === 'delivery' ? 20 : 0;

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory ? item.category_id === activeCategory : true;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const available = isItemAvailable(item, orderType);
    return matchesCategory && matchesSearch && available;
  });

  const placeOrder = async () => {
    if (orderType === 'delivery') {
      if (!block || !area || !flatNumber || !roomNumber) {
        setOrderError('Please fill in all delivery address fields');
        return;
      }
    }
    setOrderError('');
    setOrdering(true);
    try {
      const orderData = {
        user_id: user.id,
        order_type: orderType,
        items: cart.map(c => ({ menu_item_id: c.id, quantity: c.qty })),
        special_instructions: instructions,
      };
      if (orderType === 'delivery') {
        orderData.block = block;
        orderData.area = area;
        orderData.flat_number = flatNumber;
        orderData.room_number = roomNumber;
      }
      const order = await api.createOrder(orderData);
      playOrderSound();
      setPlacedOrderId(order.id);
      setShowSuccess(true);
      setCart([]);
      setCartOpen(false);
      setBlock(''); setArea(''); setFlatNumber(''); setRoomNumber(''); setInstructions('');
      localStorage.removeItem('flavours_cart');
    } catch (err) {
      setOrderError(err.message);
    }
    setOrdering(false);
  };

  if (showSuccess) {
    return (
      <div className="order-success-screen">
        <div className="order-success-bg" />
        <div className="order-success-card">
          <div className="success-checkmark">
            <div className="checkmark-circle">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          </div>
          <h2>Order Placed!</h2>
          <p className="success-msg">Your order has been received and is being prepared.</p>
          <div className="success-order-id">#{placedOrderId}</div>
          <button className="btn btn-primary success-btn" onClick={() => navigate(`/order/${placedOrderId}`)}>
            Track Your Order
          </button>
          <button className="btn btn-ghost success-btn-ghost" onClick={() => { setShowSuccess(false); navigate('/'); }}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading"><div className="spinner" />Loading menu...</div>;

  const typeLabels = { dine_in: 'Dine In', takeaway: 'Takeaway', delivery: 'Delivery' };
  const typeIcons = { dine_in: '🍽', takeaway: '📦', delivery: '🛵' };

  return (
    <div className="menu-page">
      <header className="header">
        <div className="header-inner">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            Flavours <span className="logo-accent">BOB</span>
          </div>
          <div className="header-nav">
            <button onClick={() => navigate('/orders')} style={{ fontSize: 14 }}>My Orders</button>
            <span className="user-badge">
              <strong>{user?.name}</strong>
            </span>
            <button onClick={logout}>Logout</button>
          </div>
        </div>
      </header>

      <div className="menu-hero-bar">
        <div className="menu-hero-inner">
          <span className="order-type-badge">
            {typeIcons[orderType]} {typeLabels[orderType]}
          </span>
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search our menu..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="menu-content">
        <div className="categories-scroll">
          {categories.map(cat => {
            const count = items.filter(i => i.category_id === cat.id && isItemAvailable(i, orderType)).length;
            if (count === 0) return null;
            return (
              <button key={cat.id} className={`cat-chip ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setActiveCategory(cat.id); setSearch(''); }}>
                {cat.name} ({count})
              </button>
            );
          })}
          <button
            className={`cat-chip ${activeCategory === null ? 'active' : ''}`}
            onClick={() => { setActiveCategory(null); setSearch(''); }}
          >
            All ({items.filter(i => isItemAvailable(i, orderType)).length})
          </button>
        </div>

        <div className="menu-grid">
          {filteredItems.map(item => {
            const cartItem = cart.find(c => c.id === item.id);
            const displayPrice = orderType === 'delivery' ? item.price + 10 : item.price;

            return (
              <div key={item.id} className="menu-item-card">
                {item.image_url && (
                  <img className="menu-item-image" src={item.image_url} alt={item.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
                )}
                <div className="menu-item-body">
                  <div className="menu-item-top">
                    <div className="menu-item-name">{item.name}</div>
                    <div className="menu-item-price">
                      ₹{displayPrice}
                      {orderType === 'delivery' && (
                        <span className="original">₹{item.price}</span>
                      )}
                    </div>
                  </div>
                  {item.description && <div className="menu-item-desc">{item.description}</div>}
                  {orderType === 'delivery' && (
                    <div className="menu-item-delivery-note">+₹10 delivery markup</div>
                  )}
                  <div className="menu-item-actions">
                    {cartItem ? (
                      <>
                        <div className="quantity-control">
                          <button onClick={() => updateQty(item.id, -1)}>−</button>
                          <span className="qty">{cartItem.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                        <span style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 700 }}>₹{cartItem.price * cartItem.qty}</span>
                      </>
                    ) : (
                      <button className="add-btn" onClick={() => addToCart(item)}>Add to Cart</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredItems.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🍽</div>
              <p>No items available for {typeLabels[orderType]} in this category</p>
            </div>
          )}
        </div>
      </div>

      {cartCount > 0 && (
        <div className="cart-fab" onClick={() => setCartOpen(true)}>
          <span className="cart-fab-icon">🛒</span>
          <span className="cart-fab-count">{cartCount}</span>
          <span className="cart-fab-total">₹{cartTotal + deliveryCharge}</span>
        </div>
      )}

      {cartOpen && <div className="cart-drawer-backdrop" onClick={() => setCartOpen(false)} />}

      <div className={`cart-drawer ${cartOpen ? 'open' : ''}`} ref={cartDrawerRef}>
        <div className="cart-drawer-header">
          <h3>Your Order</h3>
          <button className="cart-drawer-close" onClick={() => setCartOpen(false)}>✕</button>
        </div>

        <div className="cart-drawer-items">
          {cart.length === 0 ? (
            <div className="cart-drawer-empty">
              <span>🛒</span>
              <p>Your cart is empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="cart-drawer-item">
              <div className="cart-drawer-item-info">
                <div className="cart-drawer-item-name">{item.name}</div>
                <div className="cart-drawer-item-price">₹{item.price} × {item.qty} = ₹{item.price * item.qty}</div>
              </div>
              <div className="quantity-control quantity-control-sm">
                <button onClick={() => updateQty(item.id, -1)}>−</button>
                <span className="qty">{item.qty}</span>
                <button onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-drawer-summary">
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span>₹{cartTotal}</span>
              </div>
              {deliveryCharge > 0 && (
                <div className="cart-summary-row">
                  <span>Delivery Charge</span>
                  <span>₹{deliveryCharge}</span>
                </div>
              )}
              {orderType === 'delivery' && (
                <div className="delivery-note">₹10 per item markup added for delivery</div>
              )}
              <div className="cart-summary-row total">
                <span>Total</span>
                <span className="price">₹{cartTotal + deliveryCharge}</span>
              </div>
            </div>

            {orderType === 'delivery' && (
              <div className="cart-drawer-address">
                <h4>Delivery Address</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Block</label>
                    <input type="text" className="form-input" placeholder="e.g. C Block" value={block} onChange={e => setBlock(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Area</label>
                    <select className="area-select" value={area} onChange={e => setArea(e.target.value)}>
                      <option value="">Select Area</option>
                      {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Flat Number</label>
                    <input type="text" className="form-input" placeholder="Flat number" value={flatNumber} onChange={e => setFlatNumber(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Room Number</label>
                    <input type="text" className="form-input" placeholder="Room number" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Special Instructions</label>
              <textarea className="special-instructions" placeholder="Any special requests..." value={instructions} onChange={e => setInstructions(e.target.value)} />
            </div>

            {orderError && <div className="cart-drawer-error">{orderError}</div>}

            <button className="btn btn-primary" disabled={ordering || cart.length === 0} onClick={placeOrder}>
              {ordering ? 'Placing Order...' : `Place Order — ₹${cartTotal + deliveryCharge}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
