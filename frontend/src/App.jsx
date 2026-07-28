import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import ShiftProductionSheet from './components/ShiftProductionSheet';
import AdminCrudView from './components/AdminCrudView';
import ShiftHistoryView from './components/ShiftHistoryView';
import OperatorsList from './components/OperatorsList';
import RosterView from './components/RosterView';
import BottomNav from './components/BottomNav';
import LoginRegisterView from './components/LoginRegisterView';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (!envUrl) {
    const hostname = window.location.hostname;
    return `http://${hostname}:8000/api`;
  }
  
  let url = envUrl;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') {
      parsed.hostname = `${parsed.hostname}.onrender.com`;
      url = parsed.toString();
    }
  } catch (e) {
    if (!envUrl.includes('.') && envUrl !== 'localhost') {
      url = `https://${envUrl}.onrender.com`;
    }
  }

  return url.endsWith('/api') ? url : (url.endsWith('/') ? `${url}api` : `${url}/api`);
};

const API_BASE_URL = getApiBaseUrl();

export function generateReportHtml(sheet) {
  const items = sheet.items || [];
  const plantaItems = items.filter(i => !i.is_montaje && i.machine_name_manual !== 'REVISION');
  const montajeItems = items.filter(i => i.is_montaje);
  const revisionItems = items.filter(i => i.machine_name_manual === 'REVISION');

  const renderRow = (item) => {
    const macName = (item.machine && item.machine.name) ? item.machine.name : (item.machine_name_manual || '-');
    let partRef = (item.part && item.part.name) ? item.part.name : (item.part_reference_manual || '-');
    if (item.is_csl1) {
      partRef += ` <span style="background:#f43f5e;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;font-weight:bold;margin-left:4px;">CSL1</span>`;
    }
    const opNum = (item.operator && item.operator.operator_number) ? item.operator.operator_number : (item.operator_number_manual || '-');
    const opName = (item.operator && item.operator.name) ? item.operator.name : (item.operator_name_manual || '-');
    const side = item.machine_side || 'IZQ';
    const qtyOk = item.quantity_ok || 0;
    const qtyKo = item.quantity_ko > 0 ? item.quantity_ko : '';

    return `
    <tr>
        <td style="font-weight: bold;">${macName}</td>
        <td style="text-align: center;">${side}</td>
        <td style="font-family: monospace; font-weight: bold;">${partRef}</td>
        <td style="text-align: center; font-weight: bold; color: #15803d;">${qtyOk}</td>
        <td style="text-align: center; color: #b91c1c;">${qtyKo}</td>
        <td style="text-align: center; font-weight: bold;">${opNum}</td>
        <td>${opName}</td>
    </tr>
    `;
  };

  const plantaRowsHtml = plantaItems.map(renderRow).join('');
  const montajeRowsHtml = montajeItems.map(renderRow).join('');
  const revisionRowsHtml = revisionItems.map(renderRow).join('');

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
      <meta charset="UTF-8">
      <title>PARTE DE PRODUCCIÓN DIARIO - ${sheet.production_date}</title>
      <style>
          body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; margin: 0; }
          .paper { max-width: 850px; margin: 0 auto; background: white; border: 2px solid #0f172a; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
          .header-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
          th, td { border: 1px solid #334155; padding: 5px 8px; text-align: left; }
          th { background: #e2e8f0; font-size: 11px; text-transform: uppercase; }
          .section-title { background: #1e293b; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 10px; margin-bottom: 5px; }
          .notes { border: 1px solid #334155; padding: 8px; font-size: 12px; background: #fffbebf8; margin-top: 10px; }
          @media print { body { background: white; padding: 0; } .paper { box-shadow: none; border: 1px solid black; } }
      </style>
  </head>
  <body>
      <div class="paper">
          <div class="header-grid">
              <div>DIA / FECHA: <span style="font-weight: normal;">${sheet.production_date}</span></div>
              <div>TURNO: <span style="font-weight: normal;">${sheet.shift_name}</span></div>
              <div>ENCARGADO: <span style="font-weight: normal;">${sheet.supervisor}</span></div>
          </div>

          <div class="section-title">PRODUCCIÓN MÁQUINAS EN PLANTA</div>
          <table>
              <thead>
                  <tr>
                      <th style="width: 20%;">MÁQUINA</th>
                      <th style="width: 8%;">LADO</th>
                      <th style="width: 25%;">REFERENCIA</th>
                      <th style="width: 10%;">PROD OK</th>
                      <th style="width: 10%;">PROD KO</th>
                      <th style="width: 10%;">Nº OP</th>
                      <th style="width: 17%;">OPERARIO</th>
                  </tr>
              </thead>
              <tbody>
                  ${plantaRowsHtml ? plantaRowsHtml : '<tr><td colspan="7" style="text-align:center;">Sin filas de máquinas en planta</td></tr>'}
              </tbody>
          </table>

          ${montajeRowsHtml ? `
          <div class="section-title">MONTAJE</div>
          <table>
              <thead>
                  <tr>
                      <th style="width: 20%;">MÁQUINA</th>
                      <th style="width: 8%;">LADO</th>
                      <th style="width: 25%;">REFERENCIA</th>
                      <th style="width: 10%;">PROD OK</th>
                      <th style="width: 10%;">PROD KO</th>
                      <th style="width: 10%;">Nº OP</th>
                      <th style="width: 17%;">OPERARIO</th>
                  </tr>
              </thead>
              <tbody>
                  ${montajeRowsHtml}
              </tbody>
          </table>
          ` : ''}

          ${revisionRowsHtml ? `
          <div class="section-title">REVISIÓN CSL1</div>
          <table>
              <thead>
                  <tr>
                      <th style="width: 20%;">PIEZA / REF</th>
                      <th style="width: 8%;">LADO</th>
                      <th style="width: 25%;">REFERENCIA</th>
                      <th style="width: 10%;">PROD OK</th>
                      <th style="width: 10%;">PROD KO</th>
                      <th style="width: 10%;">Nº OP</th>
                      <th style="width: 17%;">OPERARIO</th>
                  </tr>
              </thead>
              <tbody>
                  ${revisionRowsHtml}
              </tbody>
          </table>
          ` : ''}

          <div class="notes">
              <strong>FALTA PERSONAL O NOTAS / INCIDENCIAS:</strong><br/>
              ${sheet.incidents_notes ? sheet.incidents_notes : 'Ninguna.'}
          </div>
      </div>
  </body>
  </html>
  `;
}

export default function App() {
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [parts, setParts] = useState([]);
  const [shiftSheets, setShiftSheets] = useState([]);
  const [activeMontajes, setActiveMontajes] = useState([]);
  const [activeRevisions, setActiveRevisions] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState(null);
  const [weeklySnapshots, setWeeklySnapshots] = useState([]);
  
  // Vistas principales: 'sheet' | 'crud'
  const [activeTab, setActiveTab] = useState('sheet'); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de autenticación
  const [token, setToken] = useState(() => localStorage.getItem('gestor_token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setUsers([]);
    localStorage.removeItem('gestor_token');
    setActiveTab('sheet');
  };

  const fetchUsers = async () => {
    if (!token || currentUser?.role !== 'supervisor') return;
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.warn("Error cargando lista de encargados:", e);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setCurrentUser(null);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data);
        } else {
          handleLogout();
        }
      } catch (e) {
        console.warn("Error cargando perfil de supervisor:", e);
      }
    };
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (token && currentUser?.role === 'supervisor') {
      fetchUsers();
    } else {
      setUsers([]);
    }
  }, [token, currentUser]);

  const fetchData = async () => {
    setLoading(true);
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const [resMac, resOp, resParts, resSheets, resActiveMontajes, resActiveRevisions] = await Promise.all([
        fetch(`${API_BASE_URL}/machines`),
        fetch(`${API_BASE_URL}/operators`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/parts`),
        fetch(`${API_BASE_URL}/shift-sheets`, { headers: authHeaders }),
        fetch(`${API_BASE_URL}/active-montajes`),
        fetch(`${API_BASE_URL}/active-revisions`)
      ]);

      if (resMac.ok && resOp.ok && resParts.ok && resSheets.ok && resActiveMontajes.ok && resActiveRevisions.ok) {
        const macsData = await resMac.json();
        const opsData = await resOp.json();
        const partsData = await resParts.json();
        const sheetsData = await resSheets.json();
        const activeMontajesData = await resActiveMontajes.json();
        const activeRevisionsData = await resActiveRevisions.json();

        setActiveMontajes(activeMontajesData);
        setActiveRevisions(activeRevisionsData);

        // Fusionar datos de la API con los locales offline para evitar pérdidas de CRUD locales
        const cachedMacRaw = localStorage.getItem('gestor_machines');
        const cachedMac = cachedMacRaw ? JSON.parse(cachedMacRaw) : [];
        const offlineMac = cachedMac.filter(m => m && m.id && Number(m.id) > 1000000000000);
        const mergedMacMap = new Map();
        [...macsData, ...offlineMac].forEach(m => {
          if (m && m.id) mergedMacMap.set(String(m.id), m);
        });
        const mergedMacs = Array.from(mergedMacMap.values());
        setMachines(mergedMacs);
        localStorage.setItem('gestor_machines', JSON.stringify(mergedMacs));

        const cachedOpRaw = localStorage.getItem('gestor_operators');
        const cachedOp = cachedOpRaw ? JSON.parse(cachedOpRaw) : [];
        const offlineOp = cachedOp.filter(o => o && o.id && Number(o.id) > 1000000000000);
        const mergedOpMap = new Map();
        [...opsData, ...offlineOp].forEach(o => {
          if (o && o.id) mergedOpMap.set(String(o.id), o);
        });
        const mergedOps = Array.from(mergedOpMap.values());
        setOperators(mergedOps);
        localStorage.setItem('gestor_operators', JSON.stringify(mergedOps));

        const cachedPartsRaw = localStorage.getItem('gestor_parts');
        const cachedParts = cachedPartsRaw ? JSON.parse(cachedPartsRaw) : [];
        const offlineParts = cachedParts.filter(p => p && p.id && Number(p.id) > 1000000000000);
        const mergedPartsMap = new Map();
        [...partsData, ...offlineParts].forEach(p => {
          if (p && p.id) mergedPartsMap.set(String(p.id), p);
        });
        const mergedParts = Array.from(mergedPartsMap.values());
        setParts(mergedParts);
        localStorage.setItem('gestor_parts', JSON.stringify(mergedParts));

        // Fusionar hojas de la API con historial en localStorage para evitar pérdidas ante reinicios del backend
        const cachedSheetsRaw = localStorage.getItem('gestor_shift_sheets');
        const cachedSheets = cachedSheetsRaw ? JSON.parse(cachedSheetsRaw) : [];
        
        const mergedMap = new Map();
        
        // 1. Cargar todas las hojas del caché local (tanto offline como previamente sincronizadas)
        cachedSheets.forEach(s => {
          if (s && s.id) mergedMap.set(String(s.id), s);
        });
        
        // 2. Añadir/Sobrescribir con las hojas obtenidas de la API
        sheetsData.forEach(s => {
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
            fetch(`${API_BASE_URL}/weekly-history/current`, { headers: authHeaders }),
            fetch(`${API_BASE_URL}/weekly-snapshots`, { headers: authHeaders })
          ]);
          if (resHist.ok) {
            const histData = await resHist.json();
            setWeeklyHistory(histData);
          }
          if (resSnaps.ok) {
            const snapsData = await resSnaps.json();
            setWeeklySnapshots(snapsData);
            localStorage.setItem('gestor_weekly_snapshots', JSON.stringify(snapsData));
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
      const cachedSnaps = localStorage.getItem('gestor_weekly_snapshots');

      if (cachedSnaps) setWeeklySnapshots(JSON.parse(cachedSnaps));

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

  // active-montajes CRUD
  const handleAddActiveMontaje = async (partId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-montajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error adding active montage:", e);
    }
  };

  const handleUpdateActiveMontaje = async (id, partId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-montajes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error updating active montage:", e);
    }
  };

  const handleDeleteActiveMontaje = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-montajes/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error deleting active montage:", e);
    }
  };

  // active-revisions CRUD
  const handleAddActiveRevision = async (partId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-revisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error adding active revision:", e);
    }
  };

  const handleUpdateActiveRevision = async (id, partId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-revisions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error updating active revision:", e);
    }
  };

  const handleDeleteActiveRevision = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/active-revisions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (e) {
      console.warn("Error deleting active revision:", e);
    }
  };

  // Guardar Parte de Turno
  const handleSaveSheet = async (sheetPayload) => {
    if (!token) {
      alert("Debes iniciar sesión como supervisor para guardar partes en el servidor.");
      setActiveTab('login');
      return;
    }
    let createdSheet = null;
    try {
      const res = await fetch(`${API_BASE_URL}/shift-sheets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
    const sheet = shiftSheets.find(s => String(s.id) === String(sheetId));
    if (sheet) {
      const htmlContent = generateReportHtml(sheet);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } else {
      window.open(`${API_BASE_URL}/shift-sheets/${sheetId}/html?token=${token}`, '_blank');
    }
  };

  const handleDeleteSheet = async (id) => {
    if (!token) {
      alert("Debes iniciar sesión como supervisor para eliminar partes.");
      setActiveTab('login');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/shift-sheets/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const res = await fetch(`${API_BASE_URL}/operators/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const res = await fetch(`${API_BASE_URL}/parts/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const res = await fetch(`${API_BASE_URL}/machines/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) { await fetchData(); return; }
    } catch (e) {}
    const updated = machines.filter(m => m.id !== id);
    setMachines(updated);
    localStorage.setItem('gestor_machines', JSON.stringify(updated));
  };

  if (!token) {
    return (
      <div className="app-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoginRegisterView 
          API_BASE_URL={API_BASE_URL} 
          onLogin={(newToken) => {
            setToken(newToken);
            localStorage.setItem('gestor_token', newToken);
            setActiveTab('sheet');
          }} 
        />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="header-bar">
        <h1 className="brand-title">
          <Cpu color="#60a5fa" size={24} /> Gestor de Turnos & Planta
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {error && (
            <span 
              title={`Intentando conectar a: ${API_BASE_URL}`}
              style={{ 
                fontSize: '0.72rem', 
                color: '#f87171', 
                background: 'rgba(239, 68, 68, 0.15)', 
                padding: '4px 10px', 
                borderRadius: '12px', 
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 'bold',
                cursor: 'help'
              }}
            >
              ⚠️ Offline ({API_BASE_URL})
            </span>
          )}
          
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', background: 'rgba(96, 165, 250, 0.12)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(96, 165, 250, 0.25)', color: '#93c5fd' }}>
              <span>👤 {currentUser.role === 'supervisor' ? '[Sup.] ' : ''}{currentUser.full_name || currentUser.email}</span>
              <button 
                onClick={handleLogout} 
                style={{ background: 'none', border: 'none', color: '#f87171', fontWeight: 'bold', cursor: 'pointer', padding: '0 0 0 6px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setActiveTab('login')} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', minHeight: '34px', fontSize: '0.75rem', background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)', color: '#93c5fd', whiteSpace: 'nowrap' }}
            >
              Acceso Sup.
            </button>
          )}

          <button onClick={fetchData} className="btn btn-secondary" style={{ padding: '6px 10px', minHeight: '36px', fontSize: '0.8rem' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
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
          onUpdateMachine={handleUpdateMachine}
          currentUser={currentUser}
          activeMontajes={activeMontajes}
          activeRevisions={activeRevisions}
          onAddActiveMontaje={handleAddActiveMontaje}
          onUpdateActiveMontaje={handleUpdateActiveMontaje}
          onDeleteActiveMontaje={handleDeleteActiveMontaje}
          onAddActiveRevision={handleAddActiveRevision}
          onUpdateActiveRevision={handleUpdateActiveRevision}
          onDeleteActiveRevision={handleDeleteActiveRevision}
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
          shiftSheets={shiftSheets}
          operators={operators}
          machines={machines}
          weeklySnapshots={weeklySnapshots}
          onRefresh={fetchData}
          token={token}
          currentUser={currentUser}
          users={users}
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
