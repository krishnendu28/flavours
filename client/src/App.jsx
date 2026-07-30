import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Menu from './pages/Menu';
import OrderTracking from './pages/OrderTracking';
import OrderHistory from './pages/OrderHistory';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import AdminKitchen from './pages/AdminKitchen';
import AdminPOS from './pages/AdminPOS';
export default function App() {
  return (
    <SocketProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/order/:id" element={<OrderTracking />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/kitchen" element={<AdminKitchen />} />
            <Route path="/admin/pos" element={<AdminPOS />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </SocketProvider>
  );
}
