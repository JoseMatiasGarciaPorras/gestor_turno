import React, { useState, useEffect } from 'react';
import { Cpu, Plus, RefreshCw, Smartphone } from 'lucide-react';
import MachineCard from './components/MachineCard';
import ShiftModal from './components/ShiftModal';
import MachineModal from './components/MachineModal';
import ShiftsList from './components/ShiftsList';
import BottomNav from './components/BottomNav';

const API_BASE_URL = 'http://localhost:8000/api';

export default function App() {
  const [machines, setMachines] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState('machines'); // 'machines' | 'history'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedMachineForShift, setSelectedMachineForShift] = useState(null);
  const [isMachineModalOpen, setIsMachineModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resMachines, resShifts] = await Promise.all([
        fetch(`${API_BASE_URL}/machines`),
        fetch(`${API_BASE_URL}/shifts`)
      ]);

      if (resMachines.ok && resShifts.ok) {
        const machinesData = await resMachines.json();
        const shiftsData = await resShifts.json();
        setMachines(machinesData);
        setShifts(shiftsData);
        setError(null);
      } else {
        throw new Error("Respuesta no válida del servidor backend");
      }
    } catch (err) {
      console.warn("Backend no disponible o error de red:", err);
      setError("Conectado en modo local offline (Local Cache)");
      // Fallback a localStorage
      const cachedMachines = localStorage.getItem('gestor_machines');
      const cachedShifts = localStorage.getItem('gestor_shifts');

      if (cachedMachines) {
        setMachines(JSON.parse(cachedMachines));
      } else {
        // Datos de muestra por defecto
        const defaultMachines = [
          { id: 1, name: "Torno CNC Haas ST-10", code: "CNC-01", category: "Mecanizado", status: "disponible", location: "Sector A" },
          { id: 2, name: "Fresadora VF-2", code: "FRE-02", category: "Mecanizado", status: "en_uso", location: "Sector A", current_shift: { id: 101, operator_name: "Carlos Mendoza", start_time: new Date().toISOString() } },
          { id: 3, name: "Cortadora Láser 3kW", code: "LAS-01", category: "Corte", status: "disponible", location: "Sector B" },
          { id: 4, name: "Inyectora 150T", code: "INY-03", category: "Inyección", status: "mantenimiento", location: "Sector C" }
        ];
        setMachines(defaultMachines);
        localStorage.setItem('gestor_machines', JSON.stringify(defaultMachines));
      }

      if (cachedShifts) setShifts(JSON.parse(cachedShifts));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleAssignShiftClick = (machine) => {
    setSelectedMachineForShift(machine);
    setIsShiftModalOpen(true);
  };

  const handleCreateShift = async (shiftData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      });
      if (res.ok) {
        setIsShiftModalOpen(false);
        fetchData();
        return;
      }
    } catch (e) {
      console.log("Creación local offline");
    }

    // Modern local update fallback
    const newShift = {
      id: Date.now(),
      machine_id: shiftData.machine_id,
      operator_name: shiftData.operator_name,
      start_time: new Date().toISOString(),
      status: "activo",
      notes: shiftData.notes
    };

    const updatedMachines = machines.map(m => {
      if (m.id === shiftData.machine_id) {
        return { ...m, status: 'en_uso', current_shift: newShift };
      }
      return m;
    });

    const updatedShifts = [newShift, ...shifts];
    setMachines(updatedMachines);
    setShifts(updatedShifts);
    localStorage.setItem('gestor_machines', JSON.stringify(updatedMachines));
    localStorage.setItem('gestor_shifts', JSON.stringify(updatedShifts));
    setIsShiftModalOpen(false);
  };

  const handleCompleteShift = async (shiftId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/shifts/${shiftId}/complete`, {
        method: 'PATCH'
      });
      if (res.ok) {
        fetchData();
        return;
      }
    } catch (e) {
      console.log("Liberación local offline");
    }

    // Local fallback
    const updatedShifts = shifts.map(s => s.id === shiftId ? { ...s, status: 'completado' } : s);
    const shift = shifts.find(s => s.id === shiftId);
    
    const updatedMachines = machines.map(m => {
      if (shift && m.id === shift.machine_id) {
        return { ...m, status: 'disponible', current_shift: null };
      }
      return m;
    });

    setMachines(updatedMachines);
    setShifts(updatedShifts);
    localStorage.setItem('gestor_machines', JSON.stringify(updatedMachines));
    localStorage.setItem('gestor_shifts', JSON.stringify(updatedShifts));
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
    } catch (e) {
      console.log("Cambio estado offline");
    }

    const updatedMachines = machines.map(m => {
      if (m.id === machineId) {
        return { ...m, status: newStatus, current_shift: newStatus !== 'en_uso' ? null : m.current_shift };
      }
      return m;
    });
    setMachines(updatedMachines);
    localStorage.setItem('gestor_machines', JSON.stringify(updatedMachines));
  };

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
    } catch (e) {
      console.log("Crear máquina offline");
    }

    const newMachine = { ...machineData, id: Date.now() };
    const updatedMachines = [...machines, newMachine];
    setMachines(updatedMachines);
    localStorage.setItem('gestor_machines', JSON.stringify(updatedMachines));
    setIsMachineModalOpen(false);
  };

  // Metrics
  const total = machines.length;
  const disponibles = machines.filter(m => m.status === 'disponible').length;
  const enUso = machines.filter(m => m.status === 'en_uso').length;
  const mantenimiento = machines.filter(m => m.status === 'mantenimiento').length;

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="header-bar">
        <h1 className="brand-title">
          <Cpu color="#60a5fa" size={24} /> Gestor de Turnos
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
      <div className="summary-pills">
        <div className="pill-card available">
          <span className="pill-num">{disponibles}</span>
          <span className="pill-label">Disponibles</span>
        </div>
        <div className="pill-card in-use">
          <span className="pill-num">{enUso}</span>
          <span className="pill-label">En Uso</span>
        </div>
        <div className="pill-card maintenance">
          <span className="pill-num">{mantenimiento}</span>
          <span className="pill-label">Taller</span>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'machines' ? (
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
                onAssignShift={handleAssignShiftClick}
                onCompleteShift={handleCompleteShift}
                onChangeStatus={handleChangeStatus}
              />
            ))}
          </div>
        </>
      ) : (
        <ShiftsList shifts={shifts} machines={machines} />
      )}

      {/* Modals */}
      {isShiftModalOpen && (
        <ShiftModal 
          machines={machines}
          selectedMachine={selectedMachineForShift}
          onClose={() => setIsShiftModalOpen(false)}
          onSubmit={handleCreateShift}
        />
      )}

      {isMachineModalOpen && (
        <MachineModal 
          onClose={() => setIsMachineModalOpen(false)}
          onSubmit={handleCreateMachine}
        />
      )}

      {/* Bottom Nav Bar */}
      <BottomNav 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNewShift={() => {
          setSelectedMachineForShift(null);
          setIsShiftModalOpen(true);
        }} 
      />
    </div>
  );
}
