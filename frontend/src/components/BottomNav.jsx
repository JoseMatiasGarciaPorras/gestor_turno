import React from 'react';
import { ClipboardList, UserCheck, Calendar, History, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'sheet' ? 'active' : ''}`}
        style={{ width: '20%' }}
        onClick={() => setActiveTab('sheet')}
      >
        <ClipboardList />
        <span>Parte Turno</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'operators' ? 'active' : ''}`}
        style={{ width: '20%' }}
        onClick={() => setActiveTab('operators')}
      >
        <UserCheck />
        <span>Operarios</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'roster' ? 'active' : ''}`}
        style={{ width: '20%' }}
        onClick={() => setActiveTab('roster')}
      >
        <Calendar />
        <span>Cuadrante</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        style={{ width: '20%' }}
        onClick={() => setActiveTab('history')}
      >
        <History />
        <span>Historial</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'crud' ? 'active' : ''}`}
        style={{ width: '20%' }}
        onClick={() => setActiveTab('crud')}
      >
        <Settings />
        <span>CRUD</span>
      </button>
    </nav>
  );
}
