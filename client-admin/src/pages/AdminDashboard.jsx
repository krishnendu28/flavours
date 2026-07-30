import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../utils/api';
import useOrderBuzzer from '../hooks/useOrderBuzzer';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { on } = useSocket();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category_id: '' });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const admin = localStorage.getItem('flavours_admin');
    if (!admin) { navigate('/admin/login'); return; }

    Promise.all([api.getCategories(), api.getMenuItems(), api.getAllOrders()])
      .then(([cats, allItems, allOrders]) => {
        setCategories(cats);
        setItems(allItems);
        setOrders(allOrders);
        if (cats.length > 0) setActiveCategory(cats[0].id);
        setLoading(false);
      })
      .catch(err => { console.error('Dashboard API error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    const unsub1 = on('new-order', (order) => setOrders(prev => [order, ...prev]));
    const unsub2 = on('order-updated', (updated) => setOrders(prev => prev.map(o => o.id === updated.id ? updated : o)));
    const unsub3 = on('menu-updated', (updated) => setItems(prev => prev.map(i => i.id === updated.id ? updated : i)));
    const unsub4 = on('menu-item-added', (item) => setItems(prev => [...prev, item]));
    const unsub5 = on('menu-item-deleted', ({ id }) => setItems(prev => prev.filter(i => i.id !== id)));
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [on]);

  const { alertOrder, handleAccept, handleDismissAlert } = useOrderBuzzer();

  const toggleAvailability = async (item, field) => {
    try {
      const updated = await api.updateMenuItem(item.id, { [field]: item[field] ? 0 : 1 });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      alert(err.message);
    }
  };

  const savePrice = async (item) => {
    try {
      const updated = await api.updateMenuItem(item.id, { price: parseFloat(editPrice) });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      setEditingItem(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.deleteMenuItem(item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const item = await api.createMenuItem({
        name: newItem.name,
        description: newItem.description,
        price: parseFloat(newItem.price),
        category_id: parseInt(newItem.category_id),
      });
      setItems(prev => [...prev, item]);
      setShowAddItem(false);
      setNewItem({ name: '', description: '', price: '', category_id: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const matchCat = activeCategory ? item.category_id === activeCategory : true;
    const q = search.trim();
    const matchSearch = !q || item.name.toLowerCase().includes(q.toLowerCase()) || String(item.code).includes(q);
    return matchCat && matchSearch;
  });

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const activeOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status)).length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0);

  const itemSales = {};
  orders.filter(o => o.status === 'completed').forEach(o => {
    (o.items || []).forEach(item => {
      itemSales[item.name] = (itemSales[item.name] || 0) + item.quantity;
    });
  });
  const mostSold = Object.entries(itemSales).sort((a, b) => b[1] - a[1])[0];
  const mostSoldName = mostSold ? mostSold[0] : '—';
  const mostSoldQty = mostSold ? mostSold[1] : 0;

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;

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
        {navBtn('📊', 'Dashboard', '/admin', true, pendingCount)}
        {navBtn('🧾', 'POS & Billing', '/admin/pos')}
        {navBtn('📝', 'Live Orders', '/admin/orders', false, pendingCount)}
        {navBtn('🍳', 'Kitchen Display', '/admin/kitchen')}
        <button className="admin-nav-item" onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}>🚪 Logout</button>
      </aside>

      <main className="admin-main">
        <div className="admin-header">
          <h1>Dashboard</h1>
        </div>

        <div className="admin-stats">
          <div className="stat-card">
            <div className="label">Total Revenue</div>
            <div className="value success">₹{totalRevenue.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="label">Most Selling Item</div>
            <div className="value accent">{mostSoldName}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{mostSoldQty} qty sold</div>
          </div>
          <div className="stat-card">
            <div className="label">Pending Orders</div>
            <div className="value warning">{pendingOrders}</div>
          </div>
          <div className="stat-card">
            <div className="label">Active Orders</div>
            <div className="value accent">{activeOrders}</div>
          </div>
        </div>

        <div className="add-item-section">
          <div className="add-item-header" onClick={() => setShowAddItem(!showAddItem)}>
            <span className="add-item-title">Add New Menu Item</span>
            <span className={`add-item-chevron ${showAddItem ? 'open' : ''}`}>▼</span>
          </div>
          {showAddItem && (
            <form onSubmit={handleAddItem} className="add-item-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input type="text" className="form-input" required value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" className="form-input" value={newItem.description} onChange={e => setNewItem(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input type="number" className="form-input" required value={newItem.price} onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select className="area-select" required value={newItem.category_id} onChange={e => setNewItem(p => ({ ...p, category_id: e.target.value }))}>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 8 }}>Add Item</button>
            </form>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search items..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280, padding: '8px 14px', fontSize: 13 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`cat-chip ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
          <button
            className={`cat-chip ${activeCategory === null ? 'active' : ''}`}
            onClick={() => setActiveCategory(null)}
          >
            All Items
          </button>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Price</th>
                <th>Dine In</th>
                <th>Takeaway</th>
                <th>Delivery</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const anyAvail = item.available_dine_in || item.available_takeaway || item.available_delivery;
                return (
                  <tr key={item.id} style={{ opacity: anyAvail ? 1 : 0.45 }}>
                    <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{item.code}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.description}</div>}
                    </td>
                    <td>
                      {editingItem === item.id ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                          />
                          <button className="btn btn-success btn-sm" onClick={() => savePrice(item)} style={{ padding: '4px 8px' }}>Save</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditingItem(null)} style={{ padding: '4px 8px' }}>X</button>
                        </div>
                      ) : (
                        <span className="price" style={{ cursor: 'pointer' }} onClick={() => { setEditingItem(item.id); setEditPrice(item.price); }}>
                          ₹{item.price}
                        </span>
                      )}
                    </td>
                    <td>
                      <label className="toggle-switch" title="Dine In">
                        <input type="checkbox" checked={!!item.available_dine_in} onChange={() => toggleAvailability(item, 'available_dine_in')} />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <label className="toggle-switch" title="Takeaway">
                        <input type="checkbox" checked={!!item.available_takeaway} onChange={() => toggleAvailability(item, 'available_takeaway')} />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <label className="toggle-switch" title="Delivery">
                        <input type="checkbox" checked={!!item.available_delivery} onChange={() => toggleAvailability(item, 'available_delivery')} />
                        <span className="toggle-slider"></span>
                      </label>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: '4px 8px' }} onClick={() => deleteItem(item)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

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
        <button className="active" onClick={() => navigate('/admin')}><span className="icon">📊</span>Dashboard</button>
        <button onClick={() => navigate('/admin/pos')}><span className="icon">🧾</span>POS</button>
        <button onClick={() => navigate('/admin/orders')}><span className="icon">📝</span>Orders</button>
        <button onClick={() => navigate('/admin/kitchen')}><span className="icon">🍳</span>Kitchen</button>
        <button onClick={() => { localStorage.removeItem('flavours_admin'); navigate('/admin/login'); }}><span className="icon">🚪</span>Logout</button>
      </nav>
    </div>
  );
}
