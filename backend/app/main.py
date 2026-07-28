from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, date

from app.database import engine, Base, get_db
from app.models import Machine, Operator, Part, PartReference, ShiftSheet, ProductionItem, WeeklySnapshot, User, UserOperatorActive
from app.schemas import (
    MachineCreate, MachineResponse, MachineStatusUpdate,
    OperatorCreate, OperatorResponse,
    PartCreate, PartResponse,
    ShiftSheetCreate, ShiftSheetResponse,
    SummaryResponse, WeeklySnapshotResponse,
    UserCreate, UserResponse, Token
)
from app.auth import get_current_user, hash_password, verify_password, create_access_token

# Recrear o actualizar tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gestor de Turnos y Planta de Producción API",
    description="API RESTful Mobile-First para control de Máquinas, Operarios, Piezas y Partes de Producción Diarios.",
    version="1.0.0-beta.4"
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
        p1 = Part(name="Conjunto Espejo Retrovisor NS1500", description="Par de espejos laterales")
        db.add(p1)
        db.commit()
        db.refresh(p1)

        r1 = PartReference(part_id=p1.id, code="L381154", side_type="IZQ")
        r2 = PartReference(part_id=p1.id, code="L381153", side_type="DCH")

        p2 = Part(name="Moldura Frontal ENGEL 550", description="Moldura exterior limpia")
        db.add(p2)
        db.commit()
        db.refresh(p2)

        r3 = PartReference(part_id=p2.id, code="L802189", side_type="IZQ")
        r4 = PartReference(part_id=p2.id, code="L802190", side_type="DCH")

        p3 = Part(name="Placa Base 90100108", description="Referencia única")
        db.add(p3)
        db.commit()
        db.refresh(p3)

        r5 = PartReference(part_id=p3.id, code="90100108", side_type="Única")

        db.add_all([r1, r2, r3, r4, r5])
        db.commit()

def compile_weekly_history(start_date: date, db: Session, user_id: Optional[int] = None):
    from datetime import timedelta
    from sqlalchemy.orm import joinedload
    
    end_date = start_date + timedelta(days=6)
    operators = db.query(Operator).order_by(Operator.name.asc()).all()
    
    query = db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.machine))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.operator))\
        .filter(ShiftSheet.production_date >= start_date)\
        .filter(ShiftSheet.production_date <= end_date)
        
    if user_id is not None:
        query = query.filter(ShiftSheet.user_id == user_id)
        
    sheets = query.all()
    
    days_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
    
    # Si estamos compilando para un usuario específico, traemos su mapeo de operarios activos,
    # si no (combinado), usamos el estado general del operario
    user_active_map = {}
    if user_id is not None:
        user_actives = db.query(UserOperatorActive).filter(UserOperatorActive.user_id == user_id).all()
        user_active_map = {ua.operator_id: ua.is_active for ua in user_actives}
    
    history_map = []
    for op in operators:
        op_days = {day: [] for day in days_names}
        
        for sheet in sheets:
            day_idx = sheet.production_date.weekday()
            day_name = days_names[day_idx]
            
            for item in sheet.items:
                is_match = False
                if item.operator_id == op.id:
                    is_match = True
                elif item.operator_name_manual == op.name or item.operator_number_manual == op.operator_number:
                    is_match = True
                    
                if is_match:
                    if item.is_montaje:
                        label = "Montaje"
                    elif item.machine:
                        if item.machine.is_small:
                            label = "Grupo M. Pequeñas"
                        else:
                            label = item.machine.name
                    elif item.machine_name_manual:
                        db_mac = db.query(Machine).filter(Machine.name == item.machine_name_manual).first()
                        if db_mac and db_mac.is_small:
                            label = "Grupo M. Pequeñas"
                        elif item.machine_name_manual.upper() == "MONTAJE":
                            label = "Montaje"
                        else:
                            label = item.machine_name_manual
                    else:
                        label = "-"
                        
                    if label not in op_days[day_name] and label != "-":
                        op_days[day_name].append(label)
        
        formatted_days = {day: (", ".join(op_days[day]) if op_days[day] else "-") for day in days_names}
        is_active_for_user = user_active_map.get(op.id, op.is_active)
        
        history_map.append({
            "operator_id": op.id,
            "operator_name": op.name,
            "operator_number": op.operator_number,
            "is_active": is_active_for_user,
            "days": formatted_days
        })
        
    return {
        "week_start_date": start_date.isoformat(),
        "week_end_date": end_date.isoformat(),
        "history": history_map
    }

