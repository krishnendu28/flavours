import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const STATUS_LABELS = { pending: 'Pending', accepted: 'Accepted', preparing: 'Preparing', ready: 'Ready', completed: 'Completed', cancelled: 'Cancelled' };

function playReorderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const { user, orderType } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user) return;
    api.getUserOrders(user.id).then(o => {
      setOrders(o);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const reorder = (order) => {
    playReorderSound();
    localStorage.setItem('flavours_reorder', JSON.stringify({
      items: order.items.map(i => ({ menu_item_id: i.menu_item_id, name: i.name, qty: i.quantity, price: i.price })),
      order_type: order.order_type
    }));
    if (orderType !== order.order_type) {
      localStorage.setItem('flavours_order_type', order.order_type);
    }
    navigate('/menu');
  };

  if (loading) return <div className="loading"><div className="spinner"></div>Loading orders...</div>;

  return (
    <div className="menu-page">
      <header className="header">
        <div className="header-inner">
          <div className="logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
            Flavours <span className="logo-accent">BOB</span>
          </div>
          <div className="header-nav">
            <button onClick={() => navigate('/menu')}>Menu</button>
          </div>
        </div>
      </header>

      <div className="menu-content" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontStyle: 'italic', marginBottom: 4 }}>Your Orders</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📋</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: 8 }}>No orders yet</h3>
            <p style={{ marginBottom: 24 }}>Start by browsing our menu!</p>
            <button className="btn btn-primary" style={{ maxWidth: 240 }} onClick={() => navigate('/menu')}>Browse Menu</button>
          </div>
        ) : (
          <div className="order-history-list">
            {orders.map(order => (
              <div key={order.id} className={`order-history-card ${expandedId === order.id ? 'expanded' : ''}`}>
                <div className="order-history-header" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <div className="order-history-left">
                    <div className="order-history-id">#{order.id}</div>
                    <div className="order-history-date">
                      {formatDate(order.created_at)} • {formatTime(order.created_at)}
                    </div>
                  </div>
                  <div className="order-history-right">
                    <span className={`order-status-badge ${order.status}`}>{STATUS_LABELS[order.status]}</span>
                    <span className="order-type-badge-sm">{order.order_type.replace('_', ' ')}</span>
                    <span className="order-history-total">₹{order.total_amount}</span>
                  </div>
                </div>

                {expandedId === order.id && (
                  <div className="order-history-details">
                    <div className="order-history-items">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="order-history-item">
                          <span>{item.name} × {item.quantity}</span>
                          <span>₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      {order.delivery_charge > 0 && (
                        <div className="order-history-item">
                          <span>Delivery Charge</span>
                          <span>₹{order.delivery_charge}</span>
                        </div>
                      )}
                    </div>

                    {order.area && (
                      <div className="order-history-address">
                        📍 {order.block}, {order.area}, Flat {order.flat_number}, Room {order.room_number}
                      </div>
                    )}

                    {order.special_instructions && (
                      <div className="order-history-note">💬 {order.special_instructions}</div>
                    )}

                    <div className="order-history-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/order/${order.id}`)}>
                        Track Order
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => reorder(order)}>
                        🔄 Reorder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
