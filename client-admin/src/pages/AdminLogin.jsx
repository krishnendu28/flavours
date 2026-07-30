import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.adminLogin(username, password);
      localStorage.setItem('flavours_admin', JSON.stringify(res.admin));
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-page">
      <div className="login-card">
        <h2>Admin Panel</h2>
        <p className="subtitle">Flavours BOB Management</p>

        {error && <div className="toast error" style={{ position: 'static', marginBottom: 16, width: '100%' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" className="form-input" placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-input" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