def generate_past_week_snapshots(db: Session, user_id: int):
    try:
        from datetime import date, timedelta
        import json
        
        today = date.today()
        current_monday = today - timedelta(days=today.weekday())
        
        for i in range(1, 5):
            past_monday = current_monday - timedelta(days=7 * i)
            past_sunday = past_monday + timedelta(days=6)
            
            existing = db.query(WeeklySnapshot).filter(
                WeeklySnapshot.week_start_date == past_monday,
                WeeklySnapshot.user_id == user_id
            ).first()
            if not existing:
                has_sheets = db.query(ShiftSheet).filter(
                    ShiftSheet.production_date >= past_monday,
                    ShiftSheet.production_date <= past_sunday,
                    ShiftSheet.user_id == user_id
                ).first() is not None
                
                if has_sheets:
                    compiled = compile_weekly_history(past_monday, db, user_id=user_id)
                    snapshot = WeeklySnapshot(
                        user_id=user_id,
                        week_start_date=past_monday,
                        week_end_date=past_sunday,
                        snapshot_data=json.dumps(compiled)
                    )
                    db.add(snapshot)
                    db.commit()
                    print(f"Generada instantánea semanal para usuario {user_id} de: {past_monday} al {past_sunday}")
    except Exception as e:
        print(f"Error generando instantáneas semanales para usuario {user_id}: {e}")

@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        # Migración rápida para SQLite en local/Render
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE parts ADD COLUMN is_montaje BOOLEAN DEFAULT FALSE"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE production_items ADD COLUMN is_csl1 BOOLEAN DEFAULT FALSE"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE machines ADD COLUMN is_small BOOLEAN DEFAULT FALSE"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE machines ADD COLUMN assigned_part_id INTEGER REFERENCES parts(id) ON DELETE SET NULL"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE operators ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'encargado'"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE shift_sheets ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            db.commit()
        except Exception:
            db.rollback()
        try:
            db.execute(text("ALTER TABLE weekly_snapshots ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL"))
            db.commit()
        except Exception:
            db.rollback()
            
        # Generar instantáneas de semanas anteriores concluidas para todos los encargados
        users = db.query(User).filter(User.role == "encargado").all()
        for u in users:
            generate_past_week_snapshots(db, user_id=u.id)
            
        seed_initial_data(db)
    finally:
        db.close()

# --- AUTENTICACIÓN ---

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un encargado registrado con ese nombre de usuario."
        )
    
    role = "encargado"
    if user.role == "supervisor":
        if user.supervisor_key != "super123":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clave de supervisor incorrecta."
            )
        role = "supervisor"

    hashed_pwd = hash_password(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_pwd,
        full_name=user.full_name or user.email,
        role=role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=Token)
def login_user(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos."
        )
    
    access_token = create_access_token(subject=user.email)
    return Token(access_token=access_token, token_type="bearer")

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "supervisor":
        raise HTTPException(status_code=403, detail="Acceso denegado: Se requieren permisos de supervisor.")
    return db.query(User).filter(User.role == "encargado").order_by(User.full_name.asc()).all()

# --- OPERARIOS ---

