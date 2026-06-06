// ============================================================
// PREMIUM — Suscripciones
// ============================================================

import { Shield, Check, Star } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function Premium() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const isPremium = state.subscription.plan === 'premium';

  const handleSubscribe = () => {
    dispatch({
      type: 'UPDATE_SUBSCRIPTION',
      payload: { plan: 'premium', startDate: new Date().toISOString() }
    });
    alert('¡Bienvenido a Premium! Tienes acceso a todas las funcionalidades avanzadas.');
    navigate('/dashboard');
  };

  const handleCancel = () => {
    dispatch({
      type: 'UPDATE_SUBSCRIPTION',
      payload: { plan: 'free', startDate: null }
    });
    alert('Suscripción cancelada.');
  };

  return (
    <div className="animate-fade-in flex flex-col max-w-[800px] mx-auto gap-6">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold mb-2">Ahorro Inteligente <span className="text-primary">Premium</span></h2>
        <p className="text-secondary text-lg">Lleva la gestión de salud de tu familia al siguiente nivel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Free Tier */}
        <div className={`card p-6 border-2 ${!isPremium ? 'border-border' : 'border-transparent opacity-70'}`}>
          <h3 className="text-xl font-bold mb-1">Plan Básico</h3>
          <p className="text-2xl font-extrabold mb-4">Gratis <span className="text-sm font-normal text-secondary">/ para siempre</span></p>
          
          <ul className="flex flex-col gap-3 mb-6">
            <li className="flex items-center gap-2"><Check size={18} className="text-success" /> Hasta 2 perfiles familiares</li>
            <li className="flex items-center gap-2"><Check size={18} className="text-success" /> Alertas básicas (precio y stock)</li>
            <li className="flex items-center gap-2"><Check size={18} className="text-success" /> Comparador de farmacias</li>
            <li className="flex items-center gap-2"><Check size={18} className="text-success" /> Carrito Inteligente (Lite)</li>
          </ul>

          {!isPremium && <button className="btn btn-secondary w-full" disabled>Tu plan actual</button>}
        </div>

        {/* Premium Tier */}
        <div className={`card p-6 border-2 ${isPremium ? 'border-primary shadow-lg' : 'border-primary-200 bg-primary-50'}`}>
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-xl font-bold text-primary-800">Plan Premium</h3>
            {isPremium && <span className="badge badge-success">Activo</span>}
          </div>
          <p className="text-2xl font-extrabold mb-4 text-primary-800">$4.990 <span className="text-sm font-normal text-primary-600">/ mes</span></p>
          
          <ul className="flex flex-col gap-3 mb-6">
            <li className="flex items-center gap-2"><Star size={18} className="text-accent" /> Perfiles familiares ilimitados</li>
            <li className="flex items-center gap-2"><Star size={18} className="text-accent" /> Algoritmo avanzado de ruteo para compras múltiples</li>
            <li className="flex items-center gap-2"><Star size={18} className="text-accent" /> Integración automática de recetas médicas</li>
            <li className="flex items-center gap-2"><Star size={18} className="text-accent" /> Reportes históricos exportables (PDF/Excel)</li>
            <li className="flex items-center gap-2"><Star size={18} className="text-accent" /> Atención prioritaria</li>
          </ul>

          {isPremium ? (
            <button className="btn btn-ghost text-danger w-full mt-auto" onClick={handleCancel}>Cancelar suscripción</button>
          ) : (
            <button className="btn btn-primary w-full mt-auto" onClick={handleSubscribe}>
              <Shield size={18} /> Actualizar a Premium
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
