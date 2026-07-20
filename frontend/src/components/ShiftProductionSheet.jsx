import React, { useState } from 'react';
import { Plus, Trash2, Printer, Save, Calendar, UserCheck, Cpu, Package, Check, AlertCircle } from 'lucide-react';

export default function ShiftProductionSheet({ 
  machines, operators, parts, currentSheet, onSaveSheet, onOpenHtmlReport 
}) {
  // Header controls
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftName, setShiftName] = useState('Tarde');
  const [supervisor, setSupervisor] = useState('Matias');
  const [incidentsNotes, setIncidentsNotes] = useState('Operación en planta sin novedades.');

  // Production rows
  const [items, setItems] = useState([
    {
      id: Date.now(),
      machine_name: 'RB1000',
      machine_side: 'IZQ',
      part_reference: '90100108',
      quantity_ok: 106,
      quantity_ko: 0,
      operator_number: '247',
      operator_name: 'Natalia',
      is_montaje: false
    },
    {
      id: Date.now() + 1,
      machine_name: 'NS1500',
      machine_side: 'IZQ',
      part_reference: 'L381154',
      quantity_ok: 374,
      quantity_ko: 0,
      operator_number: '214',
      operator_name: 'Diantra',
      is_montaje: false
    },
    {
      id: Date.now() + 2,
      machine_name: 'ENGEL 550',
      machine_side: 'IZQ',
      part_reference: 'L802189',
      quantity_ok: 796,
      quantity_ko: 0,
      operator_number: '237',
      operator_name: 'Rocío',
      is_montaje: false
    }
  ]);

  // Add new machine production row
  const addRow = (isMontaje = false) => {
    const defaultMac = machines[0]?.name || 'ENGEL 300';
    const defaultPart = parts[0]?.references || '90100108';
    const defaultOp = operators[0] || { name: 'Natalia', operator_number: '247' };

    const newRow = {
      id: Date.now(),
      machine_name: defaultMac,
      machine_side: 'IZQ',
      part_reference: defaultPart,
      quantity_ok: 0,
      quantity_ko: 0,
      operator_number: defaultOp.operator_number,
      operator_name: defaultOp.name,
      is_montaje: isMontaje
    };

    setItems([...items, newRow]);
  };

  const removeRow = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateRow = (id, field, value) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Auto-fill operator details if operator selected
        if (field === 'operator_name') {
          const matchedOp = operators.find(o => o.name === value);
          if (matchedOp) {
            updated.operator_number = matchedOp.operator_number;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const adjustQty = (id, field, delta) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const val = Math.max(0, (item[field] || 0) + delta);
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleSave = () => {
    const payload = {
      production_date: productionDate,
      shift_name: shiftName,
      supervisor: supervisor,
      incidents_notes: incidentsNotes,
      items: items.map(item => ({
        machine_name_manual: item.machine_name,
        machine_side: item.machine_side,
        part_reference_manual: item.part_reference,
        quantity_ok: parseInt(item.quantity_ok || 0),
        quantity_ko: parseInt(item.quantity_ko || 0),
        operator_number_manual: item.operator_number,
        operator_name_manual: item.operator_name,
        is_montaje: item.is_montaje
      }))
    };

    onSaveSheet(payload);
  };

  const plantaItems = items.filter(i => !i.is_montaje);
  const montajeItems = items.filter(i => i.is_montaje);

  const totalOk = items.reduce((acc, i) => acc + (parseInt(i.quantity_ok) || 0), 0);
  const totalKo = items.reduce((acc, i) => acc + (parseInt(i.quantity_ko) || 0), 0);

  return (
    <div style={{ marginTop: '10px' }}>
      {/* SHIFT CONTROL HEADER */}
      <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} /> Parte de Producción por Turno
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentSheet?.id && (
              <button 
                className="btn btn-secondary" 
                style={{ padding: '6px 12px', minHeight: '36px', fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                onClick={() => onOpenHtmlReport(currentSheet.id)}
              >
                <Printer size={15} /> Imprimir Hoja HTML
              </button>
            )}
            <button className="btn btn-primary" style={{ padding: '6px 14px', minHeight: '36px', fontSize: '0.82rem' }} onClick={handleSave}>
              <Save size={15} /> Guardar Parte
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div>
            <label className="form-label">DÍA / FECHA</label>
            <input type="date" className="form-input" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} required />
          </div>

          <div>
            <label className="form-label">TURNO</label>
            <select className="form-select" value={shiftName} onChange={(e) => setShiftName(e.target.value)}>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
              <option value="Noche">Noche</option>
              <option value="Especial">Especial</option>
            </select>
          </div>

          <div>
            <label className="form-label">ENCARGADO</label>
            <input type="text" className="form-input" placeholder="Ej. Matias" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} required />
          </div>
        </div>

        <div style={{ marginTop: '12px' }}>
          <label className="form-label">INCIDENCIAS / FALTA PERSONAL O NOTAS</label>
          <input type="text" className="form-input" placeholder="Escribir observaciones o falta de personal..." value={incidentsNotes} onChange={(e) => setIncidentsNotes(e.target.value)} />
        </div>
      </div>

      {/* TOTAL METRICS SUMMARY */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <div className="pill-card available" style={{ flex: 1 }}>
          <span className="pill-num" style={{ fontSize: '1.4rem' }}>{totalOk}</span>
          <span className="pill-label">Total OK Validado</span>
        </div>
        <div className="pill-card maintenance" style={{ flex: 1 }}>
          <span className="pill-num" style={{ fontSize: '1.4rem' }}>{totalKo}</span>
          <span className="pill-label">Total KO Scrap</span>
        </div>
      </div>

      {/* SECCIÓN MÁQUINAS EN PLANTA */}
      <div className="section-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={18} color="#60a5fa" /> PRODUCCIÓN MÁQUINAS EN PLANTA ({plantaItems.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => addRow(false)}>
          <Plus size={14} /> Añadir Máquina
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {plantaItems.map((item) => (
          <div key={item.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
            
            {/* ROW TOP: MACHINE & SIDE TOGGLE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <select 
                  className="form-select" 
                  style={{ minHeight: '40px', fontWeight: 'bold', fontSize: '0.95rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}
                  value={item.machine_name} 
                  onChange={(e) => updateRow(item.id, 'machine_name', e.target.value)}
                >
                  {machines.length > 0 ? machines.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  )) : (
                    <option value={item.machine_name}>{item.machine_name}</option>
                  )}
                </select>

                <button 
                  className="btn"
                  style={{ 
                    minHeight: '38px', 
                    padding: '0 12px', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold',
                    background: item.machine_side === 'IZQ' ? '#2563eb' : '#d97706',
                    color: 'white'
                  }}
                  onClick={() => updateRow(item.id, 'machine_side', item.machine_side === 'IZQ' ? 'DCH' : 'IZQ')}
                >
                  LADO: {item.machine_side}
                </button>
              </div>

              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px', flex: '0 0 auto' }} onClick={() => removeRow(item.id)}>
                <Trash2 size={15} />
              </button>
            </div>

            {/* ROW MIDDLE: PART REFERENCE & OPERATOR */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>REFERENCIA PIEZA</label>
                <input 
                  type="text"
                  className="form-input" 
                  style={{ minHeight: '40px', fontFamily: 'monospace', fontWeight: 'bold', color: '#c084fc' }}
                  placeholder="Ej. 90100108"
                  value={item.part_reference}
                  onChange={(e) => updateRow(item.id, 'part_reference', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>OPERARIO ASIGNADO</label>
                <select 
                  className="form-select" 
                  style={{ minHeight: '40px' }}
                  value={item.operator_name}
                  onChange={(e) => updateRow(item.id, 'operator_name', e.target.value)}
                >
                  {operators.map(op => (
                    <option key={op.id} value={op.name}>
                      Nº {op.operator_number} - {op.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ROW BOTTOM: PRODUCTION OK / KO COUNTERS WITH QUICK TOUCH BUTTONS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              {/* OK COUNTER */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>
                  PRODUCCIÓN OK
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ minHeight: '42px', fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981', textAlign: 'center' }}
                    value={item.quantity_ok}
                    onChange={(e) => updateRow(item.id, 'quantity_ok', e.target.value)}
                  />
                  <button className="btn btn-success" style={{ minHeight: '42px', padding: '0 10px' }} onClick={() => adjustQty(item.id, 'quantity_ok', 1)}>+1</button>
                  <button className="btn btn-success" style={{ minHeight: '42px', padding: '0 10px' }} onClick={() => adjustQty(item.id, 'quantity_ok', 10)}>+10</button>
                </div>
              </div>

              {/* KO COUNTER */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 'bold', marginBottom: '4px' }}>
                  SCRAP / KO
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ minHeight: '42px', fontWeight: 'bold', fontSize: '1.1rem', color: '#f43f5e', textAlign: 'center' }}
                    value={item.quantity_ko}
                    onChange={(e) => updateRow(item.id, 'quantity_ko', e.target.value)}
                  />
                  <button className="btn btn-danger" style={{ minHeight: '42px', padding: '0 10px' }} onClick={() => adjustQty(item.id, 'quantity_ko', 1)}>+1</button>
                </div>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* SECCIÓN MONTAJE */}
      <div className="section-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={18} color="#a78bfa" /> MONTAJE ({montajeItems.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => addRow(true)}>
          <Plus size={14} /> Añadir a Montaje
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
        {montajeItems.map((item) => (
          <div key={item.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: 'var(--bg-card)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                placeholder="Referencia Montaje (ej. IS6170080-02)"
                value={item.part_reference}
                onChange={(e) => updateRow(item.id, 'part_reference', e.target.value)}
              />
              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px', marginLeft: '8px' }} onClick={() => removeRow(item.id)}>
                <Trash2 size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>PROD OK</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ color: '#10b981', fontWeight: 'bold' }}
                  value={item.quantity_ok}
                  onChange={(e) => updateRow(item.id, 'quantity_ok', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>OPERARIO MONTAJE</label>
                <select className="form-select" value={item.operator_name} onChange={(e) => updateRow(item.id, 'operator_name', e.target.value)}>
                  {operators.map(op => (
                    <option key={op.id} value={op.name}>Nº {op.operator_number} - {op.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
