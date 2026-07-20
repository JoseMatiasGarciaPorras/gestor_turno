import React from 'react';
import { Cpu, UserCheck, Package, Factory } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
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
        className={`nav-item ${activeTab === 'operators' ? 'active' : ''}`}
        onClick={() => setActiveTab('operators')}
      >
        <UserCheck />
        <span>Operarios</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'parts' ? 'active' : ''}`}
        onClick={() => setActiveTab('parts')}
      >
        <Package />
        <span>Piezas</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'production' ? 'active' : ''}`}
        onClick={() => setActiveTab('production')}
      >
        <Factory />
        <span>Producción</span>
      </button>
    </nav>
  );
}
