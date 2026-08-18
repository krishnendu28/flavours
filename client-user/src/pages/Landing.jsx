import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { selectOrderType } = useAuth();

  const handleSelect = (type) => {
    selectOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="landing-new">
      <div className="landing-bg" />
      <div className="landing-overlay" />

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            Flavours <span className="logo-accent">BOB</span>
          </div>
          <div className="header-nav">
            <a href="/admin/login">Admin</a>
          </div>
        </div>
      </header>

      <main className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-badge">
            <span className="badge-dot" /> Newtown, Kolkata
          </div>
          <h1 className="landing-title">
            Battle <em>of</em> Buds
          </h1>
          <p className="landing-subtitle">
            Authentic Biryani, Thali, Starters & more — crafted with love, delivered fresh to your doorstep or savoured at our place.
          </p>
        </div>

        <div className="landing-cards">
          <div className="landing-card" onClick={() => handleSelect('dine_in')}>
            <div className="landing-card-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80)' }} />
            <div className="landing-card-overlay" />
            <div className="landing-card-content">
              <span className="landing-card-icon">🍽</span>
              <h3>Dine In</h3>
              <p>Enjoy the restaurant experience</p>
            </div>
          </div>

          <div className="landing-card" onClick={() => handleSelect('takeaway')}>
            <div className="landing-card-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80)' }} />
            <div className="landing-card-overlay" />
            <div className="landing-card-content">
              <span className="landing-card-icon">📦</span>
              <h3>Takeaway</h3>
              <p>Pack it fresh, pick it up</p>
            </div>
          </div>

          <div className="landing-card" onClick={() => handleSelect('delivery')}>
            <div className="landing-card-img" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1526367790999-0150786686a2?w=800&q=80)' }} />
            <div className="landing-card-overlay" />
            <div className="landing-card-content">
              <span className="landing-card-icon">🛵</span>
              <h3>Delivery</h3>
              <p>We bring it to your door</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span>C Block Gate, Shapoorji Complex, Newtown</span>
          <span className="footer-sep">·</span>
          <span>12:30 PM to 11:00 PM</span>
          <span className="footer-sep">·</span>
          <span>9330759429</span>
        </div>
      </footer>
    </div>
  );
}
