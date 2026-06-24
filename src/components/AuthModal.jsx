import { useState, useEffect } from 'react';
import { Mail, Lock, Loader, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { track } from '../lib/analytics';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
        // Let AppContext handle the redirect upon auth state change
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        track('auth_signup_success');
        setIsLogin(true); // Switch to login to show "check email" or just login if auto-confirmed
        setError('Cuenta creada. Si es necesario, revisa tu correo para confirmarla.');
      }
    } catch (err) {
      track(`${eventBase}_error`);
      setError(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="auth-modal-container">
        <div className="auth-modal-header">
          <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          <button className="auth-modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="auth-modal-body">
          {error && (
            <div className={`alert-banner ${error.includes('creada') ? 'alert-banner-success' : 'alert-banner-danger'} mb-4 text-sm`}>
              {error}
            </div>
          )}

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
                  autoFocus
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

          <div className="text-center mt-6">
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
