import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';

const STATUS_STEPS = [
  { key: 'pending', label: 'Order Placed', icon: '✓' },
  { key: 'accepted', label: 'Accepted', icon: '✅' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

// KOT printing is admin-only. Users see order status here.

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { on } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOrder(id).then(o => { setOrder(o); setLoading(false); }).catch(err => { console.error('Order tracking error:', err); setLoading(false); });
  }, [id]);

  useEffect(() => {
    return on('order-updated', (updated) => {
      if (updated.id === id) setOrder(updated);
    });
  }, [on, id]);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading order...</div>;
  if (!order) return <div className="loading">Order not found</div>;

  const statusToStep = { pending: 0, accepted: 1, preparing: 1, ready: 1, completed: 2, cancelled: -1 };
  const currentIdx = statusToStep[order.status] ?? -1;
  const isCancelled = order.status === 'cancelled';
  const isPending = order.status === 'pending';

  const orderAge = order.created_at ? (Date.now() - new Date(order.created_at).getTime()) / 60000 : 0;

  return (
    <div className="order-tracking">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')} style={{ width: 'auto' }}>
          ← Home
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/menu')} style={{ width: 'auto' }}>
          Menu
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/orders')} style={{ width: 'auto' }}>
          My Orders
        </button>
      </div>

      <h2>Order Tracking</h2>
      <div className="order-id-text">#{order.id} • {order.order_type.replace('_', ' ').toUpperCase()}</div>

      {isCancelled ? (
        <div style={{ padding: 32, textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
          <h3 style={{ color: 'var(--danger)' }}>Order Cancelled</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>Your order has been cancelled by the restaurant.</p>
        </div>
      ) : isPending && orderAge > 5 ? (
        <div style={{ padding: 24, textAlign: 'center', background: 'var(--warning-bg)', borderRadius: 'var(--radius)', border: '1px solid rgba(230,81,0,0.2)', marginBottom: 20 }}>
          <p style={{ color: 'var(--warning)', fontSize: 14, fontWeight: 600 }}>⏳ Restaurant hasn't confirmed your order yet. Please contact them directly.</p>
        </div>
      ) : (
        <div className="status-timeline">
          {STATUS_STEPS.map((step, idx) => {
            let status = 'pending';
            if (idx < currentIdx) status = 'completed';
            else if (idx === currentIdx) status = 'active';

            return (
              <div key={step.key} className="status-step">
                <div className={`status-dot ${status}`}>{status === 'completed' ? '✓' : step.icon}</div>
                <div className={`status-label ${status}`}>{step.label}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="cart-summary" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Order Details</h3>
        {order.items.map(item => (
          <div key={item.id} className="cart-summary-row" style={{ alignItems: 'center' }}>
            <span>{item.name} × {item.quantity}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        {order.delivery_charge > 0 && (
          <div className="cart-summary-row">
            <span>Delivery Charge</span>
            <span>₹{order.delivery_charge}</span>
          </div>
        )}
        <div className="cart-summary-row total">
          <span>Total</span>
          <span className="price">₹{order.total_amount}</span>
        </div>
      </div>

      {order.area && (
        <div className="address-form" style={{ marginTop: 16 }}>
          <h3>Delivery Address</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {order.block}, {order.area}, Flat {order.flat_number}, Room {order.room_number}
          </p>
        </div>
      )}

      {order.special_instructions && (
        <div className="address-form" style={{ marginTop: 16 }}>
          <h3>Special Instructions</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{order.special_instructions}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/menu')}>
          Order More
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/orders')}>
          My Orders
        </button>
      </div>
    </div>
  );
}
