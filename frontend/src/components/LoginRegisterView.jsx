import React, { useState } from 'react';
import { Cpu, Mail, Lock, User, LogIn, UserPlus } from 'lucide-react';

export default function LoginRegisterView({ API_BASE_URL, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    if (!email || !password || (!isLogin && !fullName)) {
      setMessage({ text: 'Por favor, rellena todos los campos.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Iniciar sesión
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok) {
          setMessage({ text: '¡Inicio de sesión correcto!', type: 'success' });
          setTimeout(() => {
            onLogin(data.access_token);
          }, 800);
        } else {
          setMessage({ text: data.detail || 'Error al iniciar sesión.', type: 'error' });
        }
      } else {
        // Registrar usuario
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName })
        });
        const data = await res.json();

        if (res.ok) {
          setMessage({ text: '¡Registro completado con éxito! Iniciando sesión...', type: 'success' });
          
          // Auto login después de registrar
          const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          const loginData = await loginRes.json();
          if (loginRes.ok) {
            setTimeout(() => {
              onLogin(loginData.access_token);
            }, 800);
          } else {
            setIsLogin(true);
            setMessage({ text: 'Registro correcto. Por favor inicia sesión.', type: 'success' });
          }
        } else {
          setMessage({ text: data.detail || 'Error al registrar usuario.', type: 'error' });
        }
      }
    } catch (err) {
      setMessage({ text: 'Error al conectar con el servidor.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--bg-card, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        borderRadius: 'var(--radius-lg, 16px)',
        width: '100%',
        maxWidth: '400px',
        padding: '30px',
        textAlign: 'center'
      }}>
        {/* Logo/Icon */}
        <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(96, 165, 250, 0.1)', borderRadius: '50%', marginBottom: '16px' }}>
          <Cpu size={32} color="#60a5fa" />
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '0 0 6px 0', color: '#ffffff' }}>
          {isLogin ? 'Acceso Supervisor' : 'Registrar Supervisor'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 24px 0' }}>
          {isLogin 
            ? 'Inicia sesión para gestionar turnos y configurar el sistema' 
            : 'Crea una cuenta para registrar partes de producción'
          }
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div style={{ position: 'relative', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                NOMBRE COMPLETO
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Ej. Matias García"
                  className="form-input"
                  style={{ paddingLeft: '38px', minHeight: '42px' }}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
              </div>
            </div>
          )}

          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
              CORREO ELECTRÓNICO
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                placeholder="supervisor@empresa.com"
                className="form-input"
                style={{ paddingLeft: '38px', minHeight: '42px' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          <div style={{ position: 'relative', textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '38px', minHeight: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
            </div>
          </div>

          {message.text && (
            <div style={{
              fontSize: '0.8rem',
              padding: '10px',
              borderRadius: 'var(--radius-sm, 6px)',
              background: message.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: message.type === 'error' ? '#f87171' : '#34d399',
              border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
              textAlign: 'left'
            }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              marginTop: '8px'
            }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : (isLogin ? <LogIn size={18} /> : <UserPlus size={18} />)}
            {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
          </button>
        </form>

        <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-muted, #64748b)' }}>
            {isLogin ? '¿No tienes cuenta de supervisor?' : '¿Ya tienes una cuenta?'}
          </span>{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage({ text: '', type: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Crear cuenta' : 'Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
