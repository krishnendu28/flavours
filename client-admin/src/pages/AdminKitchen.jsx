import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';
import useOrderBuzzer from '../hooks/useOrderBuzzer';

const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };

export default function AdminKitchen() {
  const navigate = useNavigate();
  const { joinKitchen, on } = useSocket();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  useEffect(() => {
    const admin = localStorage.getItem('flavours_admin');
    if (!admin) { navigate('/admin/login'); return; }

    joinKitchen();

    api.getAllOrders().then(allOrders => {
      setOrders(allOrders);
      setLoading(false);
    }).catch(err => { console.error('Kitchen API error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsub1 = on('kitchen-new-order', (order) => {
      setOrders(prev => [order, ...prev]);
    });
    const unsub2 = on('kitchen-order-updated', (updated) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });
    return () => { unsub1(); unsub2(); };
  }, [on]);

  const { alertOrder, handleAccept, handleDismissAlert } = useOrderBuzzer();

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'active') return ['accepted', 'preparing'].includes(o.status);
    if (filter === 'new') return o.status === 'pending';
    return true;
  });

  const newCount = orders.filter(o => o.status === 'pending').length;
  const activeCount = orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length;

  if (loading) return <div className="loading"><div className="spinner"></div>Loading kitchen display...</div>;

  const pendingCount = orders.filter(o => o.status === 'pending').length;

  const navBtn = (icon, label, path, active, badge) => (
    <button className={`admin-nav-item ${active ? 'active' : ''}`} onClick={() => navigate(path)}>
      {icon} {label}
      {badge != null && <span className={`nav-badge ${badge === 0 ? 'zero' : ''}`}>{badge}</span>}
    </button>
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h2>Flavours <span style={{ color: 'var(--accent)' }}>BOB</span></h2>
          <span>Kitchen Display</span>
        </div>
        {navBtn('📊', 'Dashboard', '/admin', false, pendingCount)}
        {navBtn('🧾', 'POS & Billing', '/admin/pos')}
        {navBtn('📝', 'Live Orders', '/admin/orders', false, pendingCount)}
        {navBtn('🍳', 'Kitchen Display', '/admin/kitchen', true)}
        <button className="admin-nav-item" onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}>🚪 Logout</button>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <h1>🍳 Kitchen Display</h1>
          <div style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <span style={{ color: 'var(--warning)' }}>🔔 {newCount} new</span>
            <span style={{ color: 'var(--accent)' }}>🔥 {activeCount} active</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button className={`cat-chip ${filter === 'active' ? 'active' : ''}`} onClick={() => setFilter('active')}>
            🔥 Active ({activeCount})
          </button>
          <button className={`cat-chip ${filter === 'new' ? 'active' : ''}`} onClick={() => setFilter('new')}>
            🆕 New ({newCount})
          </button>
          <button className={`cat-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All ({orders.length})
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🍳</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontStyle: 'italic', marginBottom: 8 }}>Kitchen is clear!</h3>
            <p>No orders to prepare right now.</p>
          </div>
        ) : (
          <div className="kds-grid">
            {filteredOrders.map(order => {
              const isNew = order.status === 'pending';
              const isActive = order.status === 'accepted' || order.status === 'preparing';
              const cardClass = `kds-card ${isNew ? 'kds-new' : ''} ${isActive ? 'kds-active' : ''}`;

              const timeSince = () => {
                const diff = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 1000);
                const mins = Math.floor(diff / 60);
                if (mins < 1) return `${diff}s`;
                return `${mins}m`;
              };

              return (
                <div key={order.id} className={cardClass}>
                  <div className="kds-card-header">
                    <div>
                      <span className="kds-order-id">#{order.id}</span>
                      {order.kot_number && <span className="kds-kot">KOT #{order.kot_number}</span>}
                    </div>
                    <div className="kds-meta">
                      <span className="kds-type">{order.order_type.replace('_', ' ')}</span>
                      <span className="kds-time">{timeSince()}</span>
                    </div>
                  </div>

                  {order.source === 'pos' && order.table_number && (
                    <div className="kds-table">Table {order.table_number}{order.guest_name ? ` — ${order.guest_name}` : ''}</div>
                  )}

                  {order.user_name && order.source === 'online' && (
                    <div className="kds-customer">{order.user_name}</div>
                  )}

                  <div className="kds-items">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="kds-item">
                        <span className="kds-item-qty">{item.quantity}×</span>
                        <span className="kds-item-name">{item.name}</span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="kds-instructions">💬 {order.special_instructions}</div>
                  )}

                  <div className="kds-actions">
                    <span className={`order-status-badge ${order.status}`} style={{ fontSize: 13 }}>{STATUS_LABELS[order.status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

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
        <button onClick={() => navigate('/admin/pos')}><span className="icon">🧾</span>POS</button>
        <button onClick={() => navigate('/admin/orders')}><span className="icon">📝</span>Orders</button>
        <button className="active" onClick={() => navigate('/admin/kitchen')}><span className="icon">🍳</span>Kitchen</button>
        <button onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}><span className="icon">🚪</span>Logout</button>
      </nav>
    </div>
  );
}
