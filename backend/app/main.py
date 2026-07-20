from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date

from app.database import engine, Base, get_db
from app.models import Machine, Shift, Operator, Part, Production
from app.schemas import (
    MachineCreate, MachineResponse, MachineStatusUpdate,
    ShiftCreate, ShiftResponse,
    OperatorCreate, OperatorResponse,
    PartCreate, PartResponse,
    ProductionCreate, ProductionResponse,
    SummaryResponse
)

# Recrear o actualizar tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestor de Turnos y Producción de Máquinas API",
    description="API RESTful Mobile-First para control de Máquinas, Operarios, Piezas, Turnos y Registros de Producción con informes HTML.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_initial_data(db: Session):
    if db.query(Operator).count() == 0:
        ops = [
            Operator(name="Juan Pérez", operator_number="OP-001"),
            Operator(name="Carlos Mendoza", operator_number="OP-002"),
            Operator(name="Ana Gómez", operator_number="OP-003"),
        ]
        db.add_all(ops)
        db.commit()

    if db.query(Machine).count() == 0:
        macs = [
            Machine(name="Torno CNC Haas ST-10", machine_number="M-101", category="Mecanizado", status="disponible", location="Sector A"),
            Machine(name="Fresadora VF-2", machine_number="M-102", category="Mecanizado", status="en_uso", location="Sector A"),
            Machine(name="Cortadora Láser 3kW", machine_number="M-201", category="Corte", status="disponible", location="Sector B"),
            Machine(name="Inyectora 150T", machine_number="M-301", category="Inyección", status="mantenimiento", location="Sector C"),
        ]
        db.add_all(macs)
        db.commit()

    if db.query(Part).count() == 0:
        parts = [
            Part(name="Eje de Transmisión Al-7075", references="REF-EJ-1001, REF-EJ-1002", description="Eje tratado térmicamente para motor"),
            Part(name="Placa Base de Acero Inox", references="REF-PL-2040", description="Placa cortada por láser 5mm"),
            Part(name="Carcasa de Inyección Polímero", references="REF-CAR-990", description="Carcasa frontal protectora"),
        ]
        db.add_all(parts)
        db.commit()

    if db.query(Production).count() == 0:
        op = db.query(Operator).first()
        m = db.query(Machine).first()
        p = db.query(Part).first()
        if op and m and p:
            prod = Production(
                production_date=date.today(),
                shift_name="Mañana (06:00 - 14:00)",
                supervisor="Ing. Roberto Silva",
                machine_id=m.id,
                operator_id=op.id,
                part_id=p.id,
                quantity_produced=150,
                notes="Producción terminada sin incidencias técnicas."
            )
            db.add(prod)
            db.commit()

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        seed_initial_data(db)
    finally:
        db.close()

# --- OPERARIOS ---

@app.get("/api/operators", response_model=List[OperatorResponse])
def get_operators(db: Session = Depends(get_db)):
    return db.query(Operator).order_by(Operator.name.asc()).all()

