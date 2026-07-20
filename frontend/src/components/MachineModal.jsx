import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function MachineModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('General');
  const [location, setLocation] = useState('Sector A');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    onSubmit({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      category: category.trim(),
      location: location.trim(),
      status: 'disponible'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Registrar Nueva Máquina</h3>
          <button className="close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nombre de la Máquina</label>
            <input 
              type="text"
              className="form-input"
              placeholder="Ej. Torno Parallelo T-200"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Código / Identificador Único</label>
            <input 
              type="text"
              className="form-input"
              placeholder="Ej. TOR-05"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="General">General</option>
              <option value="Mecanizado">Mecanizado</option>
              <option value="Corte">Corte / Plegado</option>
              <option value="Inyección">Inyección</option>
              <option value="Impresión 3D">Impresión 3D</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ubicación / Sector</label>
            <input 
              type="text"
              className="form-input"
              placeholder="Ej. Nave 1 - Sector B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            <Plus size={18} /> Guardar Máquina
          </button>
        </form>
      </div>
    </div>
  );
}
