// ============================================================
// TOPBAR — Barra superior con perfil y acciones rápidas
// ============================================================

import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, ChevronDown, Search } from 'lucide-react';
import { useApp, useActiveProfile } from '../context/AppContext';
import './Topbar.css';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/family': 'Mi Familia',
  '/medications': 'Mis Medicamentos',
  '/medications/add': 'Agregar Medicamento',
  '/compare': 'Comparador de Precios',
  '/cart': 'Carrito Inteligente',
  '/alerts': 'Alertas Inteligentes',
  '/savings': 'Centro de Ahorro',
  '/recipes': 'Recetas y Documentos',
  '/reports': 'Reportes',
  '/settings': 'Configuración',
  '/premium': 'Premium',
  '/profile': 'Mi Perfil',
};

export default function Topbar() {
  const { state, dispatch } = useApp();
  const profile = useActiveProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const title = PAGE_TITLES[location.pathname] || 'Ahorro Inteligente';
  const unreadAlerts = state.alerts.filter((a) => a.activa && !a.leida).length;

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          className="btn btn-ghost btn-icon hide-desktop"
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <h2 className="topbar-title">{title}</h2>
      </div>

      <div className="topbar-right">
        {/* Profile quick switch */}
        {state.profiles.length > 1 && (
          <div className="topbar-profile-switch">
            <select
              className="topbar-profile-select"
              value={state.activeProfileId || ''}
              onChange={(e) => dispatch({ type: 'SET_ACTIVE_PROFILE', payload: e.target.value })}
              aria-label="Cambiar perfil activo"
            >
              {state.profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icono} {p.nombre}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="topbar-profile-chevron" />
          </div>
        )}

        {/* Alerts */}
        <button
          className="btn btn-ghost btn-icon topbar-alert-btn"
          onClick={() => navigate('/alerts')}
          aria-label={`Alertas ${unreadAlerts > 0 ? `(${unreadAlerts} sin leer)` : ''}`}
        >
          <Bell size={20} />
          {unreadAlerts > 0 && (
            <span className="topbar-alert-badge">{unreadAlerts}</span>
          )}
        </button>

        {/* Profile avatar */}
        {profile && (
          <button
            className="topbar-avatar"
            onClick={() => navigate('/profile')}
            aria-label="Mi perfil"
          >
            {profile.icono || '👤'}
          </button>
        )}
      </div>
    </header>
  );
}
