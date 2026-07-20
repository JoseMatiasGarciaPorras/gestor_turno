import React, { useState } from 'react';
import { Cpu, UserCheck, Package, Edit2, Trash2, Plus, X, Check, AlertTriangle } from 'lucide-react';

export default function AdminCrudView({ 
  machines, operators, parts, 
  onCreateMachine, onUpdateMachine, onDeleteMachine,
  onCreateOperator, onUpdateOperator, onDeleteOperator,
  onCreatePart, onUpdatePart, onDeletePart 
}) {
  const [subTab, setSubTab] = useState('machines'); // 'machines' | 'operators' | 'parts'
  const [editingItem, setEditingItem] = useState(null); // { type, item }
  const [deletingItem, setDeletingItem] = useState(null); // { type, id, name }
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('General');
  const [location, setLocation] = useState('Sector A');
  const [description, setDescription] = useState('');

  const openCreate = () => {
    setName('');
    setCode('');
    setCategory('General');
    setLocation('Sector A');
    setDescription('');
    setShowCreateModal(true);
  };

  const openEdit = (type, item) => {
    setEditingItem({ type, item });
    setName(item.name || '');
    if (type === 'machines') {
      setCode(item.machine_number || '');
      setCategory(item.category || 'General');
      setLocation(item.location || 'Sector A');
    } else if (type === 'operators') {
      setCode(item.operator_number || '');
    } else if (type === 'parts') {
      setCode(item.references || '');
      setDescription(item.description || '');
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    const { type, id } = deletingItem;
    if (type === 'machines') onDeleteMachine(id);
    else if (type === 'operators') onDeleteOperator(id);
    else if (type === 'parts') onDeletePart(id);
    setDeletingItem(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    if (editingItem) {
      const { type, item } = editingItem;
      if (type === 'machines') {
        onUpdateMachine(item.id, { name: name.trim(), machine_number: code.trim().toUpperCase(), category, location, status: item.status });
      } else if (type === 'operators') {
        onUpdateOperator(item.id, { name: name.trim(), operator_number: code.trim().toUpperCase() });
      } else if (type === 'parts') {
        onUpdatePart(item.id, { name: name.trim(), references: code.trim().toUpperCase(), description: description.trim() });
      }
      setEditingItem(null);
    } else {
      if (subTab === 'machines') {
        onCreateMachine({ name: name.trim(), machine_number: code.trim().toUpperCase(), category, location, status: 'disponible' });
      } else if (subTab === 'operators') {
        onCreateOperator({ name: name.trim(), operator_number: code.trim().toUpperCase() });
      } else if (subTab === 'parts') {
        onCreatePart({ name: name.trim(), references: code.trim().toUpperCase(), description: description.trim() });
      }
      setShowCreateModal(false);
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <button 
          className={`btn ${subTab === 'machines' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }}
          onClick={() => setSubTab('machines')}
        >
          <Cpu size={15} /> Máquinas ({machines.length})
        </button>
        <button 
          className={`btn ${subTab === 'operators' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }}
          onClick={() => setSubTab('operators')}
        >
          <UserCheck size={15} /> Operarios ({operators.length})
        </button>
        <button 
          className={`btn ${subTab === 'parts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }}
          onClick={() => setSubTab('parts')}
        >
          <Package size={15} /> Piezas ({parts.length})
        </button>
      </div>

      <div className="section-header">
        <h2 className="section-title">
          {subTab === 'machines' && 'Gestión CRUD de Máquinas'}
          {subTab === 'operators' && 'Gestión CRUD de Operarios'}
          {subTab === 'parts' && 'Gestión CRUD de Piezas'}
        </h2>
        <button className="btn btn-primary" style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }} onClick={openCreate}>
          <Plus size={14} /> Crear Nuevo
        </button>
      </div>

      {/* ITEMS LIST WITH EDIT & DELETE BUTTONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {subTab === 'machines' && machines.map(item => (
          <div key={item.id} className="history-card">
            <div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Número: <strong style={{ color: '#60a5fa' }}>{item.machine_number}</strong> • {item.location || 'Sector A'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => openEdit('machines', item)}>
                <Edit2 size={15} color="#38bdf8" />
              </button>
              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => setDeletingItem({ type: 'machines', id: item.id, name: item.name })}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {subTab === 'operators' && operators.map(item => (
          <div key={item.id} className="history-card">
            <div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Número Operario: <strong style={{ color: '#60a5fa' }}>{item.operator_number}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => openEdit('operators', item)}>
                <Edit2 size={15} color="#38bdf8" />
              </button>
              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => setDeletingItem({ type: 'operators', id: item.id, name: item.name })}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}

        {subTab === 'parts' && parts.map(item => (
          <div key={item.id} className="history-card">
            <div>
              <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{item.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                Referencias: <strong style={{ color: '#c084fc' }}>{item.references}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => openEdit('parts', item)}>
                <Edit2 size={15} color="#38bdf8" />
              </button>
              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => setDeletingItem({ type: 'parts', id: item.id, name: item.name })}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE & EDIT MODAL SHEET */}
      {(showCreateModal || editingItem) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingItem(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingItem ? 'Editar Registro' : `Crear ${subTab === 'machines' ? 'Máquina' : subTab === 'operators' ? 'Operario' : 'Pieza'}`}
              </h3>
              <button className="close-btn" onClick={() => { setShowCreateModal(false); setEditingItem(null); }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {subTab === 'machines' && 'Número de Máquina'}
                  {subTab === 'operators' && 'Número de Operario Único'}
                  {subTab === 'parts' && 'Referencias Alfanuméricas'}
                </label>
                <input type="text" className="form-input" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>

              {subTab === 'machines' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <input type="text" className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ubicación</label>
                    <input type="text" className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                </>
              )}

              {subTab === 'parts' && (
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              )}

              <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '10px' }}>
                <Check size={18} /> {editingItem ? 'Guardar Cambios' : 'Crear Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL OVERLAY */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#ffffff' }}>¿Confirmar Eliminación?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Estás seguro de que deseas eliminar <strong>"{deletingItem.name}"</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingItem(null)}>
                Cancelar
              </button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#f43f5e', color: 'white' }} onClick={handleConfirmDelete}>
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
