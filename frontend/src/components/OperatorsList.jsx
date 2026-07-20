import React, { useState } from 'react';
import { UserCheck, Plus, User, Hash } from 'lucide-react';

export default function OperatorsList({ operators, onCreateOperator }) {
  const [name, setName] = useState('');
  const [operatorNumber, setOperatorNumber] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !operatorNumber.trim()) return;

    onCreateOperator({
      name: name.trim(),
      operator_number: operatorNumber.trim().toUpperCase()
    });

    setName('');
    setOperatorNumber('');
    setShowForm(false);
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserCheck size={20} color="#3b82f6" /> Operarios Registrados
        </h2>
        <button 
          className="btn btn-primary" 
          style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={14} /> {showForm ? 'Cancelar' : 'Nuevo Operario'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Registrar Nuevo Operario</h3>
          
          <div className="form-group">
            <label className="form-label">Nombre Completo</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. Manuel Rodríguez" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Número de Operario Único (Manual)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. OP-4029" 
              value={operatorNumber} 
              onChange={(e) => setOperatorNumber(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
            Guardar Operario
          </button>
        </form>
      )}

      {operators.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
          No hay operarios registrados aún.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
          {operators.map(op => (
            <div key={op.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', fontSize: '1rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={16} color="#60a5fa" /> {op.name}
                </span>
                <span className="machine-code" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 'bold' }}>
                  <Hash size={12} style={{ display: 'inline', marginRight: '2px' }} />{op.operator_number}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
