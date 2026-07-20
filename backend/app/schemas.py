from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

# --- OPERATOR SCHEMAS ---
class OperatorBase(BaseModel):
    name: str
    operator_number: str  # Número de operario manual único

class OperatorCreate(OperatorBase):
    pass

class OperatorResponse(OperatorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- PART SCHEMAS ---
class PartBase(BaseModel):
    name: str
    references: str  # Referencias alfanuméricas únicas (ej: REF-A100, REF-B200)
    description: Optional[str] = None

class PartCreate(PartBase):
    pass

class PartResponse(PartBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- MACHINE SCHEMAS ---
class MachineBase(BaseModel):
    name: str
    machine_number: str  # Número/Código de máquina
    category: Optional[str] = "General"
    location: Optional[str] = None

class MachineCreate(MachineBase):
    status: Optional[str] = "disponible"

class MachineStatusUpdate(BaseModel):
    status: str

class MachineResponse(MachineBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- SHIFT SCHEMAS ---
class ShiftBase(BaseModel):
    operator_name: str
    operator_id: Optional[int] = None
    duration_minutes: Optional[int] = 60
    notes: Optional[str] = None

class ShiftCreate(ShiftBase):
    machine_id: int

class ShiftResponse(ShiftBase):
    id: int
    machine_id: int
    operator_id: Optional[int] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- PRODUCTION SCHEMAS ---
class ProductionBase(BaseModel):
    production_date: date
    shift_name: str  # Turno
    supervisor: str  # Encargado
    machine_id: int
    operator_id: int
    part_id: int
    quantity_produced: int
    notes: Optional[str] = None

class ProductionCreate(ProductionBase):
    pass

class ProductionResponse(ProductionBase):
    id: int
    created_at: datetime
    machine: Optional[MachineResponse] = None
    operator: Optional[OperatorResponse] = None
    part: Optional[PartResponse] = None

    class Config:
        from_attributes = True

# --- SUMMARY RESPONSE ---
class SummaryResponse(BaseModel):
    total_machines: int
    disponibles: int
    en_uso: int
    mantenimiento: int
    total_operators: int
    total_parts: int
    total_productions: int
