import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const { login, orderType } = useAuth();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notification, setNotification] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (phone.length < 10) { setError('Enter a valid phone number'); return; }
    setError('');
    setNotification('');
    setLoading(true);
    try {
      const res = await api.sendOtp(phone);
      setOtp(res.otp || '');
      setNotification(res.otp ? `Your OTP is ${res.otp}` : 'OTP sent');
      setStep('otp');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) { setError('Enter a valid OTP'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp(phone, otp, name);
      login(res.user);
      navigate(orderType ? '/menu' : '/');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>{step === 'phone' ? 'Welcome' : 'Verify OTP'}</h2>
        <p className="subtitle">
          {step === 'phone'
            ? 'Enter your details to get started'
            : `Check the in-app notification for ${phone}`
          }
        </p>

        {error && <div className="toast error" style={{ position: 'static', marginBottom: 16, width: '100%' }}>{error}</div>}

        {notification && (
          <div className="toast success" style={{ position: 'static', marginBottom: 16, width: '100%' }}>
            🔔 {notification}
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                className="form-input"
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 8 }}
              onClick={() => { setStep('phone'); setOtp(''); setError(''); setNotification(''); }}
            >
              Change Number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
