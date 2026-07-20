from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date

from app.database import engine, Base, get_db
from app.models import Machine, Operator, Part, ShiftSheet, ProductionItem
from app.schemas import (
    MachineCreate, MachineResponse, MachineStatusUpdate,
    OperatorCreate, OperatorResponse,
    PartCreate, PartResponse,
    ShiftSheetCreate, ShiftSheetResponse,
    SummaryResponse
)

# Recrear o actualizar tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestor de Turnos y Planta de Producción API",
    description="API RESTful Mobile-First para control de Máquinas, Operarios, Piezas y Partes de Producción Diarios.",
    version="3.0.0"
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
            Operator(name="Natalia", operator_number="247"),
            Operator(name="Diantra", operator_number="214"),
            Operator(name="David", operator_number="280"),
            Operator(name="Arantxa", operator_number="219"),
            Operator(name="Mª José", operator_number="281"),
            Operator(name="Rocío", operator_number="237"),
            Operator(name="Miguel", operator_number="265"),
            Operator(name="Hilda", operator_number="217"),
        ]
        db.add_all(ops)
        db.commit()

    if db.query(Machine).count() == 0:
        macs = [
            Machine(name="FTZ 1400", machine_number="M-1400", category="Inyección", status="disponible"),
            Machine(name="RB1000", machine_number="M-1000", category="Inyección", status="en_uso"),
            Machine(name="NS1500", machine_number="M-1500", category="Inyección", status="en_uso"),
            Machine(name="NS1500-2", machine_number="M-1502", category="Inyección", status="en_uso"),
            Machine(name="ENGEL 75", machine_number="M-E75", category="Inyección", status="disponible"),
            Machine(name="ARBURG 50", machine_number="M-A50", category="Inyección", status="disponible"),
            Machine(name="ARBURG 150", machine_number="M-A150", category="Inyección", status="en_uso"),
            Machine(name="ENGEL 300", machine_number="M-E300", category="Inyección", status="en_uso"),
            Machine(name="ENGEL 550", machine_number="M-E550", category="Inyección", status="en_uso"),
            Machine(name="SUMITOMO", machine_number="M-SUM", category="Inyección", status="en_uso"),
            Machine(name="JSW450", machine_number="M-J450", category="Inyección", status="en_uso"),
            Machine(name="ENGEL 400", machine_number="M-E400", category="Inyección", status="en_uso"),
            Machine(name="JSW220", machine_number="M-J220", category="Inyección", status="en_uso"),
            Machine(name="JSW450-2", machine_number="M-J452", category="Inyección", status="en_uso"),
            Machine(name="JSW350", machine_number="M-J350", category="Inyección", status="en_uso"),
            Machine(name="JSW450-3", machine_number="M-J453", category="Inyección", status="en_uso"),
        ]
        db.add_all(macs)
        db.commit()

    if db.query(Part).count() == 0:
        parts = [
            Part(name="Pieza 90100108", references="90100108"),
            Part(name="Pieza 90100109", references="90100109"),
            Part(name="Pieza L381154", references="L381154"),
            Part(name="Pieza L381153", references="L381153"),
            Part(name="Pieza L700038", references="L700038"),
            Part(name="Pieza L700032", references="L700032"),
            Part(name="Pieza IS6120080-02", references="IS6120080-02"),
            Part(name="Pieza 90094508", references="90094508"),
            Part(name="Pieza 1787017", references="1787017"),
            Part(name="Pieza L802189", references="L802189"),
            Part(name="Pieza L802190", references="L802190"),
            Part(name="Pieza 1603162", references="1603162"),
            Part(name="Pieza 1603163", references="1603163"),
            Part(name="Pieza 9018687S", references="9018687S"),
            Part(name="Pieza L341471", references="L341471"),
            Part(name="Pieza L341472", references="L341472"),
            Part(name="Pieza 90093181", references="90093181"),
            Part(name="Pieza LF40798", references="LF40798"),
            Part(name="Pieza LF40799", references="LF40799"),
            Part(name="Pieza LD97531", references="LD97531"),
            Part(name="Pieza LD97532", references="LD97532"),
            Part(name="Pieza LFS5903", references="LFS5903"),
            Part(name="Pieza LFS5908", references="LFS5908"),
        ]
        db.add_all(parts)
        db.commit()

    if db.query(ShiftSheet).count() == 0:
        # Ejemplo exacto de la hoja física
        sheet = ShiftSheet(
            production_date=date(2026, 7, 20),
            shift_name="Tarde",
            supervisor="Matias",
            incidents_notes="Operación normal en planta."
        )
        db.add(sheet)
        db.commit()
        db.refresh(sheet)

        rb1000 = db.query(Machine).filter(Machine.name == "RB1000").first()
        op_natalia = db.query(Operator).filter(Operator.name == "Natalia").first()
        part_90100108 = db.query(Part).filter(Part.references == "90100108").first()

        item1 = ProductionItem(
            shift_sheet_id=sheet.id,
            machine_id=rb1000.id if rb1000 else None,
            machine_name_manual="RB1000",
            machine_side="IZQ",
            part_id=part_90100108.id if part_90100108 else None,
            part_reference_manual="90100108",
            quantity_ok=106,
            quantity_ko=0,
            operator_id=op_natalia.id if op_natalia else None,
            operator_name_manual="Natalia",
            operator_number_manual="247",
            is_montaje=False
        )
        db.add(item1)
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

