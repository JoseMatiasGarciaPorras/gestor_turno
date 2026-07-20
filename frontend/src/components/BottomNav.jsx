import React from 'react';
import { Cpu, PlusCircle, History } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenNewShift }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'machines' ? 'active' : ''}`}
        onClick={() => setActiveTab('machines')}
      >
        <Cpu />
        <span>Máquinas</span>
      </button>

      <button 
        className="nav-item"
        style={{ color: '#3b82f6' }}
        onClick={onOpenNewShift}
      >
        <PlusCircle style={{ width: '28px', height: '28px' }} />
        <span>+ Turno</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        <History />
        <span>Historial</span>
      </button>
    </nav>
  );
}
