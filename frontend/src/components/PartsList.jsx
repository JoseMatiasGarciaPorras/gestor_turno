import React, { useState } from 'react';
import { Package, Plus, Tag } from 'lucide-react';

export default function PartsList({ parts, onCreatePart }) {
  const [name, setName] = useState('');
  const [references, setReferences] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !references.trim()) return;

    onCreatePart({
      name: name.trim(),
      references: references.trim().toUpperCase(),
      description: description.trim()
    });

    setName('');
    setReferences('');
    setDescription('');
    setShowForm(false);
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={20} color="#a78bfa" /> Piezas & Productos
        </h2>
        <button 
          className="btn btn-primary" 
          style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={14} /> {showForm ? 'Cancelar' : 'Nueva Pieza'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Registrar Nueva Pieza</h3>
          
          <div className="form-group">
            <label className="form-label">Nombre de la Pieza</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. Eje de Transmisión Al-7075" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Referencias Alfanuméricas Únicas</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. REF-A100, REF-A101B" 
              value={references} 
              onChange={(e) => setReferences(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción / Especificaciones (Opcional)</label>
            <textarea 
              className="form-textarea" 
              placeholder="Ej. Plano técnico #402, tolerancias ±0.05mm" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-success" style={{ width: '100%' }}>
            Guardar Pieza
          </button>
        </form>
      )}

      {parts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
          No hay piezas registradas aún.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {parts.map(part => (
            <div key={part.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '1rem', color: '#ffffff' }}>{part.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                <Tag size={13} color="#a78bfa" />
                <span style={{ fontSize: '0.8rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                  Ref: {part.references}
                </span>
              </div>
              {part.description && (
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>{part.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
