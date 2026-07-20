import React from 'react';
import { User, Clock, CheckCircle2 } from 'lucide-react';

export default function ShiftsList({ shifts, machines }) {
  const getMachineName = (machineId) => {
    const m = machines.find(item => item.id === machineId);
    return m ? `${m.name} (${m.code})` : `Máquina #${machineId}`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + date.toLocaleDateString();
  };

  return (
    <div style={{ marginTop: '10px' }}>
      <div className="section-header">
        <h2 className="section-title">Historial Reciente de Turnos</h2>
        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Últimos {shifts.length} registros</span>
      </div>

      {shifts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
          No hay turnos registrados aún.
        </div>
      ) : (
        shifts.map(shift => (
          <div key={shift.id} className="history-card">
            <div>
              <div className="history-operator" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} color="#38bdf8" />
                <span>{shift.operator_name}</span>
              </div>
              <div className="history-machine">
                {getMachineName(shift.machine_id)}
                {shift.notes && <span style={{ fontStyle: 'italic', display: 'block', marginTop: '2px', color: '#cbd5e1' }}>"{shift.notes}"</span>}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span 
                className={`status-badge ${shift.status === 'activo' ? 'en_uso' : 'disponible'}`}
                style={{ display: 'inline-flex', marginBottom: '4px' }}
              >
                {shift.status}
              </span>
              <div className="history-date">
                <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                {formatDate(shift.start_time)}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