@app.put("/api/operators/{operator_id}", response_model=OperatorResponse)
def update_operator(operator_id: int, payload: OperatorCreate, db: Session = Depends(get_db)):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operario no encontrado.")
    op.name = payload.name
    op.operator_number = payload.operator_number
    db.commit()
    db.refresh(op)
    return op

@app.delete("/api/operators/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operator(operator_id: int, db: Session = Depends(get_db)):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operario no encontrado.")
    db.query(ProductionItem).filter(ProductionItem.operator_id == operator_id).update({ProductionItem.operator_id: None})
    db.delete(op)
    db.commit()
    return None

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

@app.put("/api/parts/{part_id}", response_model=PartResponse)
def update_part(part_id: int, payload: PartCreate, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Pieza no encontrada.")
    part.name = payload.name
    part.references = payload.references
    part.description = payload.description
    db.commit()
    db.refresh(part)
    return part

@app.delete("/api/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(part_id: int, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Pieza no encontrada.")
    db.query(ProductionItem).filter(ProductionItem.part_id == part_id).update({ProductionItem.part_id: None})
    db.delete(part)
    db.commit()
    return None

# --- MÁQUINAS ---

@app.get("/api/machines", response_model=List[MachineResponse])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).order_by(Machine.id.asc()).all()

@app.post("/api/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db)):
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

@app.put("/api/machines/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: int, payload: MachineCreate, db: Session = Depends(get_db)):
    mac = db.query(Machine).filter(Machine.id == machine_id).first()
    if not mac:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    mac.name = payload.name
    mac.machine_number = payload.machine_number
    mac.category = payload.category
    mac.location = payload.location
    if payload.status:
        mac.status = payload.status
    db.commit()
    db.refresh(mac)
    return mac

@app.patch("/api/machines/{machine_id}/status", response_model=MachineResponse)
def update_machine_status(machine_id: int, payload: MachineStatusUpdate, db: Session = Depends(get_db)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    machine.status = payload.status
    db.commit()
    db.refresh(machine)
    return machine

@app.delete("/api/machines/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    mac = db.query(Machine).filter(Machine.id == machine_id).first()
    if not mac:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    db.query(ProductionItem).filter(ProductionItem.machine_id == machine_id).update({ProductionItem.machine_id: None})
    db.delete(mac)
    db.commit()
    return None

# --- PARTES DE PRODUCCIÓN DIARIOS (SHIFT SHEETS) ---

@app.get("/api/shift-sheets", response_model=List[ShiftSheetResponse])
def get_shift_sheets(db: Session = Depends(get_db)):
    return db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.machine))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.part))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.operator))\
        .order_by(ShiftSheet.id.desc()).all()

@app.post("/api/shift-sheets", response_model=ShiftSheetResponse, status_code=status.HTTP_201_CREATED)
def create_shift_sheet(payload: ShiftSheetCreate, db: Session = Depends(get_db)):
    sheet = ShiftSheet(
        production_date=payload.production_date,
        shift_name=payload.shift_name,
        supervisor=payload.supervisor,
        incidents_notes=payload.incidents_notes
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)

    for item in payload.items:
        db_item = ProductionItem(
            shift_sheet_id=sheet.id,
            machine_id=item.machine_id,
            machine_name_manual=item.machine_name_manual,
            machine_side=item.machine_side,
            part_id=item.part_id,
            part_reference_manual=item.part_reference_manual,
            quantity_ok=item.quantity_ok,
            quantity_ko=item.quantity_ko,
            operator_id=item.operator_id,
            operator_name_manual=item.operator_name_manual,
            operator_number_manual=item.operator_number_manual,
            is_montaje=item.is_montaje
        )
        db.add(db_item)

    db.commit()
    
    return db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items))\
        .filter(ShiftSheet.id == sheet.id).first()

