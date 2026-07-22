import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Calendar, Camera, Search, Cpu, Package, Tag, CheckCircle, AlertOctagon, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

const DRAFT_KEY = 'gestor_shift_draft';

const loadSavedDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error cargando borrador:", e);
  }
  return null;
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Normalizador seguro de referencias de piezas
export function getNormalizedReferences(part) {
  if (!part) return [];
  
  if (Array.isArray(part.references_list) && part.references_list.length > 0) {
    return part.references_list.map(r => ({
      code: typeof r === 'object' && r !== null ? String(r.code || '') : String(r || ''),
      side_type: typeof r === 'object' && r !== null ? String(r.side_type || 'Única') : 'Única'
    })).filter(r => r.code.trim() !== '');
  }
  
  if (Array.isArray(part.references) && part.references.length > 0) {
    return part.references.map(r => ({
      code: typeof r === 'object' && r !== null ? String(r.code || '') : String(r || ''),
      side_type: typeof r === 'object' && r !== null ? String(r.side_type || 'Única') : 'Única'
    })).filter(r => r.code.trim() !== '');
  }
  
  if (typeof part.references === 'string' && part.references.trim() !== '') {
    return [{ code: part.references.trim(), side_type: 'Única' }];
  }
  
  return [];
}

export default function ShiftProductionSheet({ 
  machines = [], operators = [], parts = [], currentSheet, onSaveSheet, onOpenHtmlReport 
}) {
  const printSheetRef = useRef(null);
  const initialDraftRef = useRef(loadSavedDraft());
  const initialDraft = initialDraftRef.current;

  // Header controls
  const [productionDate, setProductionDate] = useState(
    initialDraft?.productionDate || getLocalDateString()
  );
  const [shiftName, setShiftName] = useState(initialDraft?.shiftName || 'Tarde');
  const [supervisor, setSupervisor] = useState(initialDraft?.supervisor || 'Matias');
  const [incidentsNotes, setIncidentsNotes] = useState(
    initialDraft?.incidentsNotes !== undefined ? initialDraft.incidentsNotes : 'Operación en planta sin novedades.'
  );
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Active autocomplete row ID
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);

  // Machine entries (restored from draft or clean default)
  const [machineEntries, setMachineEntries] = useState(
    initialDraft?.machineEntries || []
  );

  // Montaje entries (restored from draft or clean default)
  const [montajeEntries, setMontajeEntries] = useState(
    initialDraft?.montajeEntries || []
  );

  // If no saved draft exists and machineEntries is empty, populate cleanly when machines are loaded
  useEffect(() => {
    if (machineEntries.length === 0 && !initialDraft && machines.length > 0) {
      const activeMacs = machines.filter(m => m.status === 'en_uso').slice(0, 4);
      const targetMacs = activeMacs.length > 0 ? activeMacs : machines.slice(0, 3);
      
      const cleanEntries = targetMacs.map((mac, idx) => {
        const matchedPart = parts[idx % parts.length] || null;
        const normRefs = getNormalizedReferences(matchedPart);
        const subRefs = normRefs.length > 0
          ? normRefs.map((r, rIdx) => ({ id: Date.now() + idx * 10 + rIdx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
          : [{ id: Date.now() + idx, code: '', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

        const matchedOp = operators[idx % operators.length] || null;

        return {
          id: Date.now() + idx,
          machine_name: mac.name,
          part_name: matchedPart ? matchedPart.name : '',
          operator_name: matchedOp ? matchedOp.name : '',
          operator_number: matchedOp ? matchedOp.operator_number : '',
          is_montaje: false,
          references: subRefs
        };
      });

      setMachineEntries(cleanEntries);
    }
  }, [machines, parts, operators]);

  // Persistir el borrador automáticamente ante cualquier cambio
  useEffect(() => {
    const draftData = {
      productionDate,
      shiftName,
      supervisor,
      incidentsNotes,
      machineEntries,
      montajeEntries
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.error("Error guardando borrador local:", e);
    }
  }, [productionDate, shiftName, supervisor, incidentsNotes, machineEntries, montajeEntries]);

  // Handler para reiniciar el borrador
  const handleResetDraft = () => {
    setShowConfirmReset(true);
  };

  const confirmResetDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setProductionDate(getLocalDateString());
    setIncidentsNotes('Operación en planta sin novedades.');
    setMachineEntries(prev => prev.map(m => ({
      ...m,
      references: m.references.map(r => ({ ...r, quantity_ok: 0, quantity_ko: 0 }))
    })));
    setMontajeEntries(prev => prev.map(m => ({ ...m, quantity_ok: 0, quantity_ko: 0, is_csl1: false })));
    setShowConfirmReset(false);
  };

  // Añadir nueva Máquina
  const addMachineEntry = () => {
    const defaultMac = machines[0]?.name || 'ENGEL 300';
    const defaultPart = parts[0] || { name: 'Pieza General', references_list: [{ code: '90100108', side_type: 'Única' }] };
    const defaultOp = operators[0] || { name: 'Natalia', operator_number: '247' };

    const normRefs = getNormalizedReferences(defaultPart);
    const initialSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: '90100108', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    const newEntry = {
      id: Date.now(),
      machine_name: defaultMac,
      part_name: defaultPart.name,
      operator_name: defaultOp.name,
      operator_number: defaultOp.operator_number,
      is_montaje: false,
      references: initialSubRefs
    };

    setMachineEntries([...machineEntries, newEntry]);
  };

  const removeMachineEntry = (id) => {
    setMachineEntries(machineEntries.filter(m => m.id !== id));
  };

  const updateMachineField = (id, field, value) => {
    setMachineEntries(machineEntries.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'operator_name') {
          const matchedOp = operators.find(o => o.name === value);
          if (matchedOp) updated.operator_number = matchedOp.operator_number;
        }
        return updated;
      }
      return m;
    }));
  };

  // Seleccionar Pieza para una Máquina y auto-cargar TODAS sus referencias
  const selectPartForMachine = (machineId, selectedPart) => {
    const normRefs = getNormalizedReferences(selectedPart);
    const newSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: 'REF-MANUAL', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    setMachineEntries(machineEntries.map(m => {
      if (m.id === machineId) {
        return {
          ...m,
          part_name: selectedPart.name,
          references: newSubRefs
        };
      }
      return m;
    }));
    setActiveSearchRowId(null);
  };

  const removeSubReference = (machineId, subRefId) => {
    setMachineEntries(machineEntries.map(m => {
      if (m.id === machineId) {
        if (m.references.length <= 1) return m; // Al menos mantener 1
        return {
          ...m,
          references: m.references.filter(r => r.id !== subRefId)
        };
      }
      return m;
    }));
  };

  const updateSubRefQty = (machineId, subRefId, field, value) => {
    setMachineEntries(machineEntries.map(m => {
      if (m.id === machineId) {
        return {
          ...m,
          references: m.references.map(r => {
            if (r.id === subRefId) {
              return { ...r, [field]: value };
            }
            return r;
          })
        };
      }
      return m;
    }));
  };

  // Montaje Handlers
  const addMontajeEntry = () => {
    setMontajeEntries([
      ...montajeEntries,
      { id: Date.now(), part_reference: '', quantity_ok: 0, quantity_ko: 0, is_csl1: false, operator_name: operators[0]?.name || '', operator_number: operators[0]?.operator_number || '' }
    ]);
  };

  const removeMontajeEntry = (id) => {
    setMontajeEntries(montajeEntries.filter(m => m.id !== id));
  };

  const updateMontajeEntry = (id, field, value) => {
    setMontajeEntries(montajeEntries.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'operator_name') {
          const matched = operators.find(o => o.name === value);
          if (matched) updated.operator_number = matched.operator_number;
        }
        return updated;
      }
      return m;
    }));
  };

  // Calcular métricas totales acumuladas del turno
  let totalOk = 0;
  let totalKo = 0;

  machineEntries.forEach(m => {
    m.references.forEach(r => {
      totalOk += parseInt(r.quantity_ok || 0);
      totalKo += parseInt(r.quantity_ko || 0);
    });
  });

  montajeEntries.forEach(m => {
    totalOk += parseInt(m.quantity_ok || 0);
    totalKo += parseInt(m.quantity_ko || 0);
  });

  // Modal para previsualizar y descargar la imagen generada
  const [previewImage, setPreviewImage] = useState(null);

  // Generar Imagen PNG para el Supervisor
  const handleGenerateImage = async () => {
    if (!printSheetRef.current) return;
    setGeneratingImage(true);

    try {
      const element = printSheetRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Error al procesar los datos de la imagen.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const filename = `parte_produccion_${productionDate}_${shiftName}.png`;
        
        setPreviewImage({
          blobUrl,
          filename,
          blob
        });
      }, 'image/png');

    } catch (err) {
      console.error("Error generando imagen PNG:", err);
      alert("No se pudo generar la imagen. Revisa los datos ingresados.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleDownloadImage = (imgObj) => {
    if (!imgObj || !imgObj.blobUrl) return;
    const link = document.createElement('a');
    link.href = imgObj.blobUrl;
    link.download = imgObj.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = () => {
    // Transformar a lista plana de ítems para enviar al servidor
    const flatItems = [];

    machineEntries.forEach(m => {
      m.references.forEach(r => {
        flatItems.push({
          machine_name_manual: m.machine_name,
          machine_side: r.side_type,
          part_reference_manual: r.code,
          quantity_ok: parseInt(r.quantity_ok || 0),
          quantity_ko: parseInt(r.quantity_ko || 0),
          operator_number_manual: m.operator_number,
          operator_name_manual: m.operator_name,
          is_montaje: false
        });
      });
    });

    montajeEntries.forEach(m => {
      flatItems.push({
        machine_name_manual: 'MONTAJE',
        machine_side: 'IZQ',
        part_reference_manual: m.part_reference,
        quantity_ok: parseInt(m.quantity_ok || 0),
        quantity_ko: parseInt(m.quantity_ko || 0),
        operator_number_manual: m.operator_number,
        operator_name_manual: m.operator_name,
        is_montaje: true,
        is_csl1: !!m.is_csl1
      });
    });

    const payload = {
      production_date: productionDate,
      shift_name: shiftName,
      supervisor: supervisor,
      incidents_notes: incidentsNotes,
      items: flatItems
    };
    onSaveSheet(payload);
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
      {/* HEADER CONTROLS */}
      <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} /> Parte de Producción por Turno
          </h2>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ padding: '8px 14px', minHeight: '42px', fontSize: '0.85rem' }} 
              onClick={handleResetDraft}
              title="Reiniciar conteos y borrador del turno"
            >
              <RotateCcw size={16} /> Reiniciar Turno
            </button>

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
          <Cpu size={18} color="#60a5fa" /> PRODUCCIÓN MÁQUINAS EN PLANTA ({machineEntries.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={addMachineEntry}>
          <Plus size={14} /> Añadir Máquina
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {machineEntries.map((m) => {
          const filteredParts = parts.filter(p => 
            !p.is_montaje &&
            p.name.toLowerCase().includes(String(m.part_name || '').toLowerCase())
          );

          return (
            <div key={m.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: 'var(--radius-lg)' }}>
              
              {/* CABECERA DE LA MÁQUINA: SELECTOR DE MÁQUINA + OPERARIO + BOTÓN DE BORRAR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>MÁQUINA</label>
                  <select 
                    className="form-select" 
                    style={{ minHeight: '40px', fontWeight: 'bold', fontSize: '0.95rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}
                    value={m.machine_name} 
                    onChange={(e) => updateMachineField(m.id, 'machine_name', e.target.value)}
                  >
                    {machines.length > 0 ? machines.map(mac => (
                      <option key={mac.id} value={mac.name}>{mac.name}</option>
                    )) : (
                      <option value={m.machine_name}>{m.machine_name}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>OPERARIO MÁQUINA</label>
                  <select 
                    className="form-select" 
                    style={{ minHeight: '40px' }}
                    value={m.operator_name}
                    onChange={(e) => updateMachineField(m.id, 'operator_name', e.target.value)}
                  >
                    {operators.map(op => (
                      <option key={op.id} value={op.name}>
                        Nº {op.operator_number} - {op.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button className="btn btn-danger" style={{ minHeight: '40px', padding: '0 10px', marginTop: '16px' }} onClick={() => removeMachineEntry(m.id)}>
                  <Trash2 size={15} />
                </button>
              </div>

              {/* SELECTOR AUTOCOMPLETADO DE PIEZA ASIGNADA */}
              <div style={{ position: 'relative', borderTop: '1px border-color', paddingTop: '10px' }}>
                <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>PIEZA ASIGNADA A LA MÁQUINA</span>
                  <span style={{ fontStyle: 'italic', color: '#93c5fd' }}>{m.part_name}</span>
                </label>

                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input"
                    style={{ minHeight: '42px', fontWeight: 'bold', color: '#60a5fa', paddingRight: '32px' }}
                    placeholder="Escribe el nombre de la pieza (ej. Espejo, Moldura)..."
                    value={m.part_name}
                    onFocus={() => setActiveSearchRowId(m.id)}
                    onChange={(e) => {
                      updateMachineField(m.id, 'part_name', e.target.value);
                      setActiveSearchRowId(m.id);
                    }}
                  />
                  <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '13px' }} />
                </div>

                {/* DESPLEGABLE AUTOCOMPLETADO DE PIEZAS */}
                {activeSearchRowId === m.id && (
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
                      <span>Seleccionar Pieza Coincidente ({filteredParts.length})</span>
                      <button style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} onClick={() => setActiveSearchRowId(null)}>Cerrar</button>
                    </div>

                    {filteredParts.length > 0 ? (
                      filteredParts.map((p, pIdx) => {
                        const normRefs = getNormalizedReferences(p);
                        return (
                          <div 
                            key={pIdx}
                            style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                            onMouseDown={() => selectPartForMachine(m.id, p)}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff' }}>{p.name}</div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {normRefs.map((r, rIdx) => (
                                <span key={rIdx} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#c084fc', background: 'rgba(168, 85, 247, 0.15)', padding: '1px 6px', borderRadius: '8px' }}>
                                  {r.code} ({r.side_type})
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                        Sin piezas encontradas
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SUB-BLOQUES POR CADA REFERENCIA DE LA PIEZA (IZQ, DCH, A/B, Única) */}
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Tag size={14} /> REFERENCIAS DE LA PIEZA ({m.references.length})
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {m.references.map((r) => {
                    const sideStyle = getSideColor(r.side_type);
                    return (
                      <div key={r.id} style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <span style={{ 
                              fontSize: '0.72rem', 
                              fontWeight: 'bold', 
                              padding: '2px 8px', 
                              borderRadius: '10px',
                              background: sideStyle.bg,
                              color: sideStyle.text,
                              border: `1px solid ${sideStyle.border}`
                            }}>
                              LADO: {r.side_type}
                            </span>
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ flex: 1, minHeight: '34px', fontFamily: 'monospace', fontWeight: 'bold', color: '#c084fc', fontSize: '0.9rem' }}
                              value={r.code}
                              onChange={(e) => updateSubRefQty(m.id, r.id, 'code', e.target.value)}
                              placeholder="Código Ref (ej. L381154)"
                            />
                          </div>

                          {m.references.length > 1 && (
                            <button type="button" className="btn btn-danger" style={{ minHeight: '32px', padding: '0 8px' }} onClick={() => removeSubReference(m.id, r.id)}>
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>

                        {/* CONTADORES OK Y KO POR CADA REFERENCIA INDIVIDUAL */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={12} /> PROD OK ({r.side_type})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ minHeight: '38px', fontWeight: 'bold', fontSize: '1rem', color: '#10b981', textAlign: 'center' }}
                                value={r.quantity_ok}
                                onChange={(e) => updateSubRefQty(m.id, r.id, 'quantity_ok', e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertOctagon size={12} /> SCRAP KO ({r.side_type})
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input 
                                type="number" 
                                className="form-input" 
                                style={{ minHeight: '38px', fontWeight: 'bold', fontSize: '1rem', color: '#f43f5e', textAlign: 'center' }}
                                value={r.quantity_ko}
                                onChange={(e) => updateSubRefQty(m.id, r.id, 'quantity_ko', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MONTAJE */}
      <div className="section-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Package size={18} color="#a78bfa" /> MONTAJE ({montajeEntries.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={addMontajeEntry}>
          <Plus size={14} /> Añadir a Montaje
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
        {montajeEntries.map((m) => (
          <div key={m.id} className="history-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px', background: 'var(--bg-card)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '14px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <input 
                type="text" 
                className="form-input" 
                style={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                placeholder="Referencia Montaje (ej. IS6170080-02)"
                value={m.part_reference}
                onChange={(e) => updateMontajeEntry(m.id, 'part_reference', e.target.value)}
              />
              <button className="btn btn-danger" style={{ minHeight: '36px', padding: '0 10px', marginLeft: '8px' }} onClick={() => removeMontajeEntry(m.id)}>
                <Trash2 size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>PROD OK</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ color: '#10b981', fontWeight: 'bold' }}
                  value={m.quantity_ok}
                  onChange={(e) => updateMontajeEntry(m.id, 'quantity_ok', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>SCRAP KO</label>
                <input 
                  type="number" 
                  className="form-input" 
                  style={{ color: '#f43f5e', fontWeight: 'bold' }}
                  value={m.quantity_ko || 0}
                  onChange={(e) => updateMontajeEntry(m.id, 'quantity_ko', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>OPERARIO</label>
                <select className="form-select" value={m.operator_name} onChange={(e) => updateMontajeEntry(m.id, 'operator_name', e.target.value)}>
                  {operators.map(op => (
                    <option key={op.id} value={op.name}>Nº {op.operator_number} - {op.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              <input 
                type="checkbox" 
                id={`csl1-${m.id}`} 
                checked={!!m.is_csl1} 
                onChange={(e) => updateMontajeEntry(m.id, 'is_csl1', e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor={`csl1-${m.id}`} style={{ fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Selección especial CSL1
                {m.is_csl1 && <span style={{ background: '#f43f5e', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>CSL1</span>}
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* PLANTILLA OCULTA PARA CAPTURA HTML2CANVAS */}
      <div 
        ref={printSheetRef}
        style={{ 
          position: 'fixed',
          left: '-9999px',
          top: '0',
          width: '800px', 
          padding: '24px', 
          background: '#ffffff', 
          color: '#000000', 
          fontFamily: 'Arial, sans-serif',
          border: '3px solid #000000',
          zIndex: -9999
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
              <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>OPERARIO</th>
            </tr>
          </thead>
          <tbody>
            {machineEntries.map(m => (
              m.references.map((r, rIdx) => (
                <tr key={`${m.id}-${r.id}`}>
                  <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>{m.machine_name}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{r.side_type}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>{r.code}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{r.quantity_ok}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: '#b91c1c' }}>{r.quantity_ko > 0 ? r.quantity_ko : ''}</td>
                  <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{m.operator_number}</td>
                  <td style={{ border: '1px solid #000', padding: '5px' }}>{m.operator_name}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>

        {montajeEntries.length > 0 && (
          <>
            <div style={{ background: '#000', color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>
              MONTAJE
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>REFERENCIA</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD OK</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD KO</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Nº OP</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>OPERARIO</th>
                </tr>
              </thead>
              <tbody>
                {montajeEntries.map((m, idx) => (
                  <tr key={idx}>
                    <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {m.part_reference}
                      {m.is_csl1 && <span style={{ background: '#f43f5e', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px' }}>CSL1</span>}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{m.quantity_ok}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#b91c1c' }}>{m.quantity_ko > 0 ? m.quantity_ko : ''}</td>
                    <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{m.operator_number}</td>
                    <td style={{ border: '1px solid #000', padding: '5px' }}>{m.operator_name}</td>
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

      {/* MODAL PREVISUALIZACIÓN DE IMAGEN */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title">📷 Imagen Generada para Supervisor</h3>
              <button className="close-btn" onClick={() => setPreviewImage(null)}>✕</button>
            </div>
            
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>
                Revisa la imagen antes de descargarla o abrirla en una pestaña nueva:
              </p>
              
              <div style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '6px', background: '#000' }}>
                <img src={previewImage.blobUrl} alt="Parte de producción" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => window.open(previewImage.blobUrl, '_blank')}>
                👁️ Abrir en Pestaña Nueva
              </button>
              <button className="btn btn-success" onClick={() => handleDownloadImage(previewImage)}>
                📥 Descargar Imagen PNG
              </button>
              <button className="btn btn-primary" onClick={() => setPreviewImage(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA REINICIAR TURNO */}
      {showConfirmReset && (
        <div className="modal-overlay" onClick={() => setShowConfirmReset(false)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <RotateCcw size={48} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#ffffff' }}>¿Reiniciar Turno?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Estás seguro de que deseas reiniciar el borrador del turno? Se limpiarán los contadores e incidencias.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirmReset(false)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#f43f5e', color: 'white' }} onClick={confirmResetDraft}>Sí, Reiniciar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
