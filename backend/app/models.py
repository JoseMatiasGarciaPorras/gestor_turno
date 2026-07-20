from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(50), default="General")
    status = Column(String(30), default="disponible")  # disponible, en_uso, mantenimiento
    location = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shifts = relationship("Shift", back_populates="machine", cascade="all, delete-orphan")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(Integer, ForeignKey("machines.id", ondelete="CASCADE"), nullable=False)
    operator_name = Column(String(100), nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)  # Duración planificada o real
    status = Column(String(30), default="activo")  # activo, completado, cancelado
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="shifts")
