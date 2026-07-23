import React, { useState } from 'react';
import { Users, Search, Hash, Check, X } from 'lucide-react';

export default function OperatorsList({ operators = [], onToggleActive }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOperators = operators.filter(op => 
    op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    op.operator_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = operators.filter(op => op.is_active).length;

  const handleToggleAll = async (status) => {
    const targetOps = operators.filter(op => !!op.is_active !== status);
    // Execute sequentially to avoid race conditions or network congestion
    for (const op of targetOps) {
      await onToggleActive(op);
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {/* SECTION HEADER & SUMMARY CARD */}
      <div style={{ 
        background: 'var(--bg-card)', 
        padding: '20px', 
        borderRadius: 'var(--radius-lg)', 
        marginBottom: '16px', 
        border: '1px solid var(--border-color)', 
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} /> Disponibilidad de Personal
          </h2>
          <span style={{ 
            fontSize: '0.8rem', 
            fontWeight: 'bold', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#10b981', 
            padding: '4px 12px', 
            borderRadius: '20px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            Activos en Turno: {activeCount} / {operators.length}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.4' }}>
          Configura qué operarios están presentes para este turno. Solo los operarios marcados como **Activos** estarán seleccionables para asignarse a las máquinas y puestos de montaje en el borrador de producción.
        </p>

        {/* SEARCH AND BULK ACTIONS */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <input 
              type="text" 
              className="form-input" 
              style={{ minHeight: '42px', paddingLeft: '38px', fontSize: '0.88rem' }}
              placeholder="Buscar operario por nombre o nº..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '13px' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ minHeight: '42px', padding: '0 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => handleToggleAll(true)}
            >
              <Check size={14} color="#10b981" /> Activar Todos
            </button>
            <button 
              className="btn btn-secondary" 
              style={{ minHeight: '42px', padding: '0 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => handleToggleAll(false)}
            >
              <X size={14} color="#f43f5e" /> Desactivar Todos
            </button>
          </div>
        </div>
      </div>

      {/* OPERATORS GRID */}
      {filteredOperators.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          No se encontraron operarios con el término de búsqueda.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {filteredOperators.map(op => (
            <div 
              key={op.id} 
              className="history-card" 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                background: op.is_active ? 'var(--bg-card)' : 'rgba(19, 27, 46, 0.4)',
                border: op.is_active ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid var(--border-color)',
                opacity: op.is_active ? 1 : 0.7,
                transition: 'all 0.2s ease',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ 
                  fontWeight: '600', 
                  fontSize: '1.02rem', 
                  color: op.is_active ? '#ffffff' : 'var(--text-secondary)'
                }}>
                  {op.name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <Hash size={12} /> Nº {op.operator_number}
                </span>
              </div>

              {/* Toggle Switch */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  color: op.is_active ? '#10b981' : 'var(--text-muted)',
                  textTransform: 'uppercase'
                }}>
                  {op.is_active ? 'Activo' : 'Baja'}
                </span>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={!!op.is_active} 
                    onChange={() => onToggleActive(op)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