@app.get("/api/operators", response_model=List[OperatorResponse])
def get_operators(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    operators = db.query(Operator).order_by(Operator.name.asc()).all()
    
    user_actives = db.query(UserOperatorActive).filter(UserOperatorActive.user_id == current_user.id).all()
    user_active_map = {ua.operator_id: ua.is_active for ua in user_actives}
    
    if not user_actives:
        initialized_records = []
        for op in operators:
            ua = UserOperatorActive(user_id=current_user.id, operator_id=op.id, is_active=op.is_active)
            db.add(ua)
            initialized_records.append(ua)
        db.commit()
        user_active_map = {ua.operator_id: ua.is_active for ua in initialized_records}
        
    response_data = []
    for op in operators:
        is_active_for_user = user_active_map.get(op.id, op.is_active)
        response_data.append({
            "id": op.id,
            "name": op.name,
            "operator_number": op.operator_number,
            "is_active": is_active_for_user,
            "created_at": op.created_at
        })
    return response_data

@app.post("/api/operators", response_model=OperatorResponse, status_code=status.HTTP_201_CREATED)
def create_operator(operator: OperatorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Operator).filter(Operator.operator_number == operator.operator_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe un operario con el número '{operator.operator_number}'.")
    
    db_op = Operator(name=operator.name, operator_number=operator.operator_number, is_active=operator.is_active)
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    
    ua = UserOperatorActive(user_id=current_user.id, operator_id=db_op.id, is_active=operator.is_active)
    db.add(ua)
    db.commit()
    
    return {
        "id": db_op.id,
        "name": db_op.name,
        "operator_number": db_op.operator_number,
        "is_active": operator.is_active,
        "created_at": db_op.created_at
    }

@app.put("/api/operators/{operator_id}", response_model=OperatorResponse)
def update_operator(operator_id: int, payload: OperatorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operario no encontrado.")
    op.name = payload.name
    op.operator_number = payload.operator_number
    
    ua = db.query(UserOperatorActive).filter(
        UserOperatorActive.user_id == current_user.id,
        UserOperatorActive.operator_id == operator_id
    ).first()
    if not ua:
        ua = UserOperatorActive(user_id=current_user.id, operator_id=operator_id, is_active=payload.is_active)
        db.add(ua)
    else:
        ua.is_active = payload.is_active
    db.commit()
    
    return {
        "id": op.id,
        "name": op.name,
        "operator_number": op.operator_number,
        "is_active": payload.is_active,
        "created_at": op.created_at
    }

@app.delete("/api/operators/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operator(operator_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    op = db.query(Operator).filter(Operator.id == operator_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operario no encontrado.")
    db.query(ProductionItem).filter(ProductionItem.operator_id == operator_id).update({ProductionItem.operator_id: None})
    db.query(UserOperatorActive).filter(UserOperatorActive.operator_id == operator_id).delete()
    db.delete(op)
    db.commit()
    return None

# --- PIEZAS Y REFERENCIAS ---

@app.get("/api/parts", response_model=List[PartResponse])
def get_parts(db: Session = Depends(get_db)):
    return db.query(Part).options(joinedload(Part.references_list)).order_by(Part.name.asc()).all()

@app.post("/api/parts", response_model=PartResponse, status_code=status.HTTP_201_CREATED)
def create_part(part: PartCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_part = Part(name=part.name, description=part.description, is_montaje=part.is_montaje)
    db.add(db_part)
    db.commit()
    db.refresh(db_part)

    for ref in part.references:
        db_ref = PartReference(
            part_id=db_part.id,
            code=ref.code.strip().upper(),
            side_type=ref.side_type or "Única"
        )
        db.add(db_ref)

    db.commit()
    return db.query(Part).options(joinedload(Part.references_list)).filter(Part.id == db_part.id).first()

@app.put("/api/parts/{part_id}", response_model=PartResponse)
def update_part(part_id: int, payload: PartCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Pieza no encontrada.")
    
    part.name = payload.name
    part.description = payload.description
    part.is_montaje = payload.is_montaje

    # Reemplazar lista de referencias
    db.query(PartReference).filter(PartReference.part_id == part_id).delete()
    for ref in payload.references:
        db_ref = PartReference(
            part_id=part.id,
            code=ref.code.strip().upper(),
            side_type=ref.side_type or "Única"
        )
        db.add(db_ref)

    db.commit()
    return db.query(Part).options(joinedload(Part.references_list)).filter(Part.id == part_id).first()

@app.delete("/api/parts/{part_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_part(part_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
    return db.query(Machine).options(joinedload(Machine.assigned_part)).order_by(Machine.id.asc()).all()

@app.post("/api/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(machine: MachineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_mac = Machine(
        name=machine.name,
        machine_number=machine.machine_number,
        category=machine.category,
        location=machine.location,
        status=machine.status or "disponible",
        is_small=machine.is_small or False,
        assigned_part_id=machine.assigned_part_id
    )
    db.add(db_mac)
    db.commit()
    return db.query(Machine).options(joinedload(Machine.assigned_part)).filter(Machine.id == db_mac.id).first()

@app.put("/api/machines/{machine_id}", response_model=MachineResponse)
def update_machine(machine_id: int, payload: MachineCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mac = db.query(Machine).filter(Machine.id == machine_id).first()
    if not mac:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    mac.name = payload.name
    mac.machine_number = payload.machine_number
    mac.category = payload.category
    mac.location = payload.location
    if payload.status:
        mac.status = payload.status
    mac.is_small = payload.is_small if payload.is_small is not None else False
    mac.assigned_part_id = payload.assigned_part_id
    db.commit()
    return db.query(Machine).options(joinedload(Machine.assigned_part)).filter(Machine.id == machine_id).first()

@app.patch("/api/machines/{machine_id}/status", response_model=MachineResponse)
def update_machine_status(machine_id: int, payload: MachineStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    machine.status = payload.status
    db.commit()
    return db.query(Machine).options(joinedload(Machine.assigned_part)).filter(Machine.id == machine_id).first()

@app.delete("/api/machines/{machine_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_machine(machine_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    mac = db.query(Machine).filter(Machine.id == machine_id).first()
    if not mac:
        raise HTTPException(status_code=404, detail="Máquina no encontrada.")
    db.query(ProductionItem).filter(ProductionItem.machine_id == machine_id).update({ProductionItem.machine_id: None})
    db.delete(mac)
    db.commit()
    return None

# --- PARTES DE PRODUCCIÓN DIARIOS (SHIFT SHEETS) ---

@app.get("/api/shift-sheets", response_model=List[ShiftSheetResponse])
def get_shift_sheets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.machine))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.part))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.operator))\
        .options(joinedload(ShiftSheet.user))
        
    if current_user.role != "supervisor":
        query = query.filter(ShiftSheet.user_id == current_user.id)
        
    return query.order_by(ShiftSheet.id.desc()).all()

@app.post("/api/shift-sheets", response_model=ShiftSheetResponse, status_code=status.HTTP_201_CREATED)
def create_shift_sheet(payload: ShiftSheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = ShiftSheet(
        user_id=current_user.id,
        production_date=payload.production_date,
        shift_name=payload.shift_name,
        supervisor=payload.supervisor,
        incidents_notes=payload.incidents_notes
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)

    active_machine_ids = set()
    machine_part_mapping = {}

    for item in payload.items:
        # Resoluciones automáticas si faltan IDs
        machine_id = item.machine_id
        if not machine_id and item.machine_name_manual:
            db_mac = db.query(Machine).filter(Machine.name == item.machine_name_manual).first()
            if db_mac:
                machine_id = db_mac.id
                
        operator_id = item.operator_id
        if not operator_id:
            db_op = None
            if item.operator_number_manual:
                db_op = db.query(Operator).filter(Operator.operator_number == item.operator_number_manual).first()
            if not db_op and item.operator_name_manual:
                db_op = db.query(Operator).filter(Operator.name == item.operator_name_manual).first()
            if db_op:
                operator_id = db_op.id

        part_id = item.part_id
        if not part_id and item.part_reference_manual:
            # Buscar pieza por nombre exacto o buscando en sus referencias
            db_part = db.query(Part).filter(Part.name == item.part_reference_manual).first()
            if not db_part:
                ref = db.query(PartReference).filter(PartReference.code == item.part_reference_manual).first()
                if ref:
                    db_part = ref.part
            if db_part:
                part_id = db_part.id

        db_item = ProductionItem(
            shift_sheet_id=sheet.id,
            machine_id=machine_id,
            machine_name_manual=item.machine_name_manual,
            machine_side=item.machine_side,
            part_id=part_id,
            part_reference_manual=item.part_reference_manual,
            quantity_ok=item.quantity_ok,
            quantity_ko=item.quantity_ko,
            operator_id=operator_id,
            operator_name_manual=item.operator_name_manual,
            operator_number_manual=item.operator_number_manual,
            is_montaje=item.is_montaje,
            is_csl1=item.is_csl1
        )
        db.add(db_item)

        if machine_id and not item.is_montaje and item.machine_name_manual != 'REVISION':
            active_machine_ids.add(machine_id)
            if part_id:
                machine_part_mapping[machine_id] = part_id

    # Actualizar estado de máquinas activas a "en_uso" y guardar su pieza
    for m_id in active_machine_ids:
        mac = db.query(Machine).filter(Machine.id == m_id).first()
        if mac:
            mac.status = "en_uso"
            if m_id in machine_part_mapping:
                mac.assigned_part_id = machine_part_mapping[m_id]

    # Para cualquier otra máquina que esté "en_uso" y no se haya reportado en esta hoja, marcarla como "disponible"
    other_active_macs = db.query(Machine).filter(Machine.status == "en_uso", ~Machine.id.in_(list(active_machine_ids))).all()
    for mac in other_active_macs:
        mac.status = "disponible"
        mac.assigned_part_id = None

    db.commit()
    
    return db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items))\
        .filter(ShiftSheet.id == sheet.id).first()

@app.delete("/api/shift-sheets/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift_sheet(sheet_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(ShiftSheet).filter(ShiftSheet.id == sheet_id).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Parte de producción no encontrado.")
    
    if current_user.role != "supervisor" and sheet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar este parte.")
        
    db.delete(sheet)
    db.commit()
    return None

# --- REPLICADOR DE HOJA FÍSICA EN HTML ---

@app.get("/api/shift-sheets/{sheet_id}/html", response_class=HTMLResponse)
def get_shift_sheet_html(sheet_id: int, token: Optional[str] = None, db: Session = Depends(get_db)):
    user = None
    if token:
        from app.auth import decode_access_token
        email = decode_access_token(token)
        if email:
            user = db.query(User).filter(User.email == email).first()
            
    if not user:
        raise HTTPException(status_code=401, detail="Se requiere token para ver este informe.")
        
    sheet = db.query(ShiftSheet)\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.machine))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.part))\
        .options(joinedload(ShiftSheet.items).joinedload(ProductionItem.operator))\
        .filter(ShiftSheet.id == sheet_id).first()
    
    if not sheet:
        raise HTTPException(status_code=404, detail="Parte de producción no encontrado")
        
    if user.role != "supervisor" and sheet.user_id != user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a este informe de turno.")

    planta_items = [i for i in sheet.items if not i.is_montaje and i.machine_name_manual != 'REVISION']
    montaje_items = [i for i in sheet.items if i.is_montaje]
    revision_items = [i for i in sheet.items if i.machine_name_manual == 'REVISION']

    def render_row(item):
        mac_name = item.machine.name if item.machine else (item.machine_name_manual or '-')
        part_ref = item.part.name if item.part else (item.part_reference_manual or '-')
        if item.is_csl1:
            part_ref += " <span style='background:#f43f5e;color:#fff;padding:1px 4px;border-radius:3px;font-size:10px;font-weight:bold;margin-left:4px;'>CSL1</span>"
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
    revision_rows_html = "".join([render_row(i) for i in revision_items])

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

            {f'''
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
                    {revision_rows_html if revision_rows_html else '<tr><td colspan="7" style="text-align:center;">Sin filas de revisión</td></tr>'}
                </tbody>
            </table>
            ''' if revision_rows_html else ''}

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