@app.post("/api/operators", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
def create_operator(operator: OperatorCreate, db: Session = Depends(get_db)):
    existing = db.query(Operator).filter(Operator.operator_number == operator.operator_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un operario con el número '{operator.operator_number}'.")
    
    db_op = Operator(name=operator.name, operator_number=operator.operator_number)
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op

# --- PIEZAS ---

@app.get("/api/parts", response_model=List[PartResponse])
def get_parts(db: Session = Depends(get_db)):
    return db.query(Part).order_by(Part.name.asc()).all()

@app.post("/api/parts", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(part: PartCreate, db: Session = Depends(get_db)):
    existing = db.query(Part).filter(Part.references == part.references).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una pieza registrada con la referencia '{part.references}'.")
    
    db_part = Part(name=part.name, references=part.references, description=part.description)
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part

# --- MÁQUINAS ---

@app.get("/api/machines", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).order_by(Machine.id.asc()).all()

@app.post("/api/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
    existing = db.query(Machine).filter(Machine.machine_number == machine.machine_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una máquina con el número '{machine.machine_number}'.")
    
    db_mac = Machine(
        name=machine.name,
        machine_number=machine.machine_number,
        category=machine.category,
        location=machine.location,
        status=machine.status or "disponible"
    )
    db.add(db_mac)
    db.commit()
    db.refresh(db_mac)
    return db_mac

@app.patch("/api/machines/{machine_id}/status", response_model=MachineResponse)
def update_machine_status(machine_id: int, payload: MachineStatusUpdate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    
    machine.status = payload.status
    db.commit()
    db.refresh(machine)
    return machine

# --- REGISTROS DE PRODUCCIÓN ---

@app.get("/api/productions", response_model=List[ProductionResponse])
def get_productions(db: Session = Depends(get_db)):
    return db.query(Production)\
        .options(joinedload(Production.machine), joinedload(Production.operator), joinedload(Production.part))\
        .order_by(Production.id.desc()).all()

@app.post("/api/productions", response_model=ProductionResponse, status_code=status.HTTP_201_CREATED)
def create_production(prod: ProductionCreate, db: Session = Depends(get_db)):
    db_prod = Production(**prod.dict())
    db.add(db_prod)
    db.commit()
    db.refresh(db_prod)
    
    return db.query(Production)\
        .options(joinedload(Production.machine), joinedload(Production.operator), joinedload(Production.part))\
        .filter(Production.id == db_prod.id).first()

# --- GENERACIÓN DE INFORME HTML ---

@app.get("/api/productions/{production_id}/html", response_class=HTMLResponse)
def get_production_html_report(production_id: int, db: Session = Depends(get_db)):
    prod = db.query(Production)\
        .options(joinedload(Production.machine), joinedload(Production.operator), joinedload(Production.part))\
        .filter(Production.id == production_id).first()
    
    if not prod:
        raise HTTPException(status_code=404, detail="Registro de producción no encontrado")

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Informe de Producción #{prod.id}</title>
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; margin: 0; }}
            .report-card {{ max-width: 700px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }}
            .header {{ border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }}
            .title {{ font-size: 22px; font-weight: bold; color: #1e40af; margin: 0; }}
            .badge {{ background: #dbeafe; color: #1e40af; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 20px; }}
            .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }}
            .field-box {{ background: #f1f5f9; padding: 12px; border-radius: 8px; }}
            .label {{ font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px; }}
            .value {{ font-size: 16px; font-weight: 600; color: #0f172a; }}
            .notes-box {{ background: #fffbebf8; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; font-style: italic; color: #92400e; margin-top: 16px; }}
            .footer {{ margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 12px; }}
            @media print {{ body {{ background: white; padding: 0; }} .report-card {{ box-shadow: none; border: none; }} }}
        </style>
    </head>
    <body>
        <div class="report-card">
            <div class="header">
                <div>
                    <h1 class="title">INFORME OFICIAL DE PRODUCCIÓN</h1>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">ID Registro: #{prod.id} • Fecha: {prod.production_date}</div>
                </div>
                <span class="badge">TURNO: {prod.shift_name}</span>
            </div>

            <div class="grid">
                <div class="field-box">
                    <div class="label">ENCARGADO / SUPERVISOR</div>
                    <div class="value">{prod.supervisor}</div>
                </div>
                <div class="field-box">
                    <div class="label">OPERARIO ASIGNADO</div>
                    <div class="value">{prod.operator.name if prod.operator else 'N/A'} ({prod.operator.operator_number if prod.operator else 'S/N'})</div>
                </div>
                <div class="field-box">
                    <div class="label">MÁQUINA UTILIZADA</div>
                    <div class="value">{prod.machine.name if prod.machine else 'N/A'} [{prod.machine.machine_number if prod.machine else 'S/N'}]</div>
                </div>
                <div class="field-box">
                    <div class="label">PIEZA PRODUCIDA</div>
                    <div class="value">{prod.part.name if prod.part else 'N/A'}</div>
                    <div style="font-size: 12px; color: #475569; margin-top: 2px;">Ref: {prod.part.references if prod.part else '-'}</div>
                </div>
            </div>

            <div class="field-box" style="background: #f0fdf4; border: 1px solid #bbf7d0; text-align: center; padding: 16px;">
                <div class="label" style="color: #166534;">CANTIDAD TOTAL PRODUCIDA</div>
                <div class="value" style="font-size: 28px; color: #15803d;">{prod.quantity_produced} unidades</div>
            </div>

            {f'<div class="notes-box"><strong>Observaciones:</strong> "{prod.notes}"</div>' if prod.notes else ''}

            <div class="footer">
                Documento generado automáticamente por el Gestor de Turnos y Producción de Máquinas • {datetime.now().strftime("%Y-%m-%d %H:%M")}
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

# --- SUMMARY / STATS ---

@app.get("/api/summary", response_model=SummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    return SummaryResponse(
        total_machines=db.query(Machine).count(),
        disponibles=db.query(Machine).filter(Machine.status == "disponible").count(),
        en_uso=db.query(Machine).filter(Machine.status == "en_uso").count(),
        mantenimiento=db.query(Machine).filter(Machine.status == "mantenimiento").count(),
        total_operators=db.query(Operator).count(),
        total_parts=db.query(Part).count(),
        total_productions=db.query(Production).count()
    )
