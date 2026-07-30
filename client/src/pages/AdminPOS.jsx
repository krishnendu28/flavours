import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';
import useOrderBuzzer from '../hooks/useOrderBuzzer';

function printKOT(order) {
  const kotWindow = window.open('', '_blank', 'width=400,height=600');
  if (!kotWindow) { alert('Please allow popups to print KOT'); return; }
  const itemsHTML = order.items.map(item => `
    <div class="kot-item">
      <div class="kot-item-left">
        <span class="kot-qty">${item.quantity}×</span>
        <span class="kot-name">${item.name}</span>
      </div>
      <span class="kot-price">₹${item.price * item.quantity}</span>
    </div>
  `).join('');
  kotWindow.document.write(`<!DOCTYPE html>
<html><head><title>KOT - ${order.id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',monospace;padding:16px;width:300px;background:#fff}
.kot-header{text-align:center;border-bottom:2px dashed #333;padding-bottom:10px;margin-bottom:10px}
.kot-title{font-size:20px;font-weight:bold;letter-spacing:2px}
.kot-subtitle{font-size:11px;color:#666;margin-top:2px}
.kot-info{border-bottom:1px dashed #ccc;padding-bottom:8px;margin-bottom:8px}
.kot-info-row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px}
.kot-info-label{color:#666}
.kot-info-value{font-weight:bold}
.kot-items{margin:10px 0}
.kot-item{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px dotted #ddd}
.kot-item-left{display:flex;gap:8px}
.kot-qty{font-weight:bold;min-width:24px}
.kot-total{border-top:2px dashed #333;margin-top:10px;padding-top:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:bold}
.kot-footer{text-align:center;margin-top:12px;font-size:10px;color:#999;border-top:1px dashed #ccc;padding-top:8px}
.kot-instructions{margin-top:8px;padding:6px 8px;background:#f5f5f5;border-left:3px solid #333;font-size:11px}
@media print{body{padding:8px}}
</style></head><body>
<div class="kot-header">
<div class="kot-title">FLAVOURS BOB</div>
<div class="kot-subtitle">Kitchen Order Token</div></div>
<div class="kot-info">
<div class="kot-info-row"><span class="kot-info-label">Order:</span><span class="kot-info-value">#${order.id}</span></div>
${order.kot_number ? `<div class="kot-info-row"><span class="kot-info-label">KOT:</span><span class="kot-info-value">#${order.kot_number}</span></div>` : ''}
<div class="kot-info-row"><span class="kot-info-label">Type:</span><span class="kot-info-value">${order.order_type.replace('_',' ').toUpperCase()}</span></div>
${order.table_number ? `<div class="kot-info-row"><span class="kot-info-label">Table:</span><span class="kot-info-value">${order.table_number}</span></div>` : ''}
${order.guest_name ? `<div class="kot-info-row"><span class="kot-info-label">Guest:</span><span class="kot-info-value">${order.guest_name}</span></div>` : ''}
<div class="kot-info-row"><span class="kot-info-label">Time:</span><span class="kot-info-value">${new Date(order.created_at).toLocaleTimeString()}</span></div></div>
<div class="kot-items">${itemsHTML}</div>
<div class="kot-total"><span>TOTAL</span><span>₹${order.total_amount}</span></div>
${order.special_instructions ? `<div class="kot-instructions"><strong>Note:</strong> ${order.special_instructions}</div>` : ''}
<div class="kot-footer">Flavours BOB - Battle of Buds</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`);
  kotWindow.document.close();
}

export default function AdminPOS() {
  const navigate = useNavigate();
  const { on } = useSocket();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine_in');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const searchRef = useRef(null);

  useEffect(() => {
    const admin = localStorage.getItem('flavours_admin');
    if (!admin) { navigate('/admin/login'); return; }
    Promise.all([api.getCategories(), api.getMenuItems()])
      .then(([cats, allItems]) => {
        setCategories(cats);
        setItems(allItems);
        if (cats.length > 0) setActiveCategory(cats[0].id);
        setLoading(false);
      })
      .catch(err => { console.error('POS API error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsub1 = on('menu-updated', (updated) => setItems(prev => prev.map(i => i.id === updated.id ? updated : i)));
    const unsub2 = on('menu-item-added', (item) => setItems(prev => [...prev, item]));
    const unsub3 = on('menu-item-deleted', ({ id }) => setItems(prev => prev.filter(i => i.id !== id)));
    const unsub4 = on('new-order', (order) => { if (order.status === 'pending') setPendingCount(prev => prev + 1); });
    const unsub5 = on('order-updated', (updated) => { if (updated.status !== 'pending') setPendingCount(prev => Math.max(0, prev - 1)); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [on]);

  const { alertOrder, handleAccept, handleDismissAlert } = useOrderBuzzer();

  const filteredItems = items.filter(item => {
    const matchCat = activeCategory ? item.category_id === activeCategory : true;
    const q = search.trim();
    const matchSearch = !q || item.name.toLowerCase().includes(q.toLowerCase()) || String(item.code).includes(q);
    return matchCat && matchSearch && item.available;
  });

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, image_url: item.image_url }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart(prev => prev.map(c => c.id === itemId ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeItem = (itemId) => {
    setCart(prev => prev.filter(c => c.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      const orderData = {
        order_type: orderType,
        items: cart.map(c => ({ menu_item_id: c.id, quantity: c.qty })),
        special_instructions: instructions || null,
        guest_name: customerName || null,
      };
      const order = await api.createPosOrder(orderData);
      setLastOrder(order);
      try { printKOT(order); } catch (e) { console.warn('KOT print failed', e); }
      setCart([]);
      setCustomerName('');
      setPhone('');
      setInstructions('');
      setShowConfirm(true);
    } catch (err) {
      alert(err.message);
    }
    setOrdering(false);
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading POS...</div>;

  const navBtn = (icon, label, path, active, badge) => (
    <button className={`admin-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}>
      {icon} {label}
      {badge != null && <span className={`nav-badge ${badge === 0 ? 'zero' : ''}`}>{badge}</span>}
    </button>
  );

  const cartItemQty = (id) => cart.find(c => c.id === id)?.qty || 0;

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h2>Flavours <span style={{ color: 'var(--accent)' }}>BOB</span></h2>
          <span>Admin Panel</span>
        </div>
        {navBtn('📊', 'Dashboard', '/admin', false, pendingCount)}
        {navBtn('🧾', 'POS & Billing', '/admin/pos', true)}
        {navBtn('📝', 'Live Orders', '/admin/orders', false, pendingCount)}
        {navBtn('🍳', 'Kitchen Display', '/admin/kitchen')}
        <button className="admin-nav-item" onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }} style={{ marginTop: 'auto' }}>🚪 Logout</button>
      </aside>

      <main className="admin-main pos-main">
        <div className="pos-header-bar">
          <div className="pos-header-left">
              <select className="pos-store-select">
              <option>Flavours BOB - Main Store</option>
            </select>
          </div>
          <div className="pos-live-indicator">
            <span className="pos-live-dot"></span>
            Live Server
          </div>
        </div>

        <div className="pos-body">
          {/* ─── MIDDLE: Menu Panel ────────────────────────── */}
          <div className="pos-menu-panel">
            <div className="pos-cat-bar">
              <button className={`pos-cat-btn ${activeCategory === null ? 'active' : ''}`} onClick={() => setActiveCategory(null)}>All</button>
              {categories.map(cat => {
                const count = items.filter(i => i.category_id === cat.id && i.available).length;
                if (count === 0) return null;
                return (
                  <button key={cat.id} className={`pos-cat-btn ${activeCategory === cat.id ? 'active' : ''}`} onClick={() => setActiveCategory(cat.id)}>
                    {cat.name}
                  </button>
                );
              })}
            </div>

            <div className="pos-search-bar">
              <input ref={searchRef} type="text" placeholder="Search in menu" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="pos-menu-grid">
              {filteredItems.map(item => {
                const inCart = cartItemQty(item.id);
                return (
                  <div key={item.id} style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, cursor: 'pointer', padding: '14px 16px', transition: 'all 0.2s ease', position: 'relative' }} onClick={() => inCart === 0 && addToCart(item)}>
                    <div style={{ position: 'absolute', top: 8, left: 8, background: '#1a1a2e', color: '#fff', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, lineHeight: '20px' }}>{item.code}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 12, lineHeight: 1.3, paddingLeft: 32 }}>{item.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, fontSize: 14, fontWeight: 700, color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>Rs {item.price}</span>
                      {inCart === 0 ? (
                        <button style={{ padding: '8px 22px', borderRadius: 100, background: '#059669', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }} onClick={(e) => { e.stopPropagation(); addToCart(item); }}>Add</button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                          <button style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#374151', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => updateQty(item.id, -1)}>−</button>
                          <span style={{ minWidth: 36, textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#059669', background: '#fff', height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{inCart}</span>
                          <button style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', color: '#374151', fontSize: 18, fontWeight: 600, border: 'none', cursor: 'pointer' }} onClick={() => updateQty(item.id, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredItems.length === 0 && <div className="pos-no-items">No items found</div>}
            </div>
          </div>

          {/* ─── RIGHT: Cart Panel ─────────────────────────── */}
          <div className="pos-cart-panel">
            <div className="pos-cart-header">
              <h3>New Order</h3>
              <div className="pos-order-toggles">
                <button className={`pos-order-tog ${orderType === 'dine_in' ? 'active' : ''}`} onClick={() => setOrderType('dine_in')}>Dine-in</button>
                <button className={`pos-order-tog ${orderType === 'takeaway' ? 'active' : ''}`} onClick={() => setOrderType('takeaway')}>Takeaway</button>
                <button className={`pos-order-tog ${orderType === 'delivery' ? 'active' : ''}`} onClick={() => setOrderType('delivery')}>Delivery</button>
              </div>
            </div>

            <div className="pos-customer-fields">
              <input className="pos-cust-input" placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              <input className="pos-cust-input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className="pos-cart-items">
              {cart.length === 0 ? (
                <div className="pos-cart-empty">
                  <div className="pos-cart-empty-icon">🛒</div>
                  <p>Tap on items to add them here</p>
                </div>
              ) : cart.map(item => (
                <div key={item.id} className="pos-cart-item">
                  {item.image_url && <div className="pos-cart-item-img" style={{ backgroundImage: `url(${item.image_url})` }} />}
                  <div className="pos-cart-item-info">
                    <div className="pos-cart-item-name">{item.name}</div>
                    <div className="pos-cart-item-price">₹{item.price} each</div>
                  </div>
                  <div className="pos-cart-item-qty">
                    <button onClick={() => updateQty(item.id, -1)}>−</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>
                  <div className="pos-cart-item-line">₹{item.price * item.qty}</div>
                  <button className="pos-cart-item-del" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              ))}
            </div>

            <div className="pos-cart-summary">
              <div className="pos-summary-row"><span>Subtotal</span><span>₹{cartTotal}</span></div>
              <div className="pos-summary-row total"><span>Total</span><span>₹{cartTotal}</span></div>
              {cart.length > 0 && (
                <textarea className="pos-instructions" placeholder="Instructions for kitchen..." value={instructions} onChange={e => setInstructions(e.target.value)} />
              )}
            </div>

            {cart.length > 0 && (
              <div className="pos-cart-actions">
                <button className="pos-btn-ebill" disabled={ordering} onClick={placeOrder}>
                  🖨️ Save & Print E-Bill
                </button>
                <button className="pos-btn-place" disabled={ordering} onClick={placeOrder}>
                  {ordering ? '⏳ Placing Order...' : '🧾 Place Bill + Order — ₹' + cartTotal}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {showConfirm && lastOrder && (
        <div className="pos-confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="pos-confirm-card" onClick={e => e.stopPropagation()}>
            <div className="pos-confirm-check">✅</div>
            <h3>Order Placed!</h3>
            <div className="pos-confirm-id">Order #{lastOrder.id}</div>
            {lastOrder.kot_number && <div className="pos-confirm-kot">KOT #{lastOrder.kot_number}</div>}
            <div className="pos-confirm-total">₹{lastOrder.total_amount}</div>
            <div className="pos-confirm-sub">{lastOrder.items.length} items • {lastOrder.order_type.replace('_', ' ')}</div>
            <button className="pos-btn-reprint" onClick={() => printKOT(lastOrder)}>🖨️ Reprint KOT</button>
            <button className="pos-btn-done" onClick={() => setShowConfirm(false)}>More Orders</button>
            <button className="pos-btn-link" onClick={() => { setShowConfirm(false); navigate('/admin'); }}>Go to Home</button>
          </div>
        </div>
      )}

      {alertOrder && (
        <div className="order-alert-overlay">
          <div className="order-alert-card">
            <div className="buzzer-icon">🔔</div>
            <h3>New Order!</h3>
            <div className="order-info">
              <div className="order-info-row">
                <span>Order ID</span>
                <span style={{ fontWeight: 700 }}>#{alertOrder.id}</span>
              </div>
              <div className="order-info-row">
                <span>Customer</span>
                <span>{alertOrder.user_name}</span>
              </div>
              <div className="order-info-row">
                <span>Phone</span>
                <span>{alertOrder.user_phone}</span>
              </div>
              <div className="order-info-row">
                <span>Type</span>
                <span style={{ textTransform: 'capitalize' }}>{alertOrder.order_type.replace('_', ' ')}</span>
              </div>
              <div className="order-info-row">
                <span>Source</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{alertOrder.source || 'online'}</span>
              </div>
              {alertOrder.table_number && (
                <div className="order-info-row">
                  <span>Table</span>
                  <span>{alertOrder.table_number}</span>
                </div>
              )}
              <div className="order-info-row">
                <span>Items</span>
                <span>{alertOrder.items.length} items</span>
              </div>
              {alertOrder.area && (
                <div className="order-info-row">
                  <span>Address</span>
                  <span>{alertOrder.block}, {alertOrder.area}, Flat {alertOrder.flat_number}, Room {alertOrder.room_number}</span>
                </div>
              )}
              <div className="order-info-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                <span style={{ fontWeight: 700 }}>Total</span>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 18 }}>₹{alertOrder.total_amount}</span>
              </div>
            </div>
            <div className="order-alert-actions">
              <button className="btn btn-success" onClick={() => handleAccept(alertOrder.id)}>
                ✅ Accept Order
              </button>
              <button className="btn btn-secondary" onClick={handleDismissAlert}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-admin-nav">
        <button onClick={() => navigate('/admin')}><span className="icon">📊</span>Dashboard</button>
        <button className="active" onClick={() => navigate('/admin/pos')}><span className="icon">🧾</span>POS</button>
        <button onClick={() => navigate('/admin/orders')}><span className="icon">📝</span>Orders</button>
        <button onClick={() => navigate('/admin/kitchen')}><span className="icon">🍳</span>Kitchen</button>
        <button onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}><span className="icon">🚪</span>Logout</button>
      </nav>
    </div>
  );
}
