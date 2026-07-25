import React, { useState, useRef } from 'react';
import { Calendar, Camera, RefreshCw, Layers, Eye, FileText, X } from 'lucide-react';
import html2canvas from 'html2canvas';

const getMondayOfDate = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayOfMonth}`;
};

const getSundayOfDate = (mondayStr) => {
  const d = new Date(mondayStr + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayOfMonth}`;
};

const compileWeeklyHistoryClientSide = (sheets, operators, machines, targetMondayStr) => {
  const mondayStr = getMondayOfDate(targetMondayStr);
  const sundayStr = getSundayOfDate(mondayStr);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  
  const filteredSheets = sheets.filter(sheet => {
    const pDate = sheet.production_date;
    return pDate >= mondayStr && pDate <= sundayStr;
  });

  const historyMap = operators.map(op => {
    const opDays = {
      "Lunes": [],
      "Martes": [],
      "Miércoles": [],
      "Jueves": [],
      "Viernes": [],
      "Sábado": [],
      "Domingo": []
    };

    filteredSheets.forEach(sheet => {
      const sDate = new Date(sheet.production_date + 'T12:00:00');
      const rawDay = sDate.getDay();
      const dayIdx = rawDay === 0 ? 6 : rawDay - 1;
      const dayName = daysOfWeek[dayIdx];

      (sheet.items || []).forEach(item => {
        const opId = item.operator_id || (item.operator && item.operator.id);
        const opName = item.operator_name_manual || (item.operator && item.operator.name);
        const opNum = item.operator_number_manual || (item.operator && item.operator.operator_number);

        let isMatch = false;
        if (opId && Number(opId) === Number(op.id)) {
          isMatch = true;
        } else if (
          (opName && String(opName).trim().toLowerCase() === String(op.name).trim().toLowerCase()) ||
          (opNum && String(opNum).trim() === String(op.operator_number).trim())
        ) {
          isMatch = true;
        }

        if (isMatch) {
          let label = "-";
          const isMontajeItem = item.is_montaje || (item.machine_name_manual && String(item.machine_name_manual).toUpperCase() === 'MONTAJE');
          
          if (isMontajeItem) {
            label = "Montaje";
          } else if (item.machine && item.machine.name) {
            if (item.machine.is_small) {
              label = "Grupo M. Pequeñas";
            } else {
              label = item.machine.name;
            }
          } else if (item.machine_name_manual) {
            const dbMac = machines.find(m => String(m.name).toLowerCase() === String(item.machine_name_manual).toLowerCase());
            if (dbMac && dbMac.is_small) {
              label = "Grupo M. Pequeñas";
            } else {
              label = item.machine_name_manual;
            }
          }

          if (label !== "-" && !opDays[dayName].includes(label)) {
            opDays[dayName].push(label);
          }
        }
      });
    });

    const formattedDays = {};
    daysOfWeek.forEach(day => {
      formattedDays[day] = opDays[day].length > 0 ? opDays[day].join(", ") : "-";
    });

    return {
      operator_id: op.id,
      operator_name: op.name,
      operator_number: op.operator_number,
      is_active: op.is_active !== false,
      days: formattedDays
    };
  });

  return {
    week_start_date: mondayStr,
    week_end_date: sundayStr,
    history: historyMap
  };
};

