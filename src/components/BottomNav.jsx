// ============================================================
// BOTTOM NAV — Navegación móvil inferior
// ============================================================

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Pill, GitCompare, Bell, PiggyBank } from 'lucide-react';
import { useActiveAlerts } from '../context/AppContext';
import './BottomNav.css';

const BOTTOM_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/medications', icon: Pill, label: 'Medicamentos' },
  { to: '/compare', icon: GitCompare, label: 'Comparar' },
  { to: '/alerts', icon: Bell, label: 'Alertas' },
  { to: '/savings', icon: PiggyBank, label: 'Ahorro' },
];

export default function BottomNav() {
  const unreadAlerts = useActiveAlerts().length;

  return (
    <nav className="app-bottom-nav" aria-label="Navegación principal">
      {BOTTOM_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav-icon-wrap">
            <item.icon size={22} />
            {item.to === '/alerts' && unreadAlerts > 0 && (
              <span className="bottom-nav-badge">{unreadAlerts}</span>
            )}
          </div>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