# --- HISTORIAL SEMANAL Y CUADRANTES ---

@app.get("/api/weekly-history/current")
def get_current_weekly_history(
    user_id: Optional[int] = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "supervisor":
        user_id = current_user.id
        
    from datetime import date, timedelta
    today = date.today()
    current_monday = today - timedelta(days=today.weekday())
    return compile_weekly_history(current_monday, db, user_id=user_id)

@app.post("/api/weekly-snapshots/trigger")
def trigger_weekly_snapshots(
    user_id: Optional[int] = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "supervisor":
        user_id = current_user.id
        
    if current_user.role == "supervisor" and user_id is None:
        users = db.query(User).filter(User.role == "encargado").all()
        for u in users:
            generate_past_week_snapshots(db, user_id=u.id)
    else:
        if user_id is not None:
            generate_past_week_snapshots(db, user_id=user_id)
            
    return {"status": "success", "message": "Comprobación de instantáneas completada."}

@app.get("/api/weekly-snapshots", response_model=List[WeeklySnapshotResponse])
def get_weekly_snapshots(
    user_id: Optional[int] = None, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "supervisor":
        user_id = current_user.id
        
    query = db.query(WeeklySnapshot).options(joinedload(WeeklySnapshot.user))
    if user_id is not None:
        query = query.filter(WeeklySnapshot.user_id == user_id)
        
    return query.order_by(WeeklySnapshot.week_start_date.desc()).all()

@app.get("/api/weekly-snapshots/{snapshot_id}", response_model=WeeklySnapshotResponse)
def get_weekly_snapshot(snapshot_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    snapshot = db.query(WeeklySnapshot).options(joinedload(WeeklySnapshot.user)).filter(WeeklySnapshot.id == snapshot_id).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Instantánea semanal no encontrada.")
        
    if current_user.role != "supervisor" and snapshot.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta instantánea semanal.")
        
    return snapshot
