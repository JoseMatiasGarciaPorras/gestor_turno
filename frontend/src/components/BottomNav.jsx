import React from 'react';
import { ClipboardList, History, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'sheet' ? 'active' : ''}`}
        style={{ width: '33.33%' }}
        onClick={() => setActiveTab('sheet')}
      >
        <ClipboardList />
        <span>Parte Turno</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
        style={{ width: '33.33%' }}
        onClick={() => setActiveTab('history')}
      >
        <History />
        <span>Historial</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'crud' ? 'active' : ''}`}
        style={{ width: '33.33%' }}
        onClick={() => setActiveTab('crud')}
      >
        <Settings />
        <span>CRUD</span>
      </button>
    </nav>
  );
}
