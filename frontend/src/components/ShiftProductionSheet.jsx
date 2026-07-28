import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Calendar, Camera, Search, Cpu, Package, Tag, CheckCircle, AlertOctagon, RotateCcw } from 'lucide-react';
import html2canvas from 'html2canvas';

const DRAFT_KEY = 'gestor_shift_draft';

const loadSavedDraft = () => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old montage format to references format if needed
      if (parsed && Array.isArray(parsed.montajeEntries)) {
        parsed.montajeEntries = parsed.montajeEntries.map(m => {
          if (m && m.part_reference !== undefined && !m.references) {
            return {
              id: m.id,
              part_name: m.part_name || 'Pieza General',
              operator_name: m.operator_name,
              operator_number: m.operator_number,
              is_montaje: true,
              is_csl1: !!m.is_csl1,
              references: [{ id: Date.now(), code: m.part_reference, side_type: 'Única', quantity_ok: m.quantity_ok || 0, quantity_ko: m.quantity_ko || 0 }]
            };
          }
          return m;
        });
      }
      return parsed;
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
  machines = [], operators = [], parts = [], currentSheet, onSaveSheet, onOpenHtmlReport, onUpdateMachine, currentUser
}) {
  const printSheetRef = useRef(null);
  const initialDraftRef = useRef(loadSavedDraft());
  const initialDraft = initialDraftRef.current;

  // Header controls
  const [productionDate, setProductionDate] = useState(
    initialDraft?.productionDate || getLocalDateString()
  );
  const [shiftName, setShiftName] = useState(initialDraft?.shiftName || 'Tarde');
  const [supervisor, setSupervisor] = useState(
    currentUser 
      ? (currentUser.full_name || currentUser.email)
      : (initialDraft?.supervisor || 'Matias')
  );
  const [incidentsNotes, setIncidentsNotes] = useState(
    initialDraft?.incidentsNotes !== undefined ? initialDraft.incidentsNotes : 'Operación en planta sin novedades.'
  );
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Active autocomplete row ID
  const [activeSearchRowId, setActiveSearchRowId] = useState(null);

  // Active modal editor row ID
  const [editingEntry, setEditingEntry] = useState(null); // { type: 'machine' | 'montaje' | 'revision', id: number }

  // Machine entries (restored from draft or clean default)
  const [machineEntries, setMachineEntries] = useState(
    initialDraft?.machineEntries || []
  );

  // Montaje entries (restored from draft or clean default)
  const [montajeEntries, setMontajeEntries] = useState(
    initialDraft?.montajeEntries || []
  );

  // Revision entries (restored from draft or clean default)
  const [revisionEntries, setRevisionEntries] = useState(
    initialDraft?.revisionEntries || []
  );

  // Sincronizar el encargado con el usuario de la sesión actual
  useEffect(() => {
    if (currentUser) {
      const currentName = currentUser.full_name || currentUser.email;
      if (currentName && supervisor !== currentName) {
        setSupervisor(currentName);
      }
    }
  }, [currentUser]);

  // Sincronizar machineEntries con el estado machines de la base de datos
  useEffect(() => {
    if (machines.length > 0) {
      const activeMacs = machines.filter(m => m.status === 'en_uso');
      
      setMachineEntries(prevEntries => {
        const newEntries = activeMacs.map(mac => {
          const existing = prevEntries.find(e => e.id === mac.id || e.machine_name === mac.name);
          const assignedPartName = mac.assigned_part?.name || '';
          
          if (existing) {
            if (existing.part_name !== assignedPartName) {
              const normRefs = getNormalizedReferences(mac.assigned_part);
              const newSubRefs = normRefs.length > 0 
                ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
                : [{ id: Date.now(), code: '', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];
              return {
                ...existing,
                id: mac.id,
                part_name: assignedPartName,
                references: newSubRefs
              };
            }
            return { ...existing, id: mac.id };
          } else {
            const assignedPart = mac.assigned_part;
            const normRefs = getNormalizedReferences(assignedPart);
            const subRefs = normRefs.length > 0
              ? normRefs.map((r, rIdx) => ({ id: Date.now() + rIdx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
              : [{ id: Date.now(), code: '', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];
            
            return {
              id: mac.id,
              machine_name: mac.name,
              part_name: assignedPartName,
              operator_name: '',
              operator_number: '',
              is_montaje: false,
              references: subRefs
            };
          }
        });
        return newEntries;
      });
    }
  }, [machines]);

  // Persistir el borrador automáticamente ante cualquier cambio
  useEffect(() => {
    const draftData = {
      productionDate,
      shiftName,
      supervisor,
      incidentsNotes,
      machineEntries,
      montajeEntries,
      revisionEntries
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    } catch (e) {
      console.error("Error guardando borrador local:", e);
    }
  }, [productionDate, shiftName, supervisor, incidentsNotes, machineEntries, montajeEntries, revisionEntries]);

  // Desasignar operario si una máquina deja de pertenecer al grupo de Máquinas Pequeñas
  const prevMachinesRef = useRef(machines);
  useEffect(() => {
    const prevMachines = prevMachinesRef.current;
    if (prevMachines && prevMachines.length > 0 && machines.length > 0) {
      const transitionedToNotSmall = [];
      machines.forEach(mac => {
        const prevMac = prevMachines.find(m => m.id === mac.id);
        if (prevMac && prevMac.is_small && !mac.is_small) {
          transitionedToNotSmall.push(mac.name);
        }
      });

      if (transitionedToNotSmall.length > 0) {
        setMachineEntries(prev => prev.map(entry => {
          if (transitionedToNotSmall.includes(entry.machine_name)) {
            return { ...entry, operator_name: '', operator_number: '' };
          }
          return entry;
        }));
      }
    }
    prevMachinesRef.current = machines;
  }, [machines]);

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
      references: (m.references || []).map(r => ({ ...r, quantity_ok: 0, quantity_ko: 0 }))
    })));
    setMontajeEntries(prev => prev.map(m => {
      const updated = { ...m, quantity_ok: 0, quantity_ko: 0, is_csl1: false };
      if (Array.isArray(m.references)) {
        updated.references = m.references.map(r => ({ ...r, quantity_ok: 0, quantity_ko: 0 }));
      }
      return updated;
    }));
    setRevisionEntries(prev => prev.map(m => {
      const updated = { ...m, quantity_ok: 0, quantity_ko: 0 };
      if (Array.isArray(m.references)) {
        updated.references = m.references.map(r => ({ ...r, quantity_ok: 0, quantity_ko: 0 }));
      }
      return updated;
    }));
    setShowConfirmReset(false);
  };

  // Añadir nueva Máquina
  const addMachineEntry = () => {
    // Buscar una máquina que no esté ya activa
    const activeNames = machineEntries.map(e => e.machine_name);
    const availableMac = machines.find(m => m.status !== 'en_uso' && !activeNames.includes(m.name)) || 
                         machines.find(m => !activeNames.includes(m.name)) || 
                         machines[0];
    
    if (!availableMac) return;

    const defaultPart = parts[0];

    // Marcar en uso en la base de datos
    onUpdateMachine(availableMac.id, {
      name: availableMac.name,
      machine_number: availableMac.machine_number,
      category: availableMac.category,
      location: availableMac.location,
      is_small: availableMac.is_small,
      status: 'en_uso',
      assigned_part_id: defaultPart ? defaultPart.id : null
    });

    setEditingEntry({ type: 'machine', id: availableMac.id });
  };

  const removeMachineEntry = (id) => {
    const mac = machines.find(m => m.id === id);
    if (mac) {
      onUpdateMachine(id, {
        name: mac.name,
        machine_number: mac.machine_number,
        category: mac.category,
        location: mac.location,
        is_small: mac.is_small,
        status: 'disponible',
        assigned_part_id: null
      });
    }
    setMachineEntries(prev => prev.filter(m => m.id !== id));
  };

  const updateMachineField = (id, field, value) => {
    const entryToUpdate = machineEntries.find(m => m.id === id);
    if (!entryToUpdate) return;

    if (field === 'operator_name') {
      const matchedOp = operators.find(o => o.name === value);
      const operatorNumber = matchedOp ? matchedOp.operator_number : '';

      // Comprobar si la máquina que se está editando pertenece al grupo de Máquinas Pequeñas
      const currentMac = machines.find(mac => mac.name === entryToUpdate.machine_name);
      const isCurrentMacSmall = currentMac ? !!currentMac.is_small : false;

      setMachineEntries(prev => prev.map(m => {
        if (m.id === id) {
          return { ...m, operator_name: value, operator_number: operatorNumber };
        }
        // Si la máquina modificada es pequeña, sincronizar con todas las demás máquinas pequeñas activas
        if (isCurrentMacSmall) {
          const macDetails = machines.find(mac => mac.name === m.machine_name);
          if (macDetails && macDetails.is_small) {
            return { ...m, operator_name: value, operator_number: operatorNumber };
          }
        }
        return m;
      }));
    } else if (field === 'machine_name') {
      const oldMac = machines.find(m => m.id === id);
      const targetMacDetails = machines.find(mac => mac.name === value);
      
      if (oldMac && targetMacDetails) {
        const currentPart = parts.find(p => p.name === entryToUpdate.part_name);
        
        // Liberar la máquina anterior
        onUpdateMachine(oldMac.id, {
          name: oldMac.name,
          machine_number: oldMac.machine_number,
          category: oldMac.category,
          location: oldMac.location,
          is_small: oldMac.is_small,
          status: 'disponible',
          assigned_part_id: null
        });

        // Ocupar la nueva máquina
        onUpdateMachine(targetMacDetails.id, {
          name: targetMacDetails.name,
          machine_number: targetMacDetails.machine_number,
          category: targetMacDetails.category,
          location: targetMacDetails.location,
          is_small: targetMacDetails.is_small,
          status: 'en_uso',
          assigned_part_id: currentPart ? currentPart.id : null
        });

        setEditingEntry({ type: 'machine', id: targetMacDetails.id });
      }
    } else {
      setMachineEntries(prev => prev.map(m => (m.id === id ? { ...m, [field]: value } : m)));
    }
  };

  // Seleccionar Pieza para una Máquina y auto-cargar TODAS sus referencias
  const selectPartForMachine = (machineId, selectedPart) => {
    const normRefs = getNormalizedReferences(selectedPart);
    const newSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: 'REF-MANUAL', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    const mac = machines.find(m => m.id === machineId);
    if (mac) {
      onUpdateMachine(machineId, {
        name: mac.name,
        machine_number: mac.machine_number,
        category: mac.category,
        location: mac.location,
        is_small: mac.is_small,
        status: 'en_uso',
        assigned_part_id: selectedPart.id
      });
    }

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
    const activeOps = operators.filter(o => o.is_active !== false);
    const defaultOp = activeOps[0] || operators[0] || { name: 'Natalia', operator_number: '247' };
    
    // Find the first assembly part if available
    const montageParts = parts.filter(p => p.is_montaje);
    const defaultPart = montageParts[0] || parts[0] || { name: 'Pieza Montaje', references_list: [{ code: 'REF-MONTAJE', side_type: 'Única' }] };
    
    const normRefs = getNormalizedReferences(defaultPart);
    const initialSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: '', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    const newId = Date.now();
    setMontajeEntries([
      ...montajeEntries,
      {
        id: newId,
        part_name: defaultPart.name,
        operator_name: defaultOp.name,
        operator_number: defaultOp.operator_number,
        is_montaje: true,
        is_csl1: false,
        references: initialSubRefs
      }
    ]);
    setEditingEntry({ type: 'montaje', id: newId });
  };

  const removeMontajeEntry = (id) => {
    setMontajeEntries(montajeEntries.filter(m => m.id !== id));
  };

  const updateMontajeField = (id, field, value) => {
    setMontajeEntries(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'operator_name') {
          const matchedOp = operators.find(o => o.name === value);
          updated.operator_number = matchedOp ? matchedOp.operator_number : '';
        }
        return updated;
      }
      return m;
    }));
  };

  const selectPartForMontaje = (entryId, selectedPart) => {
    const normRefs = getNormalizedReferences(selectedPart);
    const newSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: 'REF-MANUAL', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    setMontajeEntries(montajeEntries.map(m => {
      if (m.id === entryId) {
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

  const updateMontajeSubRefQty = (entryId, subRefId, field, value) => {
    setMontajeEntries(montajeEntries.map(m => {
      if (m.id === entryId) {
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

  const removeMontajeSubReference = (entryId, subRefId) => {
    setMontajeEntries(montajeEntries.map(m => {
      if (m.id === entryId) {
        if (m.references.length <= 1) return m;
        return {
          ...m,
          references: m.references.filter(r => r.id !== subRefId)
        };
      }
      return m;
    }));
  };

  // Revision Handlers
  const addRevisionEntry = () => {
    const activeOps = operators.filter(o => o.is_active !== false);
    const defaultOp = activeOps[0] || operators[0] || { name: 'Natalia', operator_number: '247' };
    
    // Cualquiera de las piezas de la lista (primera pieza)
    const defaultPart = parts[0] || { name: 'Pieza Revisión', references_list: [{ code: 'REF-REVISION', side_type: 'Única' }] };
    
    const normRefs = getNormalizedReferences(defaultPart);
    const initialSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: '', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    const newId = Date.now();
    setRevisionEntries([
      ...revisionEntries,
      {
        id: newId,
        part_name: defaultPart.name,
        operator_name: defaultOp.name,
        operator_number: defaultOp.operator_number,
        is_montaje: false,
        is_revision: true,
        is_csl1: true,
        references: initialSubRefs
      }
    ]);
    setEditingEntry({ type: 'revision', id: newId });
  };

  const removeRevisionEntry = (id) => {
    setRevisionEntries(revisionEntries.filter(m => m.id !== id));
  };

  const updateRevisionField = (id, field, value) => {
    setRevisionEntries(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'operator_name') {
          const matchedOp = operators.find(o => o.name === value);
          updated.operator_number = matchedOp ? matchedOp.operator_number : '';
        }
        return updated;
      }
      return m;
    }));
  };

  const selectPartForRevision = (entryId, selectedPart) => {
    const normRefs = getNormalizedReferences(selectedPart);
    const newSubRefs = normRefs.length > 0 
      ? normRefs.map((r, idx) => ({ id: Date.now() + idx, code: r.code, side_type: r.side_type, quantity_ok: 0, quantity_ko: 0 }))
      : [{ id: Date.now(), code: 'REF-MANUAL', side_type: 'Única', quantity_ok: 0, quantity_ko: 0 }];

    setRevisionEntries(revisionEntries.map(m => {
      if (m.id === entryId) {
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

  const updateRevisionSubRefQty = (entryId, subRefId, field, value) => {
    setRevisionEntries(revisionEntries.map(m => {
      if (m.id === entryId) {
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

  const removeRevisionSubReference = (entryId, subRefId) => {
    setRevisionEntries(revisionEntries.map(m => {
      if (m.id === entryId) {
        if (m.references.length <= 1) return m;
        return {
          ...m,
          references: m.references.filter(r => r.id !== subRefId)
        };
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
    if (Array.isArray(m.references)) {
      m.references.forEach(r => {
        totalOk += parseInt(r.quantity_ok || 0);
        totalKo += parseInt(r.quantity_ko || 0);
      });
    } else {
      totalOk += parseInt(m.quantity_ok || 0);
      totalKo += parseInt(m.quantity_ko || 0);
    }
  });

  revisionEntries.forEach(m => {
    if (Array.isArray(m.references)) {
      m.references.forEach(r => {
        totalOk += parseInt(r.quantity_ok || 0);
        totalKo += parseInt(r.quantity_ko || 0);
      });
    }
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

  const handleShareImage = async (imgObj) => {
    if (!imgObj || !imgObj.blob) return;
    try {
      const file = new File([imgObj.blob], imgObj.filename, { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Parte de Producción ${productionDate}`,
          text: `Parte de producción - Turno ${shiftName} (Supervisor: ${supervisor})`
        });
      } else {
        alert("Tu navegador o dispositivo no soporta compartir imágenes de forma directa. Por favor, descarga la imagen y compártela.");
      }
    } catch (err) {
      console.warn("Error al compartir la imagen:", err);
    }
  };

  const handleCopySummary = () => {
    const summaryText = `📋 *PARTE DE PRODUCCIÓN DIARIO*
📅 *Fecha:* ${productionDate}
🕒 *Turno:* ${shiftName}
👤 *Encargado:* ${supervisor}

✅ *Total OK:* ${totalOk}
❌ *Total KO (Scrap):* ${totalKo}

📝 *Incidencias/Falta Personal:*
${incidentsNotes || 'Ninguna.'}`;

    navigator.clipboard.writeText(summaryText)
      .then(() => {
        alert("¡Resumen de WhatsApp copiado al portapapeles con éxito!");
      })
      .catch(err => {
        console.error("Error al copiar texto: ", err);
        alert("No se pudo copiar automáticamente. Por favor copia las notas manualmente.");
      });
  };

  const handleSave = () => {
    // Transformar a lista plana de ítems para enviar al servidor
    const flatItems = [];

    machineEntries.forEach(m => {
      // Buscar IDs correspondientes
      const machineObj = machines.find(mac => mac.name === m.machine_name);
      const machineId = machineObj ? machineObj.id : null;

      const operatorObj = operators.find(op => op.name === m.operator_name);
      const operatorId = operatorObj ? operatorObj.id : null;

      const partObj = parts.find(p => p.name === m.part_name);
      const partId = partObj ? partObj.id : null;

      m.references.forEach(r => {
        flatItems.push({
          machine_id: machineId,
          machine_name_manual: m.machine_name,
          machine_side: r.side_type,
          part_id: partId,
          part_reference_manual: r.code,
          quantity_ok: parseInt(r.quantity_ok || 0),
          quantity_ko: parseInt(r.quantity_ko || 0),
          operator_id: operatorId,
          operator_number_manual: m.operator_number,
          operator_name_manual: m.operator_name,
          is_montaje: false
        });
      });
    });

    montajeEntries.forEach(m => {
      const operatorObj = operators.find(op => op.name === m.operator_name);
      const operatorId = operatorObj ? operatorObj.id : null;

      const partObj = parts.find(p => p.name === m.part_name);
      const partId = partObj ? partObj.id : null;

      if (Array.isArray(m.references)) {
        m.references.forEach(r => {
          flatItems.push({
            machine_name_manual: 'MONTAJE',
            machine_side: r.side_type || 'IZQ',
            part_id: partId,
            part_reference_manual: r.code,
            quantity_ok: parseInt(r.quantity_ok || 0),
            quantity_ko: parseInt(r.quantity_ko || 0),
            operator_id: operatorId,
            operator_number_manual: m.operator_number,
            operator_name_manual: m.operator_name,
            is_montaje: true,
            is_csl1: !!m.is_csl1
          });
        });
      } else {
        // Fallback for legacy format
        let fallbackPartId = null;
        const matchedPart = parts.find(p => 
          p.is_montaje && 
          p.references_list && 
          p.references_list.some(ref => ref.code.toUpperCase() === m.part_reference.toUpperCase())
        );
        if (matchedPart) {
          fallbackPartId = matchedPart.id;
        }

        flatItems.push({
          machine_name_manual: 'MONTAJE',
          machine_side: 'IZQ',
          part_id: fallbackPartId,
          part_reference_manual: m.part_reference,
          quantity_ok: parseInt(m.quantity_ok || 0),
          quantity_ko: parseInt(m.quantity_ko || 0),
          operator_id: operatorId,
          operator_number_manual: m.operator_number,
          operator_name_manual: m.operator_name,
          is_montaje: true,
          is_csl1: !!m.is_csl1
        });
      }
    });

    revisionEntries.forEach(m => {
      const operatorObj = operators.find(op => op.name === m.operator_name);
      const operatorId = operatorObj ? operatorObj.id : null;

      const partObj = parts.find(p => p.name === m.part_name);
      const partId = partObj ? partObj.id : null;

      if (Array.isArray(m.references)) {
        m.references.forEach(r => {
          flatItems.push({
            machine_name_manual: 'REVISION',
            machine_side: r.side_type || 'Única',
            part_id: partId,
            part_reference_manual: r.code,
            quantity_ok: parseInt(r.quantity_ok || 0),
            quantity_ko: parseInt(r.quantity_ko || 0),
            operator_id: operatorId,
            operator_number_manual: m.operator_number,
            operator_name_manual: m.operator_name,
            is_montaje: false,
            is_csl1: true
          });
        });
      }
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

  // Modal de edición enfocado para cada tarjeta
  const renderEntryEditorModal = () => {
    if (!editingEntry) return null;
    const isMachine = editingEntry.type === 'machine';
    const isRevision = editingEntry.type === 'revision';
    
    const m = isMachine 
      ? machineEntries.find(e => e.id === editingEntry.id)
      : (isRevision 
         ? revisionEntries.find(e => e.id === editingEntry.id)
         : montajeEntries.find(e => e.id === editingEntry.id));
      
    if (!m) return null;

    return (
      <div className="modal-overlay" onClick={() => setEditingEntry(null)} style={{ zIndex: 1000 }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%', overflowY: 'auto', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 'bold', color: isMachine ? '#60a5fa' : (isRevision ? '#06b6d4' : '#a78bfa'), margin: 0 }}>
              {isMachine ? <Cpu size={20} /> : (isRevision ? <CheckCircle size={20} /> : <Package size={20} />)}
              {isMachine 
                ? `Editar Asignación - ${m.machine_name || 'Máquina'}`
                : (isRevision 
                   ? `Editar Asignación - Revisión CSL1: ${m.part_name || 'Pieza'}`
                   : `Editar Asignación - Montaje: ${m.part_name || 'Pieza'}`)
              }
            </h3>
            <button style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '1.2rem', cursor: 'pointer', padding: 0 }} onClick={() => setEditingEntry(null)}>✕</button>
          </div>

          {/* Form Content */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* 1. Selectores e Inputs principales */}
            {isMachine ? (
              /* MÁQUINA + OPERARIO */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '0.7rem', margin: 0 }}>MÁQUINA</label>
                    {machines.find(mac => mac.name === m.machine_name)?.is_small && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 'bold', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 4px', borderRadius: '3px', border: '1px solid rgba(56, 189, 248, 0.3)', lineHeight: 1 }}>
                        PEQUEÑA
                      </span>
                    )}
                  </div>
                  <select 
                    className="form-select" 
                    style={{ minHeight: '40px', fontWeight: 'bold', fontSize: '0.95rem', background: 'rgba(59, 130, 246, 0.15)', color: '#93c5fd' }}
                    value={m.machine_name} 
                    onChange={(e) => updateMachineField(m.id, 'machine_name', e.target.value)}
                  >
                    {machines.length > 0 ? machines.map(mac => (
                      <option key={mac.id} value={mac.name}>
                        {mac.name}{mac.is_small ? ' (Pequeña)' : ''}
                      </option>
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
                    {(() => {
                      const activeOps = operators.filter(op => op.is_active !== false);
                      const list = [...activeOps];
                      if (m.operator_name && !list.some(op => op.name === m.operator_name)) {
                        const matched = operators.find(op => op.name === m.operator_name);
                        if (matched) list.push(matched);
                      }
                      return list.map(op => (
                        <option key={op.id} value={op.name}>
                          Nº {op.operator_number} - {op.name}{!op.is_active ? ' (Inactivo)' : ''}
                        </option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            ) : (
              /* OPERARIO DE MONTAJE/REVISION */
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>OPERARIO {isRevision ? 'REVISIÓN' : 'MONTAJE'}</label>
                <select 
                  className="form-select" 
                  style={{ minHeight: '40px' }}
                  value={m.operator_name}
                  onChange={(e) => {
                    if (isRevision) {
                      updateRevisionField(m.id, 'operator_name', e.target.value);
                    } else {
                      updateMontajeField(m.id, 'operator_name', e.target.value);
                    }
                  }}
                >
                  {(() => {
                    const activeOps = operators.filter(op => op.is_active !== false);
                    const list = [...activeOps];
                    if (m.operator_name && !list.some(op => op.name === m.operator_name)) {
                      const matched = operators.find(op => op.name === m.operator_name);
                      if (matched) list.push(matched);
                    }
                    return list.map(op => (
                      <option key={op.id} value={op.name}>
                        Nº {op.operator_number} - {op.name}{!op.is_active ? ' (Inactivo)' : ''}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            )}

            {/* 2. Selector Autocompletado de Pieza */}
            <div style={{ position: 'relative', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.72rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: isMachine ? '#60a5fa' : (isRevision ? '#06b6d4' : '#a78bfa') }}>PIEZA ASIGNADA</span>
                <span style={{ fontStyle: 'italic', color: isMachine ? '#93c5fd' : (isRevision ? '#22d3ee' : '#c084fc') }}>{m.part_name}</span>
              </label>

              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-input"
                  style={{ minHeight: '42px', fontWeight: 'bold', color: isMachine ? '#60a5fa' : (isRevision ? '#06b6d4' : '#a78bfa'), paddingRight: '32px' }}
                  placeholder="Escribe el nombre de la pieza (ej. Espejo, Moldura)..."
                  value={m.part_name}
                  onFocus={() => setActiveSearchRowId(m.id)}
                  onChange={(e) => {
                    if (isMachine) {
                      updateMachineField(m.id, 'part_name', e.target.value);
                    } else if (isRevision) {
                      updateRevisionField(m.id, 'part_name', e.target.value);
                    } else {
                      updateMontajeField(m.id, 'part_name', e.target.value);
                    }
                    setActiveSearchRowId(m.id);
                  }}
                />
                <Search size={16} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '13px' }} />
              </div>

              {/* Autocomplete Dropdown */}
              {activeSearchRowId === m.id && (() => {
                const filteredParts = isMachine 
                  ? parts.filter(p => !p.is_montaje && p.name.toLowerCase().includes(String(m.part_name || '').toLowerCase()))
                  : (isRevision 
                     ? parts.filter(p => p.name.toLowerCase().includes(String(m.part_name || '').toLowerCase()))
                     : parts.filter(p => p.is_montaje && p.name.toLowerCase().includes(String(m.part_name || '').toLowerCase())));

                const listToRender = filteredParts.length > 0
                  ? filteredParts
                  : (isMachine 
                     ? parts.filter(p => !p.is_montaje) 
                     : (isRevision 
                        ? parts 
                        : parts.filter(p => p.is_montaje)));

                return (
                  <div style={{ 
                    position: 'absolute', 
                    top: '100%', 
                    left: 0, 
                    right: 0, 
                    zIndex: 99, 
                    background: '#151d33', 
                    border: `1px solid ${isMachine ? '#3b82f6' : (isRevision ? '#06b6d4' : '#a78bfa')}`, 
                    borderRadius: 'var(--radius-md)', 
                    maxHeight: '180px', 
                    overflowY: 'auto',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.5)',
                    marginTop: '4px'
                  }}>
                    <div style={{ padding: '6px 10px', fontSize: '0.7rem', color: '#94a3b8', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Seleccionar Pieza Coincidente ({listToRender.length})</span>
                      <button style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer' }} onClick={() => setActiveSearchRowId(null)}>Cerrar</button>
                    </div>

                    {listToRender.length > 0 ? (
                      listToRender.slice(0, 10).map((p, pIdx) => {
                         const normRefs = getNormalizedReferences(p);
                         return (
                          <div 
                            key={pIdx}
                            style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                            onMouseDown={() => {
                              if (isMachine) {
                                selectPartForMachine(m.id, p);
                              } else if (isRevision) {
                                selectPartForRevision(m.id, p);
                              } else {
                                selectPartForMontaje(m.id, p);
                              }
                            }}
                          >
                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff' }}>{p.name}</div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {normRefs.map((r, rIdx) => (
                                <span key={rIdx} style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: isRevision ? '#22d3ee' : '#c084fc', background: isRevision ? 'rgba(6, 182, 212, 0.15)' : 'rgba(168, 85, 247, 0.15)', padding: '1px 6px', borderRadius: '8px' }}>
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
                );
              })()}
            </div>

            {/* 3. Sub-bloques de Referencias */}
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: isRevision ? '#06b6d4' : '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} /> REFERENCIAS DE LA PIEZA ({(m.references || []).length})
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(m.references || []).map((r) => {
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
                            {r.side_type}
                          </span>
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ flex: 1, minHeight: '34px', fontFamily: 'monospace', fontWeight: 'bold', color: isRevision ? '#22d3ee' : '#c084fc', fontSize: '0.9rem' }}
                            value={r.code}
                            onChange={(e) => {
                              if (isMachine) {
                                updateSubRefQty(m.id, r.id, 'code', e.target.value);
                              } else if (isRevision) {
                                updateRevisionSubRefQty(m.id, r.id, 'code', e.target.value);
                              } else {
                                updateMontajeSubRefQty(m.id, r.id, 'code', e.target.value);
                              }
                            }}
                            placeholder="Código Ref"
                          />
                        </div>

                        {(m.references || []).length > 1 && (
                          <button type="button" className="btn btn-danger" style={{ minHeight: '32px', padding: '0 8px' }} onClick={() => {
                            if (isMachine) {
                              removeSubReference(m.id, r.id);
                            } else if (isRevision) {
                              removeRevisionSubReference(m.id, r.id);
                            } else {
                              removeMontajeSubReference(m.id, r.id);
                            }
                          }}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* OK / KO Contadores */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle size={12} /> PROD OK
                          </div>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ minHeight: '38px', fontWeight: 'bold', fontSize: '1rem', color: '#10b981', textAlign: 'center' }}
                            value={r.quantity_ok}
                            onChange={(e) => {
                              if (isMachine) {
                                updateSubRefQty(m.id, r.id, 'quantity_ok', e.target.value);
                              } else if (isRevision) {
                                updateRevisionSubRefQty(m.id, r.id, 'quantity_ok', e.target.value);
                              } else {
                                updateMontajeSubRefQty(m.id, r.id, 'quantity_ok', e.target.value);
                              }
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ fontSize: '0.7rem', color: '#f43f5e', fontWeight: 'bold', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertOctagon size={12} /> SCRAP KO
                          </div>
                          <input 
                            type="number" 
                            className="form-input" 
                            style={{ minHeight: '38px', fontWeight: 'bold', fontSize: '1rem', color: '#f43f5e', textAlign: 'center' }}
                            value={r.quantity_ko}
                            onChange={(e) => {
                              if (isMachine) {
                                updateSubRefQty(m.id, r.id, 'quantity_ko', e.target.value);
                              } else if (isRevision) {
                                updateRevisionSubRefQty(m.id, r.id, 'quantity_ko', e.target.value);
                              } else {
                                updateMontajeSubRefQty(m.id, r.id, 'quantity_ko', e.target.value);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. CSL1 (Solo para montaje/revision) */}
            {!isMachine && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input 
                  type="checkbox" 
                  id={`modal-csl1-${m.id}`} 
                  checked={!!m.is_csl1} 
                  disabled={isRevision} // For revision, CSL1 is always true/forced
                  onChange={(e) => {
                    if (isRevision) {
                      updateRevisionField(m.id, 'is_csl1', e.target.checked);
                    } else {
                      updateMontajeField(m.id, 'is_csl1', e.target.checked);
                    }
                  }} 
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor={`modal-csl1-${m.id}`} style={{ fontSize: '0.78rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Selección especial CSL1
                  {m.is_csl1 && <span style={{ background: '#f43f5e', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold' }}>CSL1</span>}
                </label>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '20px' }}>
            <button className="btn btn-danger" style={{ minHeight: '38px', padding: '0 14px', fontSize: '0.85rem' }} onClick={() => {
              if (isMachine) {
                removeMachineEntry(m.id);
              } else if (isRevision) {
                removeRevisionEntry(m.id);
              } else {
                removeMontajeEntry(m.id);
              }
              setEditingEntry(null);
            }}>
              <Trash2 size={14} /> Eliminar
            </button>
            <button className="btn btn-primary" style={{ minHeight: '38px', padding: '0 20px', fontSize: '0.85rem' }} onClick={() => setEditingEntry(null)}>
              Listo
            </button>
          </div>

        </div>
      </div>
    );
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
              type="button"
              className="btn btn-secondary" 
              style={{ padding: '8px 14px', minHeight: '42px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }} 
              onClick={handleCopySummary}
              title="Copiar resumen del turno para enviar por WhatsApp"
            >
              💬 Copiar WhatsApp
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
            <select 
              className="form-select" 
              value={supervisor} 
              onChange={(e) => setSupervisor(e.target.value)}
              required
            >
              {currentUser ? (
                <option value={currentUser.full_name || currentUser.email}>
                  {currentUser.full_name || currentUser.email}
                </option>
              ) : (
                <option value={supervisor}>{supervisor}</option>
              )}
            </select>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {machineEntries.map((m) => {
          let mOk = 0;
          let mKo = 0;
          if (Array.isArray(m.references)) {
            m.references.forEach(r => {
              mOk += parseInt(r.quantity_ok || 0);
              mKo += parseInt(r.quantity_ko || 0);
            });
          }

          return (
            <div 
              key={m.id} 
              className="history-card" 
              onClick={() => setEditingEntry({ type: 'machine', id: m.id })}
              style={{ 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--bg-card)', 
                border: '1px solid rgba(96, 165, 250, 0.3)', 
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.7)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.3)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#60a5fa', fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={16} /> {m.machine_name || 'S/N'}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  Máquina
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', fontWeight: '500' }}>
                👤 {m.operator_name || 'Sin Operario'}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.part_name}>
                ⚙️ {m.part_name || 'Sin pieza'}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  OK: {mOk}
                </span>
                <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  KO: {mKo}
                </span>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '30px' }}>
        {montajeEntries.map((m) => {
          let mOk = 0;
          let mKo = 0;
          if (m.references) {
            m.references.forEach(r => {
              mOk += parseInt(r.quantity_ok || 0);
              mKo += parseInt(r.quantity_ko || 0);
            });
          }

          return (
            <div 
              key={m.id} 
              className="history-card" 
              onClick={() => setEditingEntry({ type: 'montaje', id: m.id })}
              style={{ 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--bg-card)', 
                border: '1px solid rgba(168, 85, 247, 0.3)', 
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.7)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.3)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#c084fc', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.part_name}>
                  <Package size={16} /> {m.part_name || 'Pieza Montaje'}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  Montaje
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', fontWeight: '500' }}>
                👤 {m.operator_name || 'Sin Operario'}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                🏷️ {m.references && m.references.length > 0 ? `${m.references.length} ref(s)` : '0 refs'}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  OK: {mOk}
                </span>
                <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  KO: {mKo}
                </span>
                {m.is_csl1 && (
                  <span style={{ marginLeft: 'auto', background: '#f43f5e', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                    CSL1
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* REVISIÓN CSL1 */}
      <div className="section-header">
        <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={18} color="#06b6d4" /> REVISIÓN CSL1 ({revisionEntries.length})
        </h3>
        <button className="btn btn-secondary" style={{ minHeight: '34px', padding: '4px 10px', fontSize: '0.78rem' }} onClick={addRevisionEntry}>
          <Plus size={14} /> Añadir a Revisión
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '30px' }}>
        {revisionEntries.map((m) => {
          let mOk = 0;
          let mKo = 0;
          if (m.references) {
            m.references.forEach(r => {
              mOk += parseInt(r.quantity_ok || 0);
              mKo += parseInt(r.quantity_ko || 0);
            });
          }

          return (
            <div 
              key={m.id} 
              className="history-card" 
              onClick={() => setEditingEntry({ type: 'revision', id: m.id })}
              style={{ 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                padding: '12px 14px', 
                borderRadius: 'var(--radius-lg)', 
                background: 'var(--bg-card)', 
                border: '1px solid rgba(6, 182, 212, 0.3)', 
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.7)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: '#06b6d4', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.part_name}>
                  <CheckCircle size={16} /> {m.part_name || 'Pieza Revisión'}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                  Revisión
                </span>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '6px', fontWeight: '500' }}>
                👤 {m.operator_name || 'Sin Operario'}
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                🏷️ {m.references && m.references.length > 0 ? `${m.references.length} ref(s)` : '0 refs'}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  OK: {mOk}
                </span>
                <span style={{ color: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  KO: {mKo}
                </span>
                <span style={{ marginLeft: 'auto', background: '#f43f5e', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                  CSL1
                </span>
              </div>
            </div>
          );
        })}
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
                {montajeEntries.map(m => (
                  (m.references || []).map((r, rIdx) => (
                    <tr key={`${m.id}-${r.id}`}>
                      <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {r.code}
                        {m.is_csl1 && <span style={{ background: '#f43f5e', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px' }}>CSL1</span>}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{r.quantity_ok}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: '#b91c1c' }}>{r.quantity_ko > 0 ? r.quantity_ko : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{m.operator_number}</td>
                      <td style={{ border: '1px solid #000', padding: '5px' }}>{m.operator_name}</td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </>
        )}

        {revisionEntries.length > 0 && (
          <>
            <div style={{ background: '#000', color: '#fff', padding: '4px 8px', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', marginBottom: '6px' }}>
              REVISIÓN CSL1
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#e2e8f0' }}>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>PIEZA / REF</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD OK</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px' }}>PROD KO</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '60px' }}>Nº OP</th>
                  <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left' }}>OPERARIO</th>
                </tr>
              </thead>
              <tbody>
                {revisionEntries.map(m => (
                  (m.references || []).map((r, rIdx) => (
                    <tr key={`${m.id}-${r.id}`}>
                      <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        {r.code}
                        <span style={{ background: '#f43f5e', color: '#fff', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', marginLeft: '5px' }}>CSL1</span>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }}>{r.quantity_ok}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', color: '#b91c1c' }}>{r.quantity_ko > 0 ? r.quantity_ko : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: 'bold' }}>{m.operator_number}</td>
                      <td style={{ border: '1px solid #000', padding: '5px' }}>{m.operator_name}</td>
                    </tr>
                  ))
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

      {/* MODAL EDICIÓN DE ASIGNACIÓN (MAQUINA O MONTAJE) */}
      {renderEntryEditorModal()}

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
              {navigator.share && (
                <button className="btn btn-primary" style={{ background: '#10b981', borderColor: '#10b981', color: 'white' }} onClick={() => handleShareImage(previewImage)}>
                  🔗 Compartir Imagen (WhatsApp)
                </button>
              )}
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
