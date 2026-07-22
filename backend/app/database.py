import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "gestor_turnos")
USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() in ("true", "1", "yes")

def get_database_url():
    # Priorizar variable de entorno DATABASE_URL estándar (ej. para Render Postgres)
    env_db_url = os.getenv("DATABASE_URL")
    if env_db_url:
        if env_db_url.startswith("postgres://"):
            return env_db_url.replace("postgres://", "postgresql://", 1)
        return env_db_url

    if USE_SQLITE:
        # Permitir cambiar la ruta del SQLite (ej. /data/gestor_turnos.db para Render Disks persistentes)
        sqlite_path = os.getenv("SQLITE_PATH", "./gestor_turnos.db")
        return f"sqlite:///{sqlite_path}"
    
    if MYSQL_PASSWORD:
        return f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    else:
        return f"mysql+pymysql://{MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"

# Try initializing database engine with MySQL, fallback to SQLite if MySQL fails
try:
    DATABASE_URL = get_database_url()
    if "sqlite" in DATABASE_URL:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        engine = create_engine(DATABASE_URL, pool_recycle=3600)
        # Test connection
        with engine.connect() as conn:
            pass
except Exception as e:
    print(f"Warning: MySQL connection failed ({e}). Falling back to local SQLite database.")
    DATABASE_URL = "sqlite:///./gestor_turnos.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
