import React from 'react';
import { ClipboardList, Settings } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`nav-item ${activeTab === 'sheet' ? 'active' : ''}`}
        style={{ width: '50%' }}
        onClick={() => setActiveTab('sheet')}
      >
        <ClipboardList />
        <span>Parte Turno</span>
      </button>

      <button 
        className={`nav-item ${activeTab === 'crud' ? 'active' : ''}`}
        style={{ width: '50%' }}
        onClick={() => setActiveTab('crud')}
      >
        <Settings />
        <span>CRUD</span>
      </button>
    </nav>
  );
}
