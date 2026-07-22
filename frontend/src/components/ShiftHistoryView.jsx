import React, { useState } from 'react';
import { Calendar, User, FileText, CheckCircle, AlertOctagon, Layers, Clock, Trash2 } from 'lucide-react';

export default function ShiftHistoryView({ shiftSheets = [], onOpenHtmlReport, onDeleteSheet }) {
  const [sheetToDelete, setSheetToDelete] = useState(null);
  return (
    <div style={{ marginTop: '10px' }}>
      <div className="section-header">
        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa' }}>
          <Layers size={22} color="#60a5fa" /> Historial de Partes Guardados
        </h2>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>
          {shiftSheets.length} Partes registrados
        </span>
      </div>

      {shiftSheets.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 20px', 
          color: '#94a3b8',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          marginTop: '16px'
        }}>
          <Clock size={40} color="#475569" style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#cbd5e1' }}>No hay partes de producción guardados todavía.</p>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Crea un nuevo parte en la pestaña "Parte Turno" y pulsa "Guardar".
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
          {shiftSheets.map((sheet) => {
            const totalOk = sheet.items ? sheet.items.reduce((acc, i) => acc + (i.quantity_ok || 0), 0) : 0;
            const totalKo = sheet.items ? sheet.items.reduce((acc, i) => acc + (i.quantity_ko || 0), 0) : 0;
            const itemsCount = sheet.items ? sheet.items.length : 0;

            return (
              <div key={sheet.id} className="history-card" style={{ 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                gap: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                padding: '16px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                {/* Header del Parte */}
                <div style={{ 
                  display: 'flex', 
                  justify: 'space-between', 
                  alignItems: 'center', 
                  borderBottom: '1px dashed var(--border-color)', 
                  paddingBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', color: '#60a5fa', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={16} /> {sheet.production_date} — Turno {sheet.shift_name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#38bdf8" /> Encargado: <strong style={{ color: '#e2e8f0' }}>{sheet.supervisor}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ 
                        padding: '6px 14px', 
                        minHeight: '38px', 
                        fontSize: '0.82rem', 
                        background: 'rgba(59, 130, 246, 0.15)', 
                        color: '#60a5fa', 
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        fontWeight: 'bold'
                      }}
                      onClick={() => onOpenHtmlReport(sheet.id)}
                    >
                      <FileText size={16} /> Ver Informe HTML
                    </button>
                    <button 
                      className="btn btn-danger"
                      style={{ 
                        padding: '6px 10px', 
                        minHeight: '38px',
                        background: 'rgba(244, 63, 94, 0.15)',
                        border: '1px solid rgba(244, 63, 94, 0.4)'
                      }}
                      onClick={() => setSheetToDelete(sheet.id)}
                      title="Eliminar este parte de producción"
                    >
                      <Trash2 size={16} color="#f43f5e" />
                    </button>
                  </div>
                </div>

                {/* Métricas del Parte */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px 10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6ee7b7', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <CheckCircle size={12} /> PROD OK
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>
                      {totalOk}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '8px 10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#fda4af', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <AlertOctagon size={12} /> SCRAP KO
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#f43f5e', marginTop: '2px' }}>
                      {totalKo}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)', padding: '8px 10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.7rem', color: '#d8b4fe', fontWeight: 'bold' }}>
                      REGISTROS
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#c084fc', marginTop: '2px' }}>
                      {itemsCount}
                    </div>
                  </div>
                </div>

                {/* Notas o incidencias */}
                {sheet.incidents_notes && (
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #3b82f6' }}>
                    <strong>Notas/Incidencias:</strong> {sheet.incidents_notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE BORRADO DE PARTE */}
      {sheetToDelete !== null && (
        <div className="modal-overlay" onClick={() => setSheetToDelete(null)} style={{ zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '400px' }}>
            <Trash2 size={48} color="#f43f5e" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', color: '#ffffff' }}>¿Eliminar Parte de Turno?</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '20px' }}>
              ¿Estás seguro de que deseas eliminar permanentemente este parte de producción? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheetToDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex: 1, background: '#f43f5e', color: 'white' }} onClick={() => {
                onDeleteSheet(sheetToDelete);
                setSheetToDelete(null);
              }}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
