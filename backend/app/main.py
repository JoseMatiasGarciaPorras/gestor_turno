from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import engine, Base, get_db
from app.models import Machine, Shift
from app.schemas import (
    MachineCreate, MachineResponse, MachineStatusUpdate,
    ShiftCreate, ShiftResponse, ShiftUpdateStatus,
    SummaryResponse
)

# Crear tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestor de Turnos de Máquinas API",
    description="API RESTful Mobile-First para control de máquinas, turnos y operadores",
    version="1.0.0"
)

# Permitir CORS para React y consumo desde móviles en red local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_initial_data(db: Session):
    if db.query(Machine).count() == 0:
        initial_machines = [
            Machine(name="Torno CNC Haas ST-10", code="CNC-01", category="Mecanizado", status="disponible", location="Sector A"),
            Machine(name="Fresadora Vertical VF-2", code="FRE-02", category="Mecanizado", status="en_uso", location="Sector A"),
            Machine(name="Cortadora Láser Fibra 3kW", code="LAS-01", category="Corte", status="disponible", location="Sector B"),
            Machine(name="Inyectora de Plástico 150T", code="INY-03", category="Inyección", status="mantenimiento", location="Sector C"),
            Machine(name="Plegadora Hidráulica 100T", code="PLE-01", category="Corte", status="disponible", location="Sector B"),
        ]
        db.add_all(initial_machines)
        db.commit()

        # Turno inicial en la fresadora
        fresadora = db.query(Machine).filter(Machine.code == "FRE-02").first()
        if fresadora:
            turno_ejemplo = Shift(
                machine_id=fresadora.id,
                operator_name="Carlos Mendoza",
                duration_minutes=120,
                status="activo",
                notes="Piezas de aluminio serie #402"
            )
            db.add(turno_ejemplo)
            db.commit()

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        seed_initial_data(db)
    finally:
        db.close()

# --- ENDPOINTS MÁQUINAS ---

@app.get("/api/machines", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    machines = db.query(Machine).order_by(Machine.id.asc()).all()
    result = []
    for m in machines:
        current_shift = db.query(Shift).filter(
            Shift.machine_id == m.id,
            Shift.status == "activo"
        ).order_by(Shift.id.desc()).first()
        
        m_dict = MachineResponse.from_orm(m)
        if current_shift:
            m_dict.current_shift = ShiftResponse.from_orm(current_shift)
        result.append(m_dict)
    return result

@app.post("/api/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.code == machine.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una máquina con este código.")
    
    db_machine = Machine(**machine.dict())
    db.add(db_machine)
    db.commit()
    db.refresh(db_machine)
    return db_machine

@app.patch("/api/machines/{machine_id}/status", response_model=MachineResponse)
def update_machine_status(machine_id: int, payload: MachineStatusUpdate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=44, detail="Máquina no encontrada.")
    
    machine.status = payload.status
    if payload.notes:
        machine.notes = payload.notes
        
    # Si la máquina pasa a disponible o mantenimiento, finalizar cualquier turno activo
    if payload.status in ("disponible", "mantenimiento"):
        active_shifts = db.query(Shift).filter(
            Shift.machine_id == machine_id,
            Shift.status == "activo"
        ).all()
        for s in active_shifts:
            s.status = "completado"
            s.end_time = datetime.utcnow()
            
    db.commit()
    db.refresh(machine)
    return machine

@app.delete("/api/machines/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    db.delete(machine)
    db.commit()
    return None

# --- ENDPOINTS TURNOS ---

@app.get("/api/shifts", response_model=List[ShiftResponse])
def get_shifts(status_filter: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Shift)
    if status_filter:
        query = query.filter(Shift.status == status_filter)
    return query.order_by(Shift.id.desc()).limit(50).all()

@app.post("/api/shifts", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(shift: ShiftCreate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == shift.machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    
    if machine.status == "mantenimiento":
        raise HTTPException(status_code=400, detail="La máquina está en mantenimiento.")
        
    # Finalizar turnos anteriores si existieran
    existing_shifts = db.query(Shift).filter(
        Shift.machine_id == shift.machine_id,
        Shift.status == "activo"
    ).all()
    for s in existing_shifts:
        s.status = "completado"
        s.end_time = datetime.utcnow()

    # Crear nuevo turno
    db_shift = Shift(
        machine_id=shift.machine_id,
        operator_name=shift.operator_name,
        duration_minutes=shift.duration_minutes,
        notes=shift.notes,
        status="activo",
        start_time=datetime.utcnow()
    )
    
    # Cambiar estado de la máquina a en_uso
    machine.status = "en_uso"
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    return db_shift

@app.patch("/api/shifts/{shift_id}/complete", response_model=ShiftResponse)
def complete_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Turno no encontrado.")
    
    shift.status = "completado"
    shift.end_time = datetime.utcnow()
    
    # Si la máquina está asociada a este turno y en_uso, volver a disponible
    machine = db.query(Machine).filter(Machine.id == shift.machine_id).first()
    if machine and machine.status == "en_uso":
        machine.status = "disponible"
        
    db.commit()
    db.refresh(shift)
    return shift

# --- ENDPOINT SUMMARY / METRICS ---

@app.get("/api/summary", response_model=SummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    total = db.query(Machine).count()
    disponibles = db.query(Machine).filter(Machine.status == "disponible").count()
    en_uso = db.query(Machine).filter(Machine.status == "en_uso").count()
    mantenimiento = db.query(Machine).filter(Machine.status == "mantenimiento").count()
    activos = db.query(Shift).filter(Shift.status == "activo").count()
    
    return SummaryResponse(
        total_machines=total,
        disponibles=disponibles,
        en_uso=en_uso,
        mantenimiento=mantenimiento,
        turnos_activos=activos
    )
