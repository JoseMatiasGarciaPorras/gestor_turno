import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import ShiftProductionSheet from './components/ShiftProductionSheet';
import AdminCrudView from './components/AdminCrudView';
import ShiftHistoryView from './components/ShiftHistoryView';
import OperatorsList from './components/OperatorsList';
import RosterView from './components/RosterView';
import BottomNav from './components/BottomNav';

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

const API_BASE_URL = getApiBaseUrl();

export default function App() {
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [parts, setParts] = useState([]);
  const [shiftSheets, setShiftSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState(null);
  const [weeklySnapshots, setWeeklySnapshots] = useState([]);
  
  // Vistas principales: 'sheet' | 'crud'
  const [activeTab, setActiveTab] = useState('sheet'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMac, resOp, resParts, resSheets] = await Promise.all([
        fetch(`${API_BASE_URL}/machines`),
        fetch(`${API_BASE_URL}/operators`),
        fetch(`${API_BASE_URL}/parts`),
        fetch(`${API_BASE_URL}/shift-sheets`)
      ]);

      if (resMac.ok && resOp.ok && resParts.ok && resSheets.ok) {
        const macsData = await resMac.json();
        const opsData = await resOp.json();
        const partsData = await resParts.json();
        const sheetsData = await resSheets.json();

        setMachines(macsData);
        setOperators(opsData);
        setParts(partsData);

        // Fusionar hojas de la API con historial en localStorage para evitar pérdidas ante reinicios del backend
        const cachedSheetsRaw = localStorage.getItem('gestor_shift_sheets');
        const cachedSheets = cachedSheetsRaw ? JSON.parse(cachedSheetsRaw) : [];
        const mergedMap = new Map();
        [...sheetsData, ...cachedSheets].forEach(s => {
          if (s && s.id) mergedMap.set(String(s.id), s);
        });
        const mergedSheets = Array.from(mergedMap.values()).sort((a, b) => b.id - a.id);

        setShiftSheets(mergedSheets);
        localStorage.setItem('gestor_shift_sheets', JSON.stringify(mergedSheets));

        if (mergedSheets.length > 0) setCurrentSheet(mergedSheets[0]);
        setError(null);

        // Fetch weekly roster data
        try {
          const [resHist, resSnaps] = await Promise.all([
            fetch(`${API_BASE_URL}/weekly-history/current`),
            fetch(`${API_BASE_URL}/weekly-snapshots`)
          ]);
          if (resHist.ok) {
            const histData = await resHist.json();
            setWeeklyHistory(histData);
          }
          if (resSnaps.ok) {
            const snapsData = await resSnaps.json();
            setWeeklySnapshots(snapsData);
          }
        } catch (e) {
          console.warn("Error cargando historial de cuadrante:", e);
        }
      } else {
        throw new Error("Error en servidor backend");
      }
    } catch (err) {
      console.warn("Backend en modo local cache:", err);
      setError("Modo Local Cache Offline");
      
      const cachedMac = localStorage.getItem('gestor_machines');
      const cachedOp = localStorage.getItem('gestor_operators');
      const cachedParts = localStorage.getItem('gestor_parts');
      const cachedSheets = localStorage.getItem('gestor_shift_sheets');

      if (cachedMac) setMachines(JSON.parse(cachedMac));
      else {
        const defMac = [
          { id: 1, name: "RB1000", machine_number: "M-1000", category: "Inyección", status: "en_uso" },
          { id: 2, name: "NS1500", machine_number: "M-1500", category: "Inyección", status: "en_uso" },
          { id: 3, name: "ENGEL 550", machine_number: "M-E550", category: "Inyección", status: "en_uso" },
          { id: 4, name: "SUMITOMO", machine_number: "M-SUM", category: "Inyección", status: "disponible" }
        ];
        setMachines(defMac);
        localStorage.setItem('gestor_machines', JSON.stringify(defMac));
      }

      if (cachedOp) setOperators(JSON.parse(cachedOp));
      else {
        const defOp = [
          { id: 1, name: "Natalia", operator_number: "247", is_active: true },
          { id: 2, name: "Diantra", operator_number: "214", is_active: true },
          { id: 3, name: "Rocío", operator_number: "237", is_active: true }
        ];
        setOperators(defOp);
        localStorage.setItem('gestor_operators', JSON.stringify(defOp));
      }

      if (cachedParts) setParts(JSON.parse(cachedParts));
      else {
        const defParts = [
          { id: 1, name: "Pieza 90100108", references_list: [{ code: "90100108", side_type: "Única" }] },
          { id: 2, name: "Pieza L381154", references_list: [{ code: "L381154", side_type: "IZQ" }, { code: "L381153", side_type: "DCH" }] }
        ];
        setParts(defParts);
        localStorage.setItem('gestor_parts', JSON.stringify(defParts));
      }

      if (cachedSheets) {
        const parsedSheets = JSON.parse(cachedSheets);
        setShiftSheets(parsedSheets);
        if (parsedSheets.length > 0) setCurrentSheet(parsedSheets[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Guardar Parte de Turno
  const handleSaveSheet = async (sheetPayload) => {
    let createdSheet = null;
    try {
      const res = await fetch(`${API_BASE_URL}/shift-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
      });
      if (res.ok) {
        createdSheet = await res.json();
      }
    } catch (e) {
      console.warn("Error enviando parte al backend:", e);
    }

    if (!createdSheet) {
      createdSheet = { ...sheetPayload, id: Date.now(), created_at: new Date().toISOString() };
    }

    setCurrentSheet(createdSheet);
    
    // Guardar en historial local de inmediato
    const cachedSheetsRaw = localStorage.getItem('gestor_shift_sheets');
    const existingSheets = cachedSheetsRaw ? JSON.parse(cachedSheetsRaw) : [];
    const updatedSheets = [createdSheet, ...existingSheets.filter(s => s.id !== createdSheet.id)];
    
    setShiftSheets(updatedSheets);
    localStorage.setItem('gestor_shift_sheets', JSON.stringify(updatedSheets));

    alert("¡Parte de producción guardado con éxito!");
    await fetchData();
  };

  const handleOpenHtmlReport = (sheetId) => {
    window.open(`${API_BASE_URL}/shift-sheets/${sheetId}/html`, '_blank');
  };

  const handleDeleteSheet = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/shift-sheets/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Success
      }
    } catch (e) {
      console.warn("Error borrando el parte en servidor:", e);
    }

    // Actualizar cache local
    const cachedSheetsRaw = localStorage.getItem('gestor_shift_sheets');
    if (cachedSheetsRaw) {
      const existingSheets = JSON.parse(cachedSheetsRaw);
      const updated = existingSheets.filter(s => s.id !== id);
      setShiftSheets(updated);
      localStorage.setItem('gestor_shift_sheets', JSON.stringify(updated));
    }
    
    alert("¡Parte de producción eliminado con éxito!");
    await fetchData();
  };

  // Handlers CRUD de Operarios
  const handleCreateOperator = async (opData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...opData, is_active: true })
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = [...operators, { ...opData, id: Date.now(), is_active: true }];
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  const handleUpdateOperator = async (id, opData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData)
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = operators.map(o => o.id === id ? { ...o, ...opData } : o);
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  const handleDeleteOperator = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators/${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = operators.filter(o => o.id !== id);
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  const handleToggleOperatorActive = async (operator) => {
    try {
      const updatedPayload = {
        name: operator.name,
        operator_number: operator.operator_number,
        is_active: !operator.is_active
      };
      const res = await fetch(`${API_BASE_URL}/operators/${operator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (res.ok) {
        await fetchData();
        return;
      }
    } catch (e) {
      console.warn("Error enviando estado de operario activo al backend:", e);
    }
    const updated = operators.map(o => o.id === operator.id ? { ...o, is_active: !o.is_active } : o);
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  // Handlers CRUD de Piezas
  const handleCreatePart = async (partData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const newPart = {
      id: Date.now(),
      name: partData.name,
      description: partData.description,
      references_list: partData.references || []
    };
    const updated = [...parts, newPart];
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  const handleUpdatePart = async (id, partData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = parts.map(p => p.id === id ? {
      ...p,
      name: partData.name,
      description: partData.description,
      references_list: partData.references || []
    } : p);
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  const handleDeletePart = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts/${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = parts.filter(p => p.id !== id);
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  // Handlers CRUD de Máquinas
  const handleCreateMachine = async (machineData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = [...machines, { ...machineData, id: Date.now() }];
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  const handleUpdateMachine = async (id, machineData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = machines.map(m => m.id === id ? { ...m, ...machineData } : m);
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  const handleDeleteMachine = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines/${id}`, { method: 'DELETE' });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = machines.filter(m => m.id !== id);
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="header-bar">
        <h1 className="brand-title">
          <Cpu color="#60a5fa" size={24} /> Gestor de Turnos & Planta
        </h1>
        <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.8rem' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {/* Main Active Tab View */}
      {activeTab === 'sheet' && (
        <ShiftProductionSheet 
          machines={machines}
          operators={operators}
          parts={parts}
          currentSheet={currentSheet}
          onSaveSheet={handleSaveSheet}
          onOpenHtmlReport={handleOpenHtmlReport}
        />
      )}

      {activeTab === 'operators' && (
        <OperatorsList 
          operators={operators}
          onToggleActive={handleToggleOperatorActive}
          onCreateOperator={handleCreateOperator}
        />
      )}

      {activeTab === 'roster' && (
        <RosterView 
          weeklyHistory={weeklyHistory}
          weeklySnapshots={weeklySnapshots}
          onRefresh={fetchData}
        />
      )}

      {activeTab === 'history' && (
        <ShiftHistoryView 
          shiftSheets={shiftSheets}
          onOpenHtmlReport={handleOpenHtmlReport}
          onDeleteSheet={handleDeleteSheet}
        />
      )}

      {activeTab === 'crud' && (
        <AdminCrudView 
          machines={machines}
          operators={operators}
          parts={parts}
          onCreateMachine={handleCreateMachine}
          onUpdateMachine={handleUpdateMachine}
          onDeleteMachine={handleDeleteMachine}
          onCreateOperator={handleCreateOperator}
          onUpdateOperator={handleUpdateOperator}
          onDeleteOperator={handleDeleteOperator}
          onCreatePart={handleCreatePart}
          onUpdatePart={handleUpdatePart}
          onDeletePart={handleDeletePart}
        />
      )}

      {/* Bottom Navigation Bar */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
