import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import time

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
        # Limpiar parámetros de sslmode para compatibilidad con pg8000
        if "sslmode=" in env_db_url:
            from urllib.parse import urlparse, urlunparse
            parsed = urlparse(env_db_url)
            queries = [q for q in parsed.query.split("&") if not q.startswith("sslmode=")]
            new_query = "&".join(queries)
            parsed = parsed._replace(query=new_query)
            env_db_url = urlunparse(parsed)

        if env_db_url.startswith("postgres://"):
            return env_db_url.replace("postgres://", "postgresql+pg8000://", 1)
        elif env_db_url.startswith("postgresql://"):
            return env_db_url.replace("postgresql://", "postgresql+pg8000://", 1)
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
is_explicit_db = bool(os.getenv("DATABASE_URL") or os.getenv("MYSQL_HOST") or os.getenv("MYSQL_PASSWORD"))

try:
    DATABASE_URL = get_database_url()
    if "sqlite" in DATABASE_URL:
        engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    else:
        # Remote database (PostgreSQL / MySQL)
        # Try to connect with retries to avoid race conditions on startup
        retries = 5
        connected = False
        last_exception = None
        
        # Preparar connect_args para SSL si usamos pg8000 en Render o si se solicitó sslmode originalmente
        connect_args = {}
        if "postgresql+pg8000" in DATABASE_URL:
            orig_db_url = os.getenv("DATABASE_URL", "")
            if os.getenv("RENDER") or "sslmode" in orig_db_url.lower():
                import ssl
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                connect_args["ssl_context"] = ssl_context

        for i in range(retries):
            try:
                engine = create_engine(DATABASE_URL, pool_recycle=3600, connect_args=connect_args)
                # Test connection
                with engine.connect() as conn:
                    pass
                connected = True
                print(f"Successfully connected to remote database: {DATABASE_URL.split('@')[-1]}")
                break
            except Exception as e:
                last_exception = e
                print(f"Database connection attempt {i+1}/{retries} failed ({e}). Retrying in 2 seconds...")
                time.sleep(2)
        
        if not connected:
            if is_explicit_db or os.getenv("RENDER"):
                # In production or explicit configuration, crash instead of falling back to silent SQLite
                print(f"Error: Could not connect to explicit database ({last_exception}). Crashing to prevent silent data loss.")
                raise last_exception
            else:
                # Fallback to local SQLite for simple local dev
                print(f"Warning: Remote connection failed ({last_exception}). Falling back to local SQLite database.")
                DATABASE_URL = "sqlite:///./gestor_turnos.db"
                engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
except Exception as e:
    if is_explicit_db or os.getenv("RENDER"):
        raise e
    print(f"Warning: Database connection failed ({e}). Falling back to local SQLite database.")
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
