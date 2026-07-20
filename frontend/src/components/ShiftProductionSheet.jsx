import React, { useState, useRef } from 'react';
import { Plus, Trash2, Save, Calendar, Camera, Search, Cpu, Package } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function ShiftProductionSheet({ 
  machines, operators, parts, currentSheet, onSaveSheet, onOpenHtmlReport 
}) {
  const printSheetRef = useRef(null);

  // Header controls
  const [productionDate, setProductionDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftName, setShiftName] = useState('Tarde');
  const [supervisor, setSupervisor] = useState('Matias');
  const [incidentsNotes, setIncidentsNotes] = useState('Operación en planta sin novedades.');
  const [generatingImage, setGeneratingImage] = useState(false);

  // Active autocomplete row ID
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);

  // Flattened references list with part names and side classification
  const availableReferences = [];
  parts.forEach(p => {
    if (p.references_list && p.references_list.length > 0) {
      p.references_list.forEach(r => {
        availableReferences.push({
          part_name: p.name,
          code: r.code,
          side_type: r.side_type || 'Única'
        });
      });
    } else if (p.references) {
      availableReferences.push({
        part_name: p.name,
        code: p.references,
        side_type: 'Única'
      });
    }
  });

  // Rows state
  const [items, setItems] = useState([
    {
      id: Date.now(),
      machine_name: 'RB1000',
      machine_side: 'IZQ',
      part_name: 'Pieza 90100108',
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
      part_name: 'Conjunto Espejo Retrovisor NS1500',
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
      part_name: 'Moldura Frontal ENGEL 550',
      part_reference: 'L802189',
      quantity_ok: 796,
      quantity_ko: 0,
      operator_number: '237',
      operator_name: 'Rocío',
      is_montaje: false
    }
  ]);

  const addRow = (isMontaje = false) => {
    const defaultMac = machines[0]?.name || 'ENGEL 300';
    const defaultRefObj = availableReferences[0] || { part_name: 'Pieza General', code: '90100108', side_type: 'IZQ' };
    const defaultOp = operators[0] || { name: 'Natalia', operator_number: '247' };

    const newRow = {
      id: Date.now(),
      machine_name: defaultMac,
      machine_side: defaultRefObj.side_type || 'IZQ',
      part_name: defaultRefObj.part_name,
      part_reference: defaultRefObj.code,
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

  const selectAutocompleteRef = (rowId, refObj) => {
    setItems(items.map(item => {
      if (item.id === rowId) {
        return {
          ...item,
          part_name: refObj.part_name,
          part_reference: refObj.code,
          machine_side: refObj.side_type || 'Única'
        };
      }
      return item;
    }));
    setActiveSearchRowId(null);
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

  // Generar Imagen PNG
  const handleGenerateImage = async () => {
    if (!printSheetRef.current) return;
    setGeneratingImage(true);

    try {
      const element = printSheetRef.current;
      element.style.display = 'block';
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      element.style.display = 'none';

      const image = canvas.toDataURL("image/png");
      const filename = `parte_produccion_${productionDate}_${shiftName}.png`;

      if (navigator.canShare && navigator.share) {
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], filename, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: `Parte de Producción - ${productionDate}`,
                  text: `Parte de producción del turno ${shiftName}. Supervisor: ${supervisor}`
                });
                setGeneratingImage(false);
                return;
              } catch (shareErr) {}
            }
          }
          downloadDataUrl(image, filename);
        });
      } else {
        downloadDataUrl(image, filename);
      }
    } catch (err) {
      console.error("Error generando imagen PNG:", err);
      alert("No se pudo generar la imagen.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const downloadDataUrl = (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`¡Imagen PNG guardada como "${filename}"!`);
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
      {/* HEADER */}
      <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} /> Parte de Producción por Turno
          </h2>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-success" 
              style={{ padding: '8px 14px', minHeight: '42px', fontSize: '0.85rem', fontWeight: 'bold' }}
              onClick={handleGenerateImage}
              disabled={generatingImage}
            >
              <Camera size={18} /> {generatingImage ? 'Generando...' : '📷 Enviar Imagen a Supervisor'}
            </button>

            <button className="btn btn-primary" style={{ padding: '8px 14px', minHeight: '42px', fontSize: '0.85rem' }} onClick={handleSave}>
              <Save size={16} /> Guardar
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
          <input type="text" className="form-input" placeholder="Escribir observaciones..." value={incidentsNotes} onChange={(e) => setIncidentsNotes(e.target.value)} />
        </div>
      </div>

      {/* METRIC PILLS */}
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

      {/* MÁQUINAS EN PLANTA */}
      <div className="section-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={18} color="#60a5fa" /> PRODUCCIÓN MÁQUINAS EN PLANTA ({plantaItems.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => addRow(false)}>
          <Plus size={14} /> Añadir Máquina
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {plantaItems.map((item) => {
          const filteredSuggestions = availableReferences.filter(r => 
            r.part_name.toLowerCase().includes(item.part_name.toLowerCase()) ||
            r.code.toLowerCase().includes(item.part_reference.toLowerCase()) ||
            r.part_name.toLowerCase().includes(item.part_reference.toLowerCase())
          );

          return (
            <div key={item.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
              
              {/* CABECERA LIMPIA DE FILA: MÁQUINA + BOTÓN DE BORRAR */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <select 
                  className="form-select" 
                  style={{ flex: 1, minHeight: '40px', fontWeight: 'bold', fontSize: '0.95rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}
                  value={item.machine_name} 
                  onChange={(e) => updateRow(item.id, 'machine_name', e.target.value)}
                >
                  {machines.length > 0 ? machines.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  )) : (
                    <option value={item.machine_name}>{item.machine_name}</option>
                  )}
                </select>

                <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px', flex: '0 0 auto' }} onClick={() => removeRow(item.id)}>
                  <Trash2 size={15} />
                </button>
              </div>

              {/* INPUT DE AUTOCOMPLETADO EN VIVO DE PIEZA Y REFERENCIA */}
              <div style={{ position: 'relative' }}>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>PIEZA Y REFERENCIA ASIGNADA</span>
                  {item.part_name && <span style={{ color: '#60a5fa', fontStyle: 'italic' }}>{item.part_name}</span>}
                </label>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="text"
                      className="form-input" 
                      style={{ minHeight: '42px', fontFamily: 'monospace', fontWeight: 'bold', color: '#c084fc', paddingRight: '32px' }}
                      placeholder="Escribe pieza o ref (ej. Espejo, 90100108, L381)..."
                      value={item.part_reference}
                      onFocus={() => setActiveSearchRowId(item.id)}
                      onChange={(e) => {
                        updateRow(item.id, 'part_reference', e.target.value);
                        setActiveSearchRowId(item.id);
                      }}
                    />
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                  </div>
                </div>

                {/* DESPLEGABLE DE SUGERENCIAS */}
                {activeSearchRowId === item.id && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 90, 
                    background: '#151d33', 
                    border: '1px solid #3b82f6', 
                    borderRadius: 'var(--radius-md)', 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                    marginTop: '4px'
                  }}>
                    <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: '#94a3b8', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Sugerencias Coincidentes ({filteredSuggestions.length})</span>
                      <button style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} onClick={() => setActiveSearchRowId(null)}>Cerrar</button>
                    </div>

                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((sug, sIdx) => (
                        <div 
                          key={sIdx}
                          style={{ 
                            padding: '10px 12px', 
                            borderBottom: '1px solid rgba(255,255,255,0.05)', 
                            cursor: 'pointer',
                            display: 'flex',
                            justify: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseDown={() => selectAutocompleteRef(item.id, sug)}
                        >
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff' }}>{sug.part_name}</div>
                            <div style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#c084fc' }}>Ref: {sug.code}</div>
                          </div>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold', 
                            padding: '2px 8px', 
                            borderRadius: '10px',
                            background: sug.side_type === 'IZQ' ? 'rgba(59, 130, 246, 0.2)' : (sug.side_type === 'DCH' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'),
                            color: sug.side_type === 'IZQ' ? '#60a5fa' : (sug.side_type === 'DCH' ? '#f59e0b' : '#10b981')
                          }}>
                            {sug.side_type}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        Sin sugerencias para "{item.part_reference}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SELECCIÓN DE OPERARIO Y CONTADORES */}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', marginBottom: '4px' }}>PRODUCCIÓN OK</div>
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

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 'bold', marginBottom: '4px' }}>SCRAP / KO</div>
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
          );
        })}
      </div>

      {/* MONTAJE */}
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

      {/* PLANTILLA OCULTA PARA CAPTURA HTML2CANVAS */}
      <div 
        ref={printSheetRef}
        style={{ 
          display: 'none', 
          width: '800px', 
          padding: '24px', 
          background: '#ffffff', 
          color: '#000000', 
          fontFamily: 'Arial, sans-serif',
          border: '3px solid #000000',
          margin: '0 auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
          <div>DIA / FECHA: <span style={{ fontWeight: 'normal' }}>{productionDate}</span></div>
          <div>TURNO: <span style={{ fontWeight: 'normal' }}>{shiftName}</span></div>
          <div>ENCARGADO: <span style={{ fontWeight: 'normal' }}>{supervisor}</span></div>
        </div>

        <div style={{ background: '#000', color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>
          PRODUCCIÓN MÁQUINAS EN PLANTA
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#e2e8f0' }}>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>MÁQUINA</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>LADO</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>REFERENCIA</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD OK</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD KO</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Nº OP</th>
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>NOMBRE</th>
            </tr>
          </thead>
          <tbody>
            {plantaItems.map((i, idx) => (
              <tr key={idx}>
                <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>{i.machine_name}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{i.machine_side}</td>
                <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>{i.part_reference}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{i.quantity_ok}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: '#b91c1c' }}>{i.quantity_ko > 0 ? i.quantity_ko : ''}</td>
                <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{i.operator_number}</td>
                <td style={{ border: '1px solid #000', padding: '5px' }}>{i.operator_name}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {montajeItems.length > 0 && (
          <>
            <div style={{ background: '#000', color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>
              MONTAJE
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>REFERENCIA</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD OK</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Nº OP</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>NOMBRE</th>
                </tr>
              </thead>
              <tbody>
                {montajeItems.map((i, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>{i.part_reference}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{i.quantity_ok}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{i.operator_number}</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>{i.operator_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div style={{ border: '1px solid #000', padding: '8px', fontSize: '12px', background: '#f8fafc' }}>
          <strong>INCIDENCIAS / FALTA PERSONAL O NOTAS:</strong><br/>
          {incidentsNotes || 'Ninguna.'}
        </div>
      </div>
    </div>
  );
}
