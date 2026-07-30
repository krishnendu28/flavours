import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';
import useOrderBuzzer from '../hooks/useOrderBuzzer';

const STATUSES = ['pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled'];
const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };

export default function AdminOrders() {
  const navigate = useNavigate();
  const { joinAdmin, on } = useSocket();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const admin = localStorage.getItem('flavours_admin');
    if (!admin) { navigate('/admin/login'); return; }

    joinAdmin();
    api.getAllOrders().then(o => { setOrders(o); setLoading(false); }).catch(err => { console.error('Orders API error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    return on('new-order', (order) => {
      setOrders(prev => [order, ...prev]);
    });
  }, [on]);

  useEffect(() => {
    return on('order-updated', (updated) => {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
    });
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

  const filteredOrders = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading orders...</div>;

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
          <span>Admin Panel</span>
        </div>
        {navBtn('📊', 'Dashboard', '/admin', false, pendingCount)}
        {navBtn('🧾', 'POS & Billing', '/admin/pos')}
        {navBtn('📝', 'Live Orders', '/admin/orders', true, pendingCount)}
        {navBtn('🍳', 'Kitchen Display', '/admin/kitchen')}
        <button className="admin-nav-item" onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}>🚪 Logout</button>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <h1>Live Orders</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {orders.filter(o => o.status === 'pending').length} pending
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 8 }}>
          <button className={`cat-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All ({orders.length})</button>
          <button className={`cat-chip ${filter === 'accepted' ? 'active' : ''}`} onClick={() => setFilter('accepted')}>
            Accepted ({orders.filter(o => o.status === 'accepted').length})
          </button>
          <button className={`cat-chip ${filter === 'cancelled' ? 'active' : ''}`} onClick={() => setFilter('cancelled')}>
            Cancelled ({orders.filter(o => o.status === 'cancelled').length})
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
            <p>No orders found</p>
          </div>
        ) : (
          <div className="order-cards">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-card" style={{ borderLeftColor: order.status === 'pending' ? 'var(--warning)' : undefined, borderLeftWidth: order.status === 'pending' ? 3 : undefined }}>
                <div className="order-card-header">
                  <div>
                    <div className="order-card-id">
                      #{order.id}
                      {order.source === 'pos' && <span className="pos-badge">POS</span>}
                      {order.kot_number && <span className="kot-badge">KOT #{order.kot_number}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {order.user_name} • {order.user_phone}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`order-type-badge-sm`}>{order.order_type.replace('_', ' ')}</span>
                    <span className={`order-status-badge ${order.status}`}>{STATUS_LABELS[order.status]}</span>
                  </div>
                </div>

                {order.table_number && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    🪑 Table {order.table_number}{order.guest_name ? ` — ${order.guest_name}` : ''}
                  </div>
                )}

                <div className="order-card-items">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="order-card-item">
                      <span>{item.name} x {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {order.delivery_charge > 0 && (
                    <div className="order-card-item">
                      <span>Delivery Charge</span>
                      <span>₹{order.delivery_charge}</span>
                    </div>
                  )}
                </div>

                {order.area && (
                  <div className="order-card-address">
                    📍 {order.block}, {order.area}, Flat {order.flat_number}, Room {order.room_number}
                  </div>
                )}

                {order.special_instructions && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    💬 {order.special_instructions}
                  </div>
                )}

                <div className="order-card-footer">
                  <div>
                    <span className="order-card-total">₹{order.total_amount}</span>
                    <span className="order-card-time" style={{ marginLeft: 12 }}>
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="order-card-actions">
                    {order.status === 'pending' && (
                      <>
                        <button className="btn btn-sm btn-success" onClick={() => handleStatusChange(order.id, 'accepted')}>
                          ✅ Accept
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(order.id, 'cancelled')}>
                          Cancel
                        </button>
                      </>
                    )}
                    {order.status === 'cancelled' && <span style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>Cancelled</span>}
                    {order.status !== 'pending' && order.status !== 'cancelled' && (
                      <span className={`order-status-badge ${order.status}`}>{STATUS_LABELS[order.status]}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
        <button className="active" onClick={() => navigate('/admin/orders')}><span className="icon">📝</span>Orders</button>
        <button onClick={() => navigate('/admin/kitchen')}><span className="icon">🍳</span>Kitchen</button>
        <button onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}><span className="icon">🚪</span>Logout</button>
      </nav>
    </div>
  );
}
