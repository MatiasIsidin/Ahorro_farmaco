// ============================================================
// WELCOME PAGE — Pantalla de bienvenida / Auth (Supabase)
// ============================================================

import { useState } from 'react';
import { Heart, TrendingDown, Users, Bell, Shield, PiggyBank, Mail, Lock, Loader } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { track } from '../lib/analytics';
import './Welcome.css';

const BENEFITS = [
  { icon: TrendingDown, title: 'Compara precios', desc: 'Entre las principales farmacias de Chile en tiempo real.' },
  { icon: PiggyBank, title: 'Ahorra automáticamente', desc: 'Detectamos las mejores oportunidades de compra para ti.' },
  { icon: Users, title: 'Gestión familiar', desc: 'Administra medicamentos de toda tu familia en un solo lugar.' },
  { icon: Bell, title: 'Alertas inteligentes', desc: 'Te avisamos cuando bajan los precios o hay quiebres de stock.' },
];

export default function Welcome() {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const eventBase = isLogin ? 'auth_login' : 'auth_signup';
    track(`${eventBase}_attempt`);

    try {
      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        track('auth_login_success');
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        track('auth_signup_success');
        setIsLogin(true);
      }
    } catch (err) {
      track(`${eventBase}_error`);
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome-page">
      {/* Hero */}
      <div className="welcome-hero">
        <div className="welcome-hero-bg" />
        <div className="welcome-hero-content animate-fade-in-up">
          <div className="welcome-logo">
            <Heart size={36} />
          </div>
          <h1 className="welcome-title">Ahorro Inteligente en Fármacos Crónicos</h1>
          <p className="welcome-subtitle">
            Tu copiloto financiero de salud. Reduce el gasto en medicamentos crónicos para toda tu familia.
          </p>

          <div className="welcome-auth-card card mt-6" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left', padding: 'var(--space-6)' }}>
            <h2 className="text-xl font-bold mb-4">{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
            
            {error && <div className="alert-banner alert-banner-danger mb-4 text-sm">{error}</div>}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label text-sm">Correo Electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-muted" />
                  <input 
                    type="email" 
                    required
                    className="form-input pl-10" 
                    placeholder="tu@correo.cl" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label text-sm">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-muted" />
                  <input 
                    type="password" 
                    required
                    className="form-input pl-10" 
                    placeholder="Mínimo 6 caracteres" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary btn-block mt-2" disabled={loading}>
                {loading ? <Loader className="animate-spin" size={20} /> : (isLogin ? 'Ingresar' : 'Registrarse')}
              </button>
            </form>

            <div className="text-center mt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <section className="welcome-benefits stagger-children">
        <h2 className="welcome-section-title">¿Por qué elegir Ahorro Fármacos?</h2>
        <div className="welcome-benefits-grid">
          {BENEFITS.map((b, i) => (
            <div key={i} className="welcome-benefit-card card">
              <div className="welcome-benefit-icon">
                <b.icon size={24} />
              </div>
              <h3>{b.title}</h3>
              <p>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="welcome-trust">
        <Shield size={20} />
        <p>
          <strong>Tu información está segura.</strong> No prescribimos medicamentos.
          Consulta siempre con tu médico antes de cambiar tu tratamiento.
        </p>
      </section>
    </div>
  );
}
