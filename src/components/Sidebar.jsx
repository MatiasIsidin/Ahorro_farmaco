// ============================================================
// SIDEBAR — Navegación principal desktop
// ============================================================

import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Pill, GitCompare, ShoppingCart, Bell,
  PiggyBank, FileText, Settings, Crown, TrendingUp, Calendar,
  User, Menu, X, Heart, LogOut
} from 'lucide-react';
import { useApp, useActiveProfile } from '../context/AppContext';
import { formatCLP, calculateAccumulatedSavings } from '../services/savingsEngine';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/family', icon: Users, label: 'Mi Familia' },
  { to: '/medications', icon: Pill, label: 'Medicamentos' },
  { to: '/compare', icon: GitCompare, label: 'Comparador' },
  { to: '/cart', icon: ShoppingCart, label: 'Carrito Inteligente' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
  { to: '/savings', icon: PiggyBank, label: 'Centro de Ahorro' },
  { to: '/recipes', icon: FileText, label: 'Recetas' },
  { to: '/reports', icon: TrendingUp, label: 'Reportes' },
  { to: '/settings', icon: Settings, label: 'Configuración' },
  { to: '/premium', icon: Crown, label: 'Premium' },
];

export default function Sidebar() {
  const { state, dispatch } = useApp();
  const profile = useActiveProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const totalSavings = calculateAccumulatedSavings(state.purchases);
  const activeAlerts = state.alerts.filter((a) => a.activa && !a.leida).length;

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      setIsLoggingOut(true);
      const success = await dispatch({ type: 'LOGOUT' });
      setIsLoggingOut(false);
      if (success) {
        navigate('/');
      }
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {state.sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })} />
      )}

      <aside className={`app-sidebar ${state.sidebarOpen ? 'open' : ''}`}>
        {/* Logo & Brand */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Heart size={24} />
            </div>
            <div>
              <h1 className="sidebar-title">Ahorro Fármacos</h1>
              <p className="sidebar-subtitle">Copiloto de salud</p>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon hide-desktop"
            onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* Savings highlight */}
        <div className="sidebar-savings">
          <span className="sidebar-savings-label">Ahorro acumulado</span>
          <span className="sidebar-savings-value">{formatCLP(totalSavings)}</span>
        </div>

        {/* Active profile */}
        {profile && (
          <div className="sidebar-profile">
            <span className="sidebar-profile-avatar">{profile.icono || '👤'}</span>
            <div>
              <span className="sidebar-profile-name">{profile.nombre}</span>
              <span className="sidebar-profile-type">{profile.tipo}</span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'CLOSE_SIDEBAR' })}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {item.to === '/alerts' && activeAlerts > 0 && (
                <span className="sidebar-badge">{activeAlerts}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Premium upsell */}
        {state.subscription.plan === 'free' && (
          <div className="sidebar-premium">
            <Crown size={18} />
            <div>
              <strong>Desbloquea Premium</strong>
              <span>Perfiles ilimitados y más</span>
            </div>
          </div>
        )}

        {/* Cerrar Sesión Button */}
        <div className="sidebar-logout-wrap">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={20} />
            <span>{isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