export default function RosterView({ shiftSheets = [], operators = [], machines = [], weeklySnapshots = [], onRefresh }) {
  const [subTab, setSubTab] = useState('current');
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [currentWeekMonday, setCurrentWeekMonday] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const handlePrevWeek = () => {
    const d = new Date(currentWeekMonday + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    setCurrentWeekMonday(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(currentWeekMonday + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    setCurrentWeekMonday(d.toISOString().split('T')[0]);
  };

  const currentWeeklyHistory = React.useMemo(() => {
    return compileWeeklyHistoryClientSide(shiftSheets, operators, machines, currentWeekMonday);
  }, [shiftSheets, operators, machines, currentWeekMonday]);

  const printAreaRef = useRef(null);
  const modalPrintAreaRef = useRef(null);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const handleExportImage = async (ref, fileName) => {
    if (!ref.current) return;
    setGeneratingImage(true);
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#131b2e',
        logging: false
      });
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Error generando la imagen del cuadrante.");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 'image/png');
    } catch (e) {
      console.error("Error exportando imagen de cuadrante:", e);
      alert("Error al exportar el cuadrante como imagen.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const getCellColor = (machinesStr) => {
    if (!machinesStr || machinesStr === '-') {
      return { bg: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.03)' };
    }
    if (machinesStr.includes('Grupo M. Pequeñas')) {
      return { bg: 'rgba(167, 139, 250, 0.15)', color: '#c084fc', border: '1px solid rgba(167, 139, 250, 0.3)' };
    }
    if (machinesStr.includes('Montaje')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' };
  };

  const renderRosterTable = (historyData, isSnapshot = false) => {
    if (!historyData || !historyData.history || historyData.history.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          No hay datos registrados de cuadrante para esta semana todavía. Registra partes de trabajo en "Parte Turno" para poblar este cuadrante.
        </div>
      );
    }

    const { week_start_date, week_end_date, history } = historyData;

    // Si no es una instantánea histórica (es la semana actual), filtramos para mostrar solo operarios activos
    const filteredHistory = isSnapshot 
      ? history 
      : history.filter(op => op.is_active !== false);

    if (filteredHistory.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          No hay operarios activos en el cuadrante para esta semana.
        </div>
      );
    }

    return (
      <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        {/* Roster Header Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffffff' }}>
              Roster de Asignación Semanal
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Semana: {week_start_date} al {week_end_date}
            </span>
          </div>
          <button 
            className="btn btn-success" 
            style={{ padding: '6px 14px', minHeight: '38px', fontSize: '0.8rem', width: 'auto' }}
            onClick={() => handleExportImage(isSnapshot ? modalPrintAreaRef : printAreaRef, `cuadrante_semanal_${week_start_date}.png`)}
            disabled={generatingImage}
          >
            <Camera size={14} /> {generatingImage ? 'Generando...' : '📷 Descargar Roster (PNG)'}
          </button>
        </div>

        {/* Scrollable Table wrapper */}
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <table ref={isSnapshot ? modalPrintAreaRef : printAreaRef} style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', background: '#131b2e', color: '#ffffff' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: '600', color: '#94a3b8', minWidth: '150px' }}>OPERARIO</th>
                {daysOfWeek.map(day => (
                  <th key={day} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', color: '#94a3b8', minWidth: '100px' }}>{day.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map(row => (
                <tr key={row.operator_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '600', color: '#ffffff' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>{row.operator_name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nº {row.operator_number}</span>
                    </div>
                  </td>
                  {daysOfWeek.map(day => {
                    const cellVal = row.days[day] || '-';
                    const colors = getCellColor(cellVal);
                    return (
                      <td key={day} style={{ padding: '12px 6px', textAlign: 'center' }}>
                        <div style={{ 
                          padding: '6px 8px', 
                          borderRadius: '8px', 
                          fontSize: '0.74rem', 
                          fontWeight: '500', 
                          display: 'inline-block',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          background: colors.bg, 
                          color: colors.color, 
                          border: colors.border
                        }} title={cellVal}>
                          {cellVal}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleForceTrigger = async () => {
    try {
      const getApiBaseUrl = () => {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        if (!envUrl) {
          const hostname = window.location.hostname;
          return `http://${hostname}:8000/api`;
        }
        if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
          return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
        }
        return `https://${envUrl}/api`;
      };
      
      const res = await fetch(`${getApiBaseUrl()}/weekly-snapshots/trigger`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Comprobación de cierres e instantáneas completada.");
        onRefresh();
      }
    } catch(e) {
      console.warn(e);
      alert("Error al intentar forzar la comprobación en servidor.");
    }
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Tab Selectors */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
        <button 
          className={`btn ${subTab === 'current' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }} 
          onClick={() => setSubTab('current')}
        >
          <Calendar size={15} /> Semana Actual
        </button>
        <button 
          className={`btn ${subTab === 'history' ? 'btn-primary' : 'btn-secondary'}`} 
          style={{ flex: 1, minHeight: '40px', fontSize: '0.8rem' }} 
          onClick={() => setSubTab('history')}
        >
          <Layers size={15} /> Histórico Roster (Instantáneas)
        </button>
      </div>

      {/* Roster Current Week */}
      {subTab === 'current' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <Layers size={18} color="#60a5fa" /> Cuadrante de Turnos Activo
            </h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="btn btn-secondary" style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.75rem' }} onClick={handlePrevWeek}>
                ◀ Ant.
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                Semana del {currentWeeklyHistory.week_start_date}
              </span>
              <button className="btn btn-secondary" style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.75rem' }} onClick={handleNextWeek}>
                Sig. ▶
              </button>
              <button className="btn btn-secondary" style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.75rem' }} onClick={() => {
                const today = new Date();
                const day = today.getDay();
                const diff = today.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(today.setDate(diff));
                setCurrentWeekMonday(monday.toISOString().split('T')[0]);
                onRefresh();
              }} title="Volver a la semana actual y refrescar">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
          {renderRosterTable(currentWeeklyHistory)}
        </div>
      )}

      {/* Roster History Snapshots */}
      {subTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 className="section-title">Archivo de Cuadrantes Semanales</h2>
            <button className="btn btn-secondary" style={{ width: 'auto', minHeight: '34px', padding: '0 10px', fontSize: '0.75rem' }} onClick={handleForceTrigger}>
              Comprobar Cierre Semanal
            </button>
          </div>

          {weeklySnapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
              No hay instantáneas guardadas todavía. Las instantáneas semanales se archivan automáticamente cada lunes para la semana concluida.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {weeklySnapshots.map(snap => (
                <div key={snap.id} className="history-card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#60a5fa" /> Roster Semanal: {snap.week_start_date} al {snap.week_end_date}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Archivado el: {new Date(snap.created_at).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ width: 'auto', minHeight: '36px', padding: '0 12px', fontSize: '0.75rem' }} 
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(snap.snapshot_data);
                        setSelectedSnapshot(parsed);
                      } catch(e) {
                        alert("Error al parsear los datos de la instantánea.");
                      }
                    }}
                  >
                    <Eye size={14} /> Ver Cuadrante
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SNAPSHOT VIEWER MODAL */}
      {selectedSnapshot && (
        <div className="modal-overlay" onClick={() => setSelectedSnapshot(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={18} color="#60a5fa" /> Visualización de Roster Guardado
              </h3>
              <button className="close-btn" onClick={() => setSelectedSnapshot(null)}><X size={18} /></button>
            </div>
            {renderRosterTable(selectedSnapshot, true)}
          </div>
        </div>
      )}
    </div>
  );
}
