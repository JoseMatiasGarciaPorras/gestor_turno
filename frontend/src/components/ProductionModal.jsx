import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

export default function ProductionModal({ machines, operators, parts, onClose, onSubmit }) {
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftName, setShiftName] = useState('Mañana (06:00 - 14:00)');
  const [supervisor, setSupervisor] = useState('');
  const [machineId, setMachineId] = useState(machines[0]?.id || '');
  const [operatorId, setOperatorId] = useState(operators[0]?.id || '');
  const [partId, setPartId] = useState(parts[0]?.id || '');
  const [quantity, setQuantity] = useState(100);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!supervisor.trim() || !machineId || !operatorId || !partId) return;

    onSubmit({
      production_date: productionDate,
      shift_name: shiftName,
      supervisor: supervisor.trim(),
      machine_id: parseInt(machineId),
      operator_id: parseInt(operatorId),
      part_id: parseInt(partId),
      quantity_produced: parseInt(quantity),
      notes: notes.trim()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Reporte de Producción</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Fecha de Producción</label>
            <input 
              type="date" 
              className="form-input" 
              value={productionDate} 
              onChange={(e) => setProductionDate(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Turno</label>
            <select className="form-select" value={shiftName} onChange={(e) => setShiftName(e.target.value)}>
              <option value="Mañana (06:00 - 14:00)">Mañana (06:00 - 14:00)</option>
              <option value="Tarde (14:00 - 22:00)">Tarde (14:00 - 22:00)</option>
              <option value="Noche (22:00 - 06:00)">Noche (22:00 - 06:00)</option>
              <option value="Turno Especial / Extra">Turno Especial / Extra</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Encargado / Supervisor</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ej. Ing. Roberto Silva" 
              value={supervisor} 
              onChange={(e) => setSupervisor(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operario</label>
            <select className="form-select" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} required>
              {operators.map(op => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.operator_number})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Máquina</label>
            <select className="form-select" value={machineId} onChange={(e) => setMachineId(e.target.value)} required>
              {machines.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} [{m.machine_number}]
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pieza Producida</label>
            <select className="form-select" value={partId} onChange={(e) => setPartId(e.target.value)} required>
              {parts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.references})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Cantidad Producida (Unidades)</label>
            <input 
              type="number" 
              className="form-input" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              min="1"
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notas u Observaciones</label>
            <textarea 
              className="form-textarea" 
              placeholder="Ej. Sin incidencias de calidad." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            <Check size={18} /> Guardar Producción
          </button>
        </form>
      </div>
    </div>
  );
}
