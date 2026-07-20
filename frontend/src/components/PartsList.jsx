import React, { useState } from 'react';
import { Package, Plus, Tag, Trash2 } from 'lucide-react';

export default function PartsList({ parts, onCreatePart }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Structured References
  const [referencesList, setReferencesList] = useState([
    { code: '', side_type: 'IZQ' },
    { code: '', side_type: 'DCH' }
  ]);

  const addReferenceRow = (type = 'IZQ') => {
    setReferencesList([...referencesList, { code: '', side_type: type }]);
  };

  const removeReferenceRow = (index) => {
    setReferencesList(referencesList.filter((_, idx) => idx !== index));
  };

  const updateReferenceRow = (index, field, value) => {
    setReferencesList(referencesList.map((ref, idx) => {
      if (idx === index) {
        return { ...ref, [field]: value };
      }
      return ref;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const validRefs = referencesList
      .filter(r => r.code.trim() !== '')
      .map(r => ({ code: r.code.trim().toUpperCase(), side_type: r.side_type }));

    onCreatePart({
      name: name.trim(),
      description: description.trim(),
      references: validRefs
    });

    setName('');
    setDescription('');
    setReferencesList([
      { code: '', side_type: 'IZQ' },
      { code: '', side_type: 'DCH' }
    ]);
    setShowForm(false);
  };

  const getSideColor = (type) => {
    switch(type) {
      case 'IZQ': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.4)' };
      case 'DCH': return { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' };
      case 'Única': return { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981', border: 'rgba(16, 185, 129, 0.4)' };
      default: return { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.4)' };
    }
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
              placeholder="Ej. Espejo Retrovisor Lateral" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción (Opcional)</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. Plano técnico #402" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: '14px', borderTop: '1px border-color', paddingTop: '10px' }}>
            <label className="form-label" style={{ fontWeight: 'bold', color: '#60a5fa' }}>
              REFERENCIAS DE LA PIEZA ({referencesList.length})
            </label>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('IZQ')}>+ Referencia IZQ</button>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('DCH')}>+ Referencia DCH</button>
              <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('Única')}>+ Ref Única</button>
            </div>

            {referencesList.map((ref, rIdx) => (
              <div key={rIdx} style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                <select 
                  className="form-select" 
                  style={{ width: '110px', minHeight: '40px', fontSize: '0.8rem', fontWeight: 'bold' }}
                  value={ref.side_type}
                  onChange={(e) => updateReferenceRow(rIdx, 'side_type', e.target.value)}
                >
                  <option value="IZQ">IZQ (Izquierda)</option>
                  <option value="DCH">DCH (Derecha)</option>
                  <option value="Única">Única</option>
                  <option value="Variante A">Variante A</option>
                  <option value="Variante B">Variante B</option>
                </select>

                <input 
                  type="text" 
                  className="form-input" 
                  style={{ flex: 1, minHeight: '40px', fontFamily: 'monospace', fontWeight: 'bold' }}
                  placeholder="Ej. L381154" 
                  value={ref.code} 
                  onChange={(e) => updateReferenceRow(rIdx, 'code', e.target.value)}
                  required
                />

                {referencesList.length > 1 && (
                  <button type="button" className="btn btn-danger" style={{ minHeight: '40px', padding: '0 8px' }} onClick={() => removeReferenceRow(rIdx)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
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
                {part.references_list && part.references_list.length > 0 ? (
                  part.references_list.map((r, rIdx) => {
                    const styleColor = getSideColor(r.side_type);
                    return (
                      <span 
                        key={rIdx} 
                        style={{ 
                          fontSize: '0.78rem', 
                          fontWeight: 'bold', 
                          fontFamily: 'monospace',
                          background: styleColor.bg, 
                          color: styleColor.text, 
                          border: `1px solid ${styleColor.border}`, 
                          padding: '2px 8px', 
                          borderRadius: '12px' 
                        }}
                      >
                        {r.code} ({r.side_type})
                      </span>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '0.78rem', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                    Ref: {part.references}
                  </span>
                )}
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
