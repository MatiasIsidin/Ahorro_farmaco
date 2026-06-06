// ============================================================
// SETTINGS — Configuración
// ============================================================

import { Settings as SettingsIcon, Bell, Eye, MapPin, User, Shield, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import './Settings.css';

export default function Settings() {
  const { state, dispatch } = useApp();
  const settings = state.settings;

  const handleToggle = (key) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: !settings[key] }
    });
  };

  const handleSelect = (key, value) => {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { [key]: value }
    });
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h2 className="settings-title">Configuración</h2>
        <p className="text-secondary">Personaliza tu experiencia y preferencias de ahorro.</p>
      </div>

      <div className="settings-grid stagger-children mt-6">
        
        {/* Accesibilidad */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <Eye className="text-primary" size={24} />
            <h3>Accesibilidad y Visualización</h3>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-info">
              <h4>Modo Adulto Mayor</h4>
              <p>Aumenta el tamaño de la letra, botones y alto contraste.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.seniorMode}
                onChange={() => handleToggle('seniorMode')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-info">
              <h4>Tema de la aplicación</h4>
              <p>Elige entre claro u oscuro.</p>
            </div>
            <select 
              className="form-select" 
              style={{ width: 'auto' }}
              value={settings.theme || 'light'}
              onChange={(e) => handleSelect('theme', e.target.value)}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>

        {/* Notificaciones */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <Bell className="text-primary" size={24} />
            <h3>Notificaciones y Alertas</h3>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-info">
              <h4>Notificaciones Push</h4>
              <p>Recibir alertas de quiebre de stock y bajas de precio en el dispositivo.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.notificationsEnabled}
                onChange={() => handleToggle('notificationsEnabled')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="settings-item">
            <div className="settings-item-info">
              <h4>Alertas de próxima compra</h4>
              <p>Avisar cuando quede poco stock en casa.</p>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.refillAlerts ?? true}
                onChange={() => handleToggle('refillAlerts')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {/* Preferencias de Ahorro */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <MapPin className="text-primary" size={24} />
            <h3>Preferencias de Ahorro</h3>
          </div>
          
          <div className="settings-item">
            <div className="settings-item-info">
              <h4>Radio de búsqueda máximo</h4>
              <p>Distancia máxima para comparar precios de farmacias físicas.</p>
            </div>
            <select 
              className="form-select" 
              style={{ width: 'auto' }}
              value={settings.searchRadius || '5'}
              onChange={(e) => handleSelect('searchRadius', e.target.value)}
            >
              <option value="1">1 km (Caminando)</option>
              <option value="5">5 km (Comuna)</option>
              <option value="15">15 km (Ciudad)</option>
              <option value="any">Cualquiera (Incluye envíos online)</option>
            </select>
          </div>
        </div>

        {/* Cuenta */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <User className="text-primary" size={24} />
            <h3>Gestión de Cuenta</h3>
          </div>
          
          <div className="settings-item cursor-pointer hover:bg-gray-50" onClick={() => window.location.href='/profile'}>
            <div className="settings-item-info">
              <h4>Mi Perfil</h4>
              <p>Actualiza tus datos personales y previsión.</p>
            </div>
            <SettingsIcon className="text-muted" size={20} />
          </div>

          <div className="settings-item cursor-pointer hover:bg-gray-50" onClick={() => window.location.href='/premium'}>
            <div className="settings-item-info">
              <h4>Plan de Suscripción</h4>
              <p>{state.subscription.plan === 'premium' ? 'Plan Premium Activo' : 'Plan Gratuito Básico'}</p>
            </div>
            <CreditCard className="text-muted" size={20} />
          </div>
          
          <div className="settings-item">
            <button className="btn btn-ghost text-danger w-full text-left justify-start" onClick={() => {
              if (window.confirm('Esto eliminará TODOS los datos de la aplicación local. ¿Estás seguro?')) {
                dispatch({ type: 'RESET_ALL' });
                window.location.href = '/';
              }
            }}>
              Borrar todos los datos de la aplicación (Reset)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
