import React from 'react';
import { Factory, Calendar, UserCheck, Cpu, Package, FileText, Plus } from 'lucide-react';

export default function ProductionList({ productions, onOpenNewProduction, onOpenHtmlReport }) {
  return (
    <div style={{ marginTop: '10px' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Factory size={20} color="#10b981" /> Registros de Producción
        </h2>
        <button 
          className="btn btn-primary" 
          style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }}
          onClick={onOpenNewProduction}
        >
          <Plus size={14} /> Registrar Producción
        </button>
      </div>

      {productions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
          No hay registros de producción almacenados.
        </div>
      ) : (
        productions.map(prod => (
          <div key={prod.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 'bold' }}>
                  <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  {prod.production_date} • {prod.shift_name}
                </span>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Encargado: <strong>{prod.supervisor}</strong>
                </div>
              </div>
              <button 
                className="btn btn-secondary"
                style={{ padding: '4px 10px', minHeight: '34px', fontSize: '0.78rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                onClick={() => onOpenHtmlReport(prod.id)}
              >
                <FileText size={14} /> Ver Informe HTML
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                <UserCheck size={14} color="#38bdf8" />
                <span>Op: {prod.operator ? prod.operator.name : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                <Cpu size={14} color="#a78bfa" />
                <span>Máq: {prod.machine ? prod.machine.name : 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0', gridColumn: 'span 2' }}>
                <Package size={14} color="#10b981" />
                <span>Pieza: <strong>{prod.part ? prod.part.name : 'N/A'}</strong> ({prod.part ? prod.part.references : '-'})</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>Cantidad Fabricada:</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{prod.quantity_produced} uds</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
