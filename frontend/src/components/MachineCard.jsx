import React, { useState, useEffect } from 'react';
import { User, Clock, CheckCircle, AlertTriangle, Play, Wrench } from 'lucide-react';

export default function MachineCard({ machine, onAssignShift, onCompleteShift, onChangeStatus }) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const activeShift = machine.current_shift;

  useEffect(() => {
    if (machine.status === 'en_uso' && activeShift?.start_time) {
      const calculateTime = () => {
        const start = new Date(activeShift.start_time).getTime();
        const now = new Date().getTime();
        const diffInMins = Math.floor((now - start) / (1000 * 60));
        setElapsedMinutes(Math.max(0, diffInMins));
      };

      calculateTime();
      const interval = setInterval(calculateTime, 30000); // Actualizar cada 30 seg
      return () => clearInterval(interval);
    }
  }, [machine.status, activeShift]);

  const getStatusText = (status) => {
    switch (status) {
      case 'disponible': return 'Disponible';
      case 'en_uso': return 'En Uso';
      case 'mantenimiento': return 'Mantenimiento';
      default: return status;
    }
  };

  return (
    <div className={`machine-card ${machine.status}`}>
      <div className="card-top">
        <div>
          <h3 className="machine-name">{machine.name}</h3>
          <span className="machine-code">{machine.code} • {machine.location || 'General'}</span>
        </div>
        <div className={`status-badge ${machine.status}`}>
          <span className="status-dot"></span>
          {getStatusText(machine.status)}
        </div>
      </div>

      <div className="card-body">
        {machine.status === 'en_uso' && activeShift ? (
          <>
            <div className="operator-info">
              <User size={18} color="#38bdf8" />
              <span>{activeShift.operator_name}</span>
            </div>
            <div className="time-counter">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} />
                <span>Tiempo activo:</span>
              </div>
              <span className="time-val">{elapsedMinutes} min</span>
            </div>
          </>
        ) : machine.status === 'mantenimiento' ? (
          <div className="operator-info" style={{ color: '#f43f5e' }}>
            <Wrench size={16} />
            <span>En mantenimiento técnico</span>
          </div>
        ) : (
          <div className="operator-info" style={{ color: '#10b981' }}>
            <CheckCircle size={16} />
            <span>Lista para operador</span>
          </div>
        )}
      </div>

      <div className="card-actions">
        {machine.status === 'disponible' && (
          <button className="btn btn-primary" onClick={() => onAssignShift(machine)}>
            <Play size={16} /> Iniciar Turno
          </button>
        )}

        {machine.status === 'en_uso' && (
          <button className="btn btn-success" onClick={() => onCompleteShift(activeShift.id)}>
            <CheckCircle size={16} /> Liberar
          </button>
        )}

        {machine.status !== 'mantenimiento' ? (
          <button 
            className="btn btn-danger" 
            style={{ flex: '0 0 44px' }} 
            title="Marcar Mantenimiento"
            onClick={() => onChangeStatus(machine.id, 'mantenimiento')}
          >
            <AlertTriangle size={16} />
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={() => onChangeStatus(machine.id, 'disponible')}>
            Reactivar
          </button>
        )}
      </div>
    </div>
  );
}
