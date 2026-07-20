from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- SHIFT SCHEMAS ---
class ShiftBase(BaseModel):
    operator_name: str
    duration_minutes: Optional[int] = 60
    notes: Optional[str] = None

class ShiftCreate(ShiftBase):
    machine_id: int

class ShiftUpdateStatus(BaseModel):
    status: str  # completado, cancelado

class ShiftResponse(ShiftBase):
    id: int
    machine_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- MACHINE SCHEMAS ---
class MachineBase(BaseModel):
    name: str
    code: str
    category: Optional[str] = "General"
    location: Optional[str] = None
    notes: Optional[str] = None

class MachineCreate(MachineBase):
    status: Optional[str] = "disponible"

class MachineStatusUpdate(BaseModel):
    status: str  # disponible, en_uso, mantenimiento
    notes: Optional[str] = None

class MachineResponse(MachineBase):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    current_shift: Optional[ShiftResponse] = None

    class Config:
        from_attributes = True

# --- SUMMARY / STATS SCHEMAS ---
class SummaryResponse(BaseModel):
    total_machines: int
    disponibles: int
    en_uso: int
    mantenimiento: int
    turnos_activos: int
