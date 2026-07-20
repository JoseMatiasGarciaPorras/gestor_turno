import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import ShiftProductionSheet from './components/ShiftProductionSheet';
import PartsList from './components/PartsList';
import AdminCrudView from './components/AdminCrudView';
import BottomNav from './components/BottomNav';

const API_BASE_URL = 'http://localhost:8088/api';

export default function App() {
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [parts, setParts] = useState([]);
  const [shiftSheets, setShiftSheets] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  
  // Vistas principales: 'sheet' | 'parts' | 'crud'
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
        setShiftSheets(sheetsData);
        if (sheetsData.length > 0) setCurrentSheet(sheetsData[0]);
        setError(null);
      } else {
        throw new Error("Error en servidor backend");
      }
    } catch (err) {
      console.warn("Backend en modo local cache:", err);
      setError("Modo Local Cache Offline");
      
      const cachedMac = localStorage.getItem('gestor_machines');
      const cachedOp = localStorage.getItem('gestor_operators');
      const cachedParts = localStorage.getItem('gestor_parts');

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
          { id: 1, name: "Natalia", operator_number: "247" },
          { id: 2, name: "Diantra", operator_number: "214" },
          { id: 3, name: "Rocío", operator_number: "237" }
        ];
        setOperators(defOp);
        localStorage.setItem('gestor_operators', JSON.stringify(defOp));
      }

      if (cachedParts) setParts(JSON.parse(cachedParts));
      else {
        const defParts = [
          { id: 1, name: "Pieza 90100108", references: "90100108" },
          { id: 2, name: "Pieza L381154", references: "L381154" }
        ];
        setParts(defParts);
        localStorage.setItem('gestor_parts', JSON.stringify(defParts));
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
    try {
      const res = await fetch(`${API_BASE_URL}/shift-sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sheetPayload)
      });
      if (res.ok) {
        const created = await res.json();
        setCurrentSheet(created);
        alert("¡Parte de producción guardado con éxito!");
        fetchData();
        return;
      }
    } catch (e) {}

    const newSheet = { ...sheetPayload, id: Date.now() };
    setCurrentSheet(newSheet);
    localStorage.setItem('gestor_current_sheet', JSON.stringify(newSheet));
    alert("Guardado en almacenamiento local (Modo Offline)");
  };

  const handleOpenHtmlReport = (sheetId) => {
    window.open(`${API_BASE_URL}/shift-sheets/${sheetId}/html`, '_blank');
  };

  // Handlers CRUD
  const handleCreateOperator = async (opData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData)
      });
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = [...operators, { ...opData, id: Date.now() }];
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
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = operators.map(o => o.id === id ? { ...o, ...opData } : o);
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  const handleDeleteOperator = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = operators.filter(o => o.id !== id);
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  const handleCreatePart = async (partData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = [...parts, { ...partData, id: Date.now() }];
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
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = parts.map(p => p.id === id ? { ...p, ...partData } : p);
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  const handleDeletePart = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = parts.filter(p => p.id !== id);
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  const handleCreateMachine = async (machineData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });
      if (res.ok) { fetchData(); return; }
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
      if (res.ok) { fetchData(); return; }
    } catch (e) {}
    const updated = machines.map(m => m.id === id ? { ...m, ...machineData } : m);
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  const handleDeleteMachine = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchData(); return; }
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

      {activeTab === 'parts' && (
        <PartsList parts={parts} onCreatePart={handleCreatePart} />
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
