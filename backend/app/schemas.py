from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

# --- OPERATOR SCHEMAS ---
class OperatorBase(BaseModel):
    name: str
    operator_number: str

class OperatorCreate(OperatorBase):
    pass

class OperatorResponse(OperatorBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- PART REFERENCE SCHEMAS ---
class PartReferenceBase(BaseModel):
    code: str
    side_type: Optional[str] = "Única"  # IZQ, DCH, Única, Variante A, Variante B

class PartReferenceCreate(PartReferenceBase):
    pass

class PartReferenceResponse(PartReferenceBase):
    id: int

    class Config:
        from_attributes = True

# --- PART SCHEMAS ---
class PartBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_montaje: bool = False

class PartCreate(PartBase):
    references: List[PartReferenceCreate] = []

class PartResponse(PartBase):
    id: int
    created_at: datetime
    references_list: List[PartReferenceResponse] = []

    class Config:
        from_attributes = True

# --- MACHINE SCHEMAS ---
class MachineBase(BaseModel):
    name: str
    machine_number: str
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

# --- PRODUCTION ITEM SCHEMAS ---
class ProductionItemBase(BaseModel):
    machine_id: Optional[int] = None
    machine_name_manual: Optional[str] = None
    machine_side: Optional[str] = "IZQ"
    
    part_id: Optional[int] = None
    part_reference_manual: Optional[str] = None
    
    quantity_ok: int = 0
    quantity_ko: int = 0
    
    operator_id: Optional[int] = None
    operator_name_manual: Optional[str] = None
    operator_number_manual: Optional[str] = None
    
    is_montaje: bool = False
    is_csl1: bool = False

class ProductionItemCreate(ProductionItemBase):
    pass

class ProductionItemResponse(ProductionItemBase):
    id: int
    machine: Optional[MachineResponse] = None
    part: Optional[PartResponse] = None
    operator: Optional[OperatorResponse] = None

    class Config:
        from_attributes = True

# --- SHIFT SHEET SCHEMAS ---
class ShiftSheetBase(BaseModel):
    production_date: date
    shift_name: str
    supervisor: str
    incidents_notes: Optional[str] = None

class ShiftSheetCreate(ShiftSheetBase):
    items: List[ProductionItemCreate] = []

class ShiftSheetResponse(ShiftSheetBase):
    id: int
    created_at: datetime
    items: List[ProductionItemResponse] = []

    class Config:
        from_attributes = True

class SummaryResponse(BaseModel):
    total_machines: int
    disponibles: int
    en_uso: int
    mantenimiento: int
    total_operators: int
    total_parts: int
    total_sheets: int