# --- REPLICADOR DE HOJA FÍSICA EN HTML ---

@app.get("/api/shift-sheets/{sheet_id}/html", response_class=HTMLResponse)
def get_shift_sheet_html(sheet_id: int, db: Session = Depends(get_db)):
    sheet = db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.machine))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.part))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.operator))\
        .filter(ShiftSheet.id == sheet_id).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Parte de producción no encontrado")

    planta_items = [i for i in sheet.items if not i.is_montaje]
    montaje_items = [i for i in sheet.items if i.is_montaje]

    def render_row(item):
        mac_name = item.machine.name if item.machine else (item.machine_name_manual or '-')
        part_ref = item.part.references if item.part else (item.part_reference_manual or '-')
        op_num = item.operator.operator_number if item.operator else (item.operator_number_manual or '-')
        op_name = item.operator.name if item.operator else (item.operator_name_manual or '-')
        
        return f"""
        <tr>
            <td style="font-weight: bold;">{mac_name}</td>
            <td style="text-align: center;">{item.machine_side or 'IZQ'}</td>
            <td style="font-family: monospace; font-weight: bold;">{part_ref}</td>
            <td style="text-align: center; font-weight: bold; color: #15803d;">{item.quantity_ok}</td>
            <td style="text-align: center; color: #b91c1c;">{item.quantity_ko if item.quantity_ko > 0 else ''}</td>
            <td style="text-align: center; font-weight: bold;">{op_num}</td>
            <td>{op_name}</td>
        </tr>
        """

    planta_rows_html = "".join([render_row(i) for i in planta_items])
    montaje_rows_html = "".join([render_row(i) for i in montaje_items])

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>PARTE DE PRODUCCIÓN DIARIO - {sheet.production_date}</title>
        <style>
            body {{ font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; padding: 20px; margin: 0; }}
            .paper {{ max-width: 850px; margin: 0 auto; background: white; border: 2px solid #0f172a; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }}
            .header-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 15px; font-size: 14px; font-weight: bold; }}
            table {{ width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }}
            th, td {{ border: 1px solid #334155; padding: 5px 8px; text-align: left; }}
            th {{ background: #e2e8f0; font-size: 11px; text-transform: uppercase; }}
            .section-title {{ background: #1e293b; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 10px; margin-bottom: 5px; }}
            .notes {{ border: 1px solid #334155; padding: 8px; font-size: 12px; background: #fffbebf8; margin-top: 10px; }}
            @media print {{ body {{ background: white; padding: 0; }} .paper {{ box-shadow: none; border: 1px solid black; }} }}
        </style>
    </head>
    <body>
        <div class="paper">
            <div class="header-grid">
                <div>DIA / FECHA: <span style="font-weight: normal;">{sheet.production_date}</span></div>
                <div>TURNO: <span style="font-weight: normal;">{sheet.shift_name}</span></div>
                <div>ENCARGADO: <span style="font-weight: normal;">{sheet.supervisor}</span></div>
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
                    {planta_rows_html if planta_rows_html else '<tr><td colspan="7" style="text-align:center;">Sin filas de máquinas en planta</td></tr>'}
                </tbody>
            </table>

            {f'''
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
                    {montaje_rows_html if montaje_rows_html else '<tr><td colspan="7" style="text-align:center;">Sin filas de montaje</td></tr>'}
                </tbody>
            </table>
            ''' if montaje_rows_html else ''}

            <div class="notes">
                <strong>FALTA PERSONAL O NOTAS / INCIDENCIAS:</strong><br/>
                {sheet.incidents_notes if sheet.incidents_notes else 'Ninguna.'}
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

# --- SUMMARY ---

@app.get("/api/summary", response_model=SummaryResponse)
def get_summary(db: Session = Depends(get_db)):
    return SummaryResponse(
        total_machines=db.query(Machine).count(),
        disponibles=db.query(Machine).filter(Machine.status == "disponible").count(),
        en_uso=db.query(Machine).filter(Machine.status == "en_uso").count(),
        mantenimiento=db.query(Machine).filter(Machine.status == "mantenimiento").count(),
        total_operators=db.query(Operator).count(),
        total_parts=db.query(Part).count(),
        total_sheets=db.query(ShiftSheet).count()
    )
