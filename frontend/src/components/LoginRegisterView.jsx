import React, { useState } from 'react';
import { Cpu, Mail, Lock, User, LogIn, UserPlus, Key } from 'lucide-react';

export default function LoginRegisterView({ API_BASE_URL, onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // Lo usamos como 'Username / Usuario' en el backend
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('encargado');
  const [supervisorKey, setSupervisorKey] = useState('');
  const [registrationKey, setRegistrationKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    if (!email || !password || (!isLogin && (!fullName || !registrationKey))) {
      setMessage({ text: 'Por favor, rellena todos los campos obligatorios.', type: 'error' });
      setLoading(false);
      return;
    }

    if (!isLogin && role === 'supervisor' && !supervisorKey) {
      setMessage({ text: 'Por favor, introduce la clave secreta de supervisor.', type: 'error' });
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
          setMessage({ text: data.detail || 'Usuario o contraseña incorrectos.', type: 'error' });
        }
      } else {
        // Registrar usuario
        const payload = { 
          email, 
          password, 
          full_name: fullName,
          role,
          registration_key: registrationKey,
          supervisor_key: role === 'supervisor' ? supervisorKey : null
        };
        
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
          {isLogin ? 'Acceso de Personal' : 'Registrar Cuenta'}
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', margin: '0 0 24px 0' }}>
          {isLogin 
            ? 'Inicia sesión con tu usuario y contraseña de turno' 
            : 'Crea tu usuario para registrar tus partes y cuadrantes'
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
              USUARIO (O CORREO)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="matias"
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

          {!isLogin && (
            <>
              <div style={{ position: 'relative', textAlign: 'left', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#60a5fa', marginBottom: '4px' }}>
                  CLAVE DE REGISTRO DE PLANTA
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    placeholder="Clave de la planta (ej. planta2026)"
                    className="form-input"
                    style={{ paddingLeft: '38px', minHeight: '42px', borderColor: '#60a5fa' }}
                    value={registrationKey}
                    onChange={(e) => setRegistrationKey(e.target.value)}
                  />
                  <Key size={16} color="#60a5fa" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                </div>
              </div>

              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', marginBottom: '4px' }}>
                  ROL DE CUENTA
                </label>
                <select
                  className="form-input"
                  style={{ minHeight: '42px', paddingLeft: '12px', background: 'var(--bg-input, #0f172a)', color: '#ffffff', border: '1px solid var(--border-color, #334155)', borderRadius: 'var(--radius-sm, 6px)', width: '100%' }}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="encargado">Encargado de Turno</option>
                  <option value="supervisor">Supervisor General</option>
                </select>
              </div>

              {role === 'supervisor' && (
                <div style={{ position: 'relative', textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: '600', color: '#f87171', marginBottom: '4px' }}>
                    CLAVE SECRETA DE SUPERVISOR
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      placeholder="Ej. super123"
                      className="form-input"
                      style={{ paddingLeft: '38px', minHeight: '42px', borderColor: '#f87171' }}
                      value={supervisorKey}
                      onChange={(e) => setSupervisorKey(e.target.value)}
                    />
                    <Key size={16} color="#f87171" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  </div>
                </div>
              )}
            </>
          )}

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
            {isLogin ? '¿No tienes cuenta registrada?' : '¿Ya tienes una cuenta?'}
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
