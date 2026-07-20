import React, { useState } from 'react';
import { Cpu, UserCheck, Package, Edit2, Trash2, Plus, X, Check, AlertTriangle } from 'lucide-react';
import { getNormalizedReferences } from './ShiftProductionSheet';

export default function AdminCrudView({ 
  machines = [], operators = [], parts = [], 
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

  // Structured References for Parts
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

  const openCreate = () => {
    setName('');
    setCode('');
    setCategory('General');
    setLocation('Sector A');
    setDescription('');
    setReferencesList([
      { code: '', side_type: 'IZQ' },
      { code: '', side_type: 'DCH' }
    ]);
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
      setDescription(item.description || '');
      const refs = getNormalizedReferences(item);
      setReferencesList(refs.length > 0 ? refs : [{ code: '', side_type: 'Única' }]);
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
    if (!name.trim()) return;

    if (editingItem) {
      const { type, item } = editingItem;
      if (type === 'machines') {
        onUpdateMachine(item.id, { name: name.trim(), machine_number: code.trim().toUpperCase(), category, location, status: item.status });
      } else if (type === 'operators') {
        onUpdateOperator(item.id, { name: name.trim(), operator_number: code.trim().toUpperCase() });
      } else if (type === 'parts') {
        const validRefs = referencesList.filter(r => r.code.trim() !== '').map(r => ({ code: r.code.trim().toUpperCase(), side_type: r.side_type }));
        onUpdatePart(item.id, { name: name.trim(), description: description.trim(), references: validRefs });
      }
      setEditingItem(null);
    } else {
      if (subTab === 'machines') {
        onCreateMachine({ name: name.trim(), machine_number: code.trim().toUpperCase(), category, location, status: 'disponible' });
      } else if (subTab === 'operators') {
        onCreateOperator({ name: name.trim(), operator_number: code.trim().toUpperCase() });
      } else if (subTab === 'parts') {
        const validRefs = referencesList.filter(r => r.code.trim() !== '').map(r => ({ code: r.code.trim().toUpperCase(), side_type: r.side_type }));
        onCreatePart({ name: name.trim(), description: description.trim(), references: validRefs });
      }
      setShowCreateModal(false);
    }
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
      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <button className={`btn ${subTab === 'machines' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }} onClick={() => setSubTab('machines')}>
          <Cpu size={15} /> Máquinas ({machines.length})
        </button>
        <button className={`btn ${subTab === 'operators' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }} onClick={() => setSubTab('operators')}>
          <UserCheck size={15} /> Operarios ({operators.length})
        </button>
        <button className={`btn ${subTab === 'parts' ? 'btn-primary' : 'btn-secondary'}`} style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }} onClick={() => setSubTab('parts')}>
          <Package size={15} /> Piezas ({parts.length})
        </button>
      </div>

      <div className="section-header">
        <h2 className="section-title">
          {subTab === 'machines' && 'Gestión CRUD de Máquinas'}
          {subTab === 'operators' && 'Gestión CRUD de Operarios'}
          {subTab === 'parts' && 'Gestión CRUD de Piezas & Referencias'}
        </h2>
        <button className="btn btn-primary" style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }} onClick={openCreate}>
          <Plus size={14} /> Crear Nuevo
        </button>
      </div>

      {/* ITEMS LIST */}
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

        {subTab === 'parts' && parts.map(item => {
          const normRefs = getNormalizedReferences(item);
          return (
            <div key={item.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '1rem' }}>{item.name}</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => openEdit('parts', item)}>
                    <Edit2 size={15} color="#38bdf8" />
                  </button>
                  <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px' }} onClick={() => setDeletingItem({ type: 'parts', id: item.id, name: item.name })}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* LISTA DE REFERENCIAS ESTRUCTURADAS */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {normRefs.length > 0 ? (
                  normRefs.map((r, rIdx) => {
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
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Sin referencias asignadas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE & EDIT MODAL */}
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

              {subTab === 'machines' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Número de Máquina</label>
                    <input type="text" className="form-input" value={code} onChange={(e) => setCode(e.target.value)} required />
                  </div>
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

              {subTab === 'operators' && (
                <div className="form-group">
                  <label className="form-label">Número de Operario Único</label>
                  <input type="text" className="form-input" value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>
              )}

              {subTab === 'parts' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Descripción (Opcional)</label>
                    <input type="text" className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>

                  <div style={{ marginBottom: '14px', borderTop: '1px border-color', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label className="form-label" style={{ fontWeight: 'bold', color: '#60a5fa', margin: 0 }}>
                        REFERENCIAS DE LA PIEZA ({referencesList.length})
                      </label>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('IZQ')}>+ IZQ</button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('DCH')}>+ DCH</button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('Única')}>+ Única</button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }} onClick={() => addReferenceRow('Variante A')}>+ Var A</button>
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
                </>
              )}

              <button type="submit" className="btn btn-success" style={{ width: '100%', marginTop: '10px' }}>
                <Check size={18} /> {editingItem ? 'Guardar Cambios' : 'Crear Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => setDeletingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <AlertTriangle size={48} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#ffffff' }}>¿Confirmar Eliminación?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Estás seguro de que deseas eliminar <strong>"{deletingItem.name}"</strong>?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setDeletingItem(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#f43f5e', color: 'white' }} onClick={handleConfirmDelete}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
