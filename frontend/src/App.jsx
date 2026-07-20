import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, Plus, FileText, UserCheck, Package, Factory } from 'lucide-react';
import MachineCard from './components/MachineCard';
import ShiftModal from './components/ShiftModal';
import MachineModal from './components/MachineModal';
import OperatorsList from './components/OperatorsList';
import PartsList from './components/PartsList';
import ProductionList from './components/ProductionList';
import ProductionModal from './components/ProductionModal';
import BottomNav from './components/BottomNav';

const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [parts, setParts] = useState([]);
  const [productions, setProductions] = useState([]);
  const [activeTab, setActiveTab] = useState('machines'); // 'machines' | 'operators' | 'parts' | 'production'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedMachineForShift, setSelectedMachineForShift] = useState(null);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);
  const [isProductionModalOpen, setIsProductionModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMac, resOp, resParts, resProd] = await Promise.all([
        fetch(`${API_BASE_URL}/machines`),
        fetch(`${API_BASE_URL}/operators`),
        fetch(`${API_BASE_URL}/parts`),
        fetch(`${API_BASE_URL}/productions`)
      ]);

      if (resMac.ok && resOp.ok && resParts.ok && resProd.ok) {
        setMachines(await resMac.json());
        setOperators(await resOp.json());
        setParts(await resParts.json());
        setProductions(await resProd.json());
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
      const cachedProd = localStorage.getItem('gestor_productions');

      if (cachedMac) setMachines(JSON.parse(cachedMac));
      else {
        const defMac = [
          { id: 1, name: "Torno CNC Haas ST-10", machine_number: "M-101", category: "Mecanizado", status: "disponible", location: "Sector A" },
          { id: 2, name: "Fresadora VF-2", machine_number: "M-102", category: "Mecanizado", status: "en_uso", location: "Sector A" },
          { id: 3, name: "Cortadora Láser 3kW", machine_number: "M-201", category: "Corte", status: "disponible", location: "Sector B" }
        ];
        setMachines(defMac);
        localStorage.setItem('gestor_machines', JSON.stringify(defMac));
      }

      if (cachedOp) setOperators(JSON.parse(cachedOp));
      else {
        const defOp = [
          { id: 1, name: "Juan Pérez", operator_number: "OP-001" },
          { id: 2, name: "Carlos Mendoza", operator_number: "OP-002" }
        ];
        setOperators(defOp);
        localStorage.setItem('gestor_operators', JSON.stringify(defOp));
      }

      if (cachedParts) setParts(JSON.parse(cachedParts));
      else {
        const defParts = [
          { id: 1, name: "Eje de Transmisión Al-7075", references: "REF-EJ-1001" }
        ];
        setParts(defParts);
        localStorage.setItem('gestor_parts', JSON.stringify(defParts));
      }

      if (cachedProd) setProductions(JSON.parse(cachedProd));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Operarios Handlers
  const handleCreateOperator = async (opData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/operators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opData)
      });
      if (res.ok) {
        fetchData();
        return;
      }
    } catch (e) {}

    const newOp = { ...opData, id: Date.now() };
    const updated = [...operators, newOp];
    setOperators(updated);
    localStorage.setItem('gestor_operators', JSON.stringify(updated));
  };

  // Piezas Handlers
  const handleCreatePart = async (partData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/parts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partData)
      });
      if (res.ok) {
        fetchData();
        return;
      }
    } catch (e) {}

    const newPart = { ...partData, id: Date.now() };
    const updated = [...parts, newPart];
    setParts(updated);
    localStorage.setItem('gestor_parts', JSON.stringify(updated));
  };

  // Máquinas Handlers
  const handleCreateMachine = async (machineData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineData)
      });
      if (res.ok) {
        setIsMachineModalOpen(false);
        fetchData();
        return;
      }
    } catch (e) {}

    const newMac = { ...machineData, id: Date.now() };
    const updated = [...machines, newMac];
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
    setIsMachineModalOpen(false);
  };

  const handleChangeStatus = async (machineId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/machines/${machineId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
        return;
      }
    } catch (e) {}

    const updated = machines.map(m => m.id === machineId ? { ...m, status: newStatus } : m);
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  // Producción Handlers
  const handleCreateProduction = async (prodData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/productions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodData)
      });
      if (res.ok) {
        setIsProductionModalOpen(false);
        fetchData();
        return;
      }
    } catch (e) {}

    const op = operators.find(o => o.id === prodData.operator_id);
    const mac = machines.find(m => m.id === prodData.machine_id);
    const part = parts.find(p => p.id === prodData.part_id);

    const newProd = {
      ...prodData,
      id: Date.now(),
      operator: op,
      machine: mac,
      part: part
    };

    const updated = [newProd, ...productions];
    setProductions(updated);
    localStorage.setItem('gestor_productions', JSON.stringify(updated));
    setIsProductionModalOpen(false);
  };

  const handleOpenHtmlReport = (prodId) => {
    window.open(`${API_BASE_URL}/productions/${prodId}/html`, '_blank');
  };

  // Quick stats
  const disponibles = machines.filter(m => m.status === 'disponible').length;
  const enUso = machines.filter(m => m.status === 'en_uso').length;
  const mantenimiento = machines.filter(m => m.status === 'mantenimiento').length;

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="header-bar">
        <h1 className="brand-title">
          <Cpu color="#60a5fa" size={24} /> Gestor de Turnos & Producción
        </h1>
        <button 
          onClick={fetchData} 
          className="btn btn-secondary" 
          style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.8rem' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </header>

      {/* Summary Pills */}
      <div className="summary-pills" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="pill-card available">
          <span className="pill-num">{disponibles}</span>
          <span className="pill-label">Libres</span>
        </div>
        <div className="pill-card in-use">
          <span className="pill-num">{enUso}</span>
          <span className="pill-label">En Uso</span>
        </div>
        <div className="pill-card maintenance">
          <span className="pill-num">{mantenimiento}</span>
          <span className="pill-label">Taller</span>
        </div>
        <div className="pill-card" style={{ color: '#a78bfa' }}>
          <span className="pill-num" style={{ color: '#a78bfa' }}>{productions.length}</span>
          <span className="pill-label">Envíos</span>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'machines' && (
        <>
          <div className="section-header">
            <h2 className="section-title">Máquinas Operativas</h2>
            <button 
              className="btn btn-secondary" 
              style={{ minHeight: '36px', padding: '4px 12px', fontSize: '0.8rem' }}
              onClick={() => setIsMachineModalOpen(true)}
            >
              <Plus size={14} /> Nueva
            </button>
          </div>

          <div className="machine-grid">
            {machines.map(m => (
              <MachineCard 
                key={m.id} 
                machine={m} 
                onAssignShift={() => setIsProductionModalOpen(true)}
                onCompleteShift={(id) => handleChangeStatus(m.id, 'disponible')}
                onChangeStatus={handleChangeStatus}
              />
            ))}
          </div>
        </>
      )}

      {activeTab === 'operators' && (
        <OperatorsList operators={operators} onCreateOperator={handleCreateOperator} />
      )}

      {activeTab === 'parts' && (
        <PartsList parts={parts} onCreatePart={handleCreatePart} />
      )}

      {activeTab === 'production' && (
        <ProductionList 
          productions={productions} 
          onOpenNewProduction={() => setIsProductionModalOpen(true)}
          onOpenHtmlReport={handleOpenHtmlReport}
        />
      )}

      {/* Modals */}
      {isMachineModalOpen && (
        <MachineModal 
          onClose={() => setIsMachineModalOpen(false)}
          onSubmit={handleCreateMachine}
        />
      )}

      {isProductionModalOpen && (
        <ProductionModal 
          machines={machines}
          operators={operators}
          parts={parts}
          onClose={() => setIsProductionModalOpen(false)}
          onSubmit={handleCreateProduction}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
