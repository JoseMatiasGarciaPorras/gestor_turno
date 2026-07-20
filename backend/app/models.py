from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    operator_number = Column(String(50), unique=True, index=True, nullable=False)  # Número de operario único manual
    created_at = Column(DateTime, default=datetime.utcnow)

    productions = relationship("Production", back_populates="operator")
    shifts = relationship("Shift", back_populates="operator")

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    machine_number = Column(String(50), unique=True, index=True, nullable=False)  # Número de máquina
    category = Column(String(50), default="General")
    status = Column(String(30), default="disponible")  # disponible, en_uso, mantenimiento
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    shifts = relationship("Shift", back_populates="machine", cascade="all, delete-orphan")
    productions = relationship("Production", back_populates="machine")

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    references = Column(String(255), unique=True, index=True, nullable=False)  # Referencias alfanuméricas únicas
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    productions = relationship("Production", back_populates="part")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id", ondelete="SET NULL"), nullable=True)
    operator_name = Column(String(100), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String(30), default="activo")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="shifts")
    operator = relationship("Operator", back_populates="shifts")

class Production(Base):
    __tablename__ = "productions"

    id = Column(Integer, primary_key=True, index=True)
    production_date = Column(Date, default=date.today, nullable=False)
    shift_name = Column(String(50), nullable=False)  # ej: Mañana, Tarde, Noche, Turno 1
    supervisor = Column(String(100), nullable=False) # Encargado
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=False)
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=False)
    quantity_produced = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="productions")
    operator = relationship("Operator", back_populates="productions")
    part = relationship("Part", back_populates="productions")
