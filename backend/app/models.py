from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Date, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, date
from app.database import Base

class Operator(Base):
    __tablename__ = "operators"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    operator_number = Column(String(50), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    production_items = relationship("ProductionItem", back_populates="operator")

class Machine(Base):
    __tablename__ = "machines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    machine_number = Column(String(50), unique=True, index=True, nullable=False)
    category = Column(String(50), default="General")
    status = Column(String(30), default="disponible")
    location = Column(String(100), nullable=True)
    is_small = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    production_items = relationship("ProductionItem", back_populates="machine")

class Part(Base):
    __tablename__ = "parts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_montaje = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    references_list = relationship("PartReference", back_populates="part", cascade="all, delete-orphan")
    production_items = relationship("ProductionItem", back_populates="part")

class PartReference(Base):
    __tablename__ = "part_references"

    id = Column(Integer, primary_key=True, index=True)
    part_id = Column(Integer, ForeignKey("parts.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(100), index=True, nullable=False)
    side_type = Column(String(30), default="Única")  # IZQ, DCH, Única, Variante A, Variante B
    created_at = Column(DateTime, default=datetime.utcnow)

    part = relationship("Part", back_populates="references_list")

class ShiftSheet(Base):
    __tablename__ = "shift_sheets"

    id = Column(Integer, primary_key=True, index=True)
    production_date = Column(Date, default=date.today, nullable=False)
    shift_name = Column(String(50), nullable=False)
    supervisor = Column(String(100), nullable=False)
    incidents_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("ProductionItem", back_populates="shift_sheet", cascade="all, delete-orphan")

class ProductionItem(Base):
    __tablename__ = "production_items"

    id = Column(Integer, primary_key=True, index=True)
    shift_sheet_id = Column(Integer, ForeignKey("shift_sheets.id", ondelete="CASCADE"), nullable=False)
    
    machine_id = Column(Integer, ForeignKey("machines.id"), nullable=True)
    machine_name_manual = Column(String(100), nullable=True)
    machine_side = Column(String(10), default="IZQ")
    
    part_id = Column(Integer, ForeignKey("parts.id"), nullable=True)
    part_reference_manual = Column(String(100), nullable=True)
    
    quantity_ok = Column(Integer, default=0, nullable=False)
    quantity_ko = Column(Integer, default=0, nullable=False)
    
    operator_id = Column(Integer, ForeignKey("operators.id"), nullable=True)
    operator_name_manual = Column(String(100), nullable=True)
    operator_number_manual = Column(String(50), nullable=True)
    
    is_montaje = Column(Boolean, default=False, nullable=False)
    is_csl1 = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    shift_sheet = relationship("ShiftSheet", back_populates="items")
    machine = relationship("Machine", back_populates="production_items")
    part = relationship("Part", back_populates="production_items")
    operator = relationship("Operator", back_populates="production_items")

class WeeklySnapshot(Base):
    __tablename__ = "weekly_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    week_start_date = Column(Date, unique=True, index=True, nullable=False)
    week_end_date = Column(Date, nullable=False)
    snapshot_data = Column(Text, nullable=False)  # JSON text
    created_at = Column(DateTime, default=datetime.utcnow)
