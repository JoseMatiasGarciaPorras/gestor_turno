import React, { useState } from 'react';
import { X, Play } from 'lucide-react';

export default function ShiftModal({ machines, selectedMachine, onClose, onSubmit }) {
  const [machineId, setMachineId] = useState(selectedMachine ? selectedMachine.id : (machines[0]?.id || ''));
  const [operatorName, setOperatorName] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!operatorName.trim() || !machineId) return;

    onSubmit({
      machine_id: parseInt(machineId),
      operator_name: operatorName.trim(),
      duration_minutes: parseInt(durationMinutes),
      notes: notes.trim()
    });
  };

  const availableMachines = machines.filter(m => m.status === 'disponible');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Asignar Nuevo Turno</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Máquina Target</label>
            <select 
              className="form-select" 
              value={machineId} 
              onChange={(e) => setMachineId(e.target.value)}
              required
            >
              {availableMachines.length > 0 ? (
                availableMachines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))
              ) : (
                <option value={selectedMachine?.id || ''}>
                  {selectedMachine ? selectedMachine.name : 'No hay máquinas disponibles'}
                </option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Nombre del Operador</label>
            <input 
              type="text"
              className="form-input"
              placeholder="Ej. Juan Pérez"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Duración Estimada (Minutos)</label>
            <select 
              className="form-select" 
              value={durationMinutes} 
              onChange={(e) => setDurationMinutes(e.target.value)}
            >
              <option value={30}>30 minutos</option>
              <option value={60}>1 Hora</option>
              <option value={120}>2 Horas</option>
              <option value={240}>4 Horas</option>
              <option value={480}>Turno Completo (8 Horas)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Notas u Observaciones (Opcional)</label>
            <textarea 
              className="form-textarea"
              placeholder="Ej. Lote de producción #108"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            <Play size={18} /> Iniciar Turno Ahora
          </button>
        </form>
      </div>
    </div>
  );
}
