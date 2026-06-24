// ============================================================
// WELCOME PAGE — Pantalla de bienvenida / Auth (Supabase)
// ============================================================

import { useState } from 'react';
import { Heart, TrendingDown, Users, Bell, Shield, PiggyBank } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import './Welcome.css';

const BENEFITS = [
  { icon: TrendingDown, title: 'Compara precios', desc: 'Entre las principales farmacias de Chile en tiempo real.' },
  { icon: PiggyBank, title: 'Ahorra automáticamente', desc: 'Detectamos las mejores oportunidades de compra para ti.' },
  { icon: Users, title: 'Gestión familiar', desc: 'Administra medicamentos de toda tu familia en un solo lugar.' },
  { icon: Bell, title: 'Alertas inteligentes', desc: 'Te avisamos cuando bajan los precios o hay quiebres de stock.' },
];

export default function Welcome() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="welcome-page">
      {/* Header with Login Button */}
      <header className="welcome-header">
        <button className="btn btn-login" onClick={() => setIsAuthModalOpen(true)}>
          Ingresar
        </button>
      </header>

      {/* Hero */}
      <div className="welcome-hero">
        <div className="welcome-hero-bg" />
        <div className="welcome-hero-content animate-fade-in-up">
          <div className="welcome-logo">
            <Heart size={36} />
          </div>
          <h1 className="welcome-title">Ahorro Inteligente en Fármacos Crónicos</h1>
          <p className="welcome-subtitle" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
            Tu copiloto financiero de salud. Encontramos automáticamente los mejores precios, descuentos y alternativas para los medicamentos de toda tu familia, para que nunca pagues de más.
          </p>

          <div className="flex flex-col gap-3 mt-6 mb-2 mx-auto text-left w-fit text-sm opacity-90">
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              <span>Compara precios en múltiples farmacias al instante</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              <span>Alertas automáticas de bajas de precio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              <span>Administra los medicamentos de toda tu familia</span>
            </div>
          </div>

          <div className="welcome-actions mt-8">
            <button className="btn btn-primary btn-lg" onClick={() => setIsAuthModalOpen(true)}>
              Comenzar a ahorrar
            </button>
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
        <Shield size={20} className="flex-shrink-0" />
        <p>
          <strong>Tu información está segura.</strong> No prescribimos medicamentos.
          Consulta siempre con tu médico antes de cambiar tu tratamiento.
        </p>
      </section>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}

