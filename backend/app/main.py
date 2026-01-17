from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging
import sys
import json
import time
import platform
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from sqlmodel import SQLModel
from app.core.db import engine
from app.auth.routes import router as auth_router
from app.wishlists.routes import router as wishlists_router
from app.items.routes_new import router as items_router
from app.reservations.routes import router as reservations_router
from app.public.routes import router as public_router
from app.admin.routes import router as admin_router
from app.groups.routes import router as groups_router
from app.shares.routes import router as shares_router
from app.scrape.routes import router as scrape_router
from app.activities.routes import router as activities_router
from app.notifications.routes import router as notifications_router
from fastapi.staticfiles import StaticFiles
from app.core.limits import limiter
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from slowapi.middleware import SlowAPIMiddleware
from prometheus_client import CollectorRegistry, Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import multiprocess as prom_multiprocess

load_dotenv()

# Timestamp de démarrage pour calculer l'uptime
START_TIME = time.time()

# Prometheus metrics registry
REGISTRY = CollectorRegistry()
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'path', 'status'], registry=REGISTRY)
REQUEST_LATENCY = Histogram('http_request_latency_seconds', 'HTTP request latency seconds', ['method', 'path'], registry=REGISTRY)

class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "time": self.formatTime(record, self.datefmt),
        }
        if hasattr(record, "user_id"):
            log_record["user_id"] = record.user_id
        if hasattr(record, "extra"):
            log_record.update(record.extra)
        return json.dumps(log_record)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers = [handler]

app = FastAPI(title="Wisherr API", version="0.1.0")

# Gestion centralisée des erreurs
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # 418 I'm a teapot - parce que c'est drôle :)
    status_code = 418 if exc.status_code == 404 else exc.status_code
    return JSONResponse(
        status_code=status_code,
        content={
            "error": exc.detail,
            "status_code": status_code,
            "original_status": exc.status_code,
            "path": str(request.url),
            "teapot": exc.status_code == 404
        },
    )

def sanitize_for_json(obj):
    """Convertit récursivement les bytes en str pour JSON serialization"""
    if isinstance(obj, bytes):
        try:
            return obj.decode('utf-8')
        except:
            return str(obj)
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(item) for item in obj]
    return obj

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Nettoyer tous les bytes potentiels dans les erreurs
    errors = sanitize_for_json(exc.errors())
    body_content = sanitize_for_json(exc.body)
    return JSONResponse(
        status_code=422,
        content={
            "error": "Erreur de validation",
            "details": errors,
            "body": body_content,
            "path": str(request.url)
        },
    )

# Configuration du rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Serve uploaded static files
if not os.path.exists("./static/uploads"):
    os.makedirs("./static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Endpoint de santé avancé
import asyncpg
import socket

@app.get("/api/health")
async def health():
    # Vérification DB
    db_ok = False
    db_error = None
    db_latency = None
    try:
        raw_dsn = os.getenv("DATABASE_URL", "postgresql://wisherr:wisherr@db:5432/wisherr")
        # Normalize DSN: remove driver suffixes (+asyncpg, +psycopg2, ...)
        for suffix in ("+asyncpg", "+psycopg2", "+psycopg"):
            if suffix in raw_dsn:
                raw_dsn = raw_dsn.replace(suffix, "")
        t0 = time.perf_counter()
        conn = await asyncpg.connect(raw_dsn)
        await conn.execute("SELECT 1")
        await conn.close()
        db_latency = max(0, time.perf_counter() - t0)
        db_ok = True
    except Exception as e:
        db_error = str(e)

    # Vérification cache (exemple Redis) avec latence
    cache_ok = None
    cache_error = None
    cache_latency = None
    redis_host = os.getenv("REDIS_HOST")
    if redis_host:
        try:
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            t0 = time.perf_counter()
            sock = socket.create_connection((redis_host, redis_port), timeout=1)
            cache_latency = max(0, time.perf_counter() - t0)
            sock.close()
            cache_ok = True
        except Exception as e:
            cache_ok = False
            cache_error = str(e)

    # Vérification des endpoints externes et latences (exemples)
    external_checks = []
    external_hosts = os.getenv("HEALTH_EXTERNAL_HOSTS", "doc.my-documents.be:80").split(",")
    for hostpair in external_hosts:
        hostpair = hostpair.strip()
        if not hostpair:
            continue
        ext_host, _, ext_port = hostpair.partition(":")
        try:
            port = int(ext_port) if ext_port else 80
            t0 = time.perf_counter()
            sock = socket.create_connection((ext_host, port), timeout=2)
            latency = max(0, time.perf_counter() - t0)
            sock.close()
            external_checks.append({"host": ext_host, "port": port, "ok": True, "latency": latency})
        except Exception as e:
            external_checks.append({"host": ext_host, "port": ext_port or 80, "ok": False, "error": str(e)})

    # Infos complémentaires
    uptime = int(time.time() - START_TIME)
    routes_count = len(app.routes) if hasattr(app, 'routes') else None
    python_version = platform.python_version()

    overall_ok = db_ok and (cache_ok is None or cache_ok) and all((c.get("ok", True) for c in external_checks))

    return {
        "status": "ok" if overall_ok else "error",
        "uptime_seconds": uptime,
        "routes_count": routes_count,
        "python_version": python_version,
        "db": {"ok": db_ok, "error": db_error, "latency_seconds": db_latency},
        "cache": {"ok": cache_ok, "error": cache_error, "latency_seconds": cache_latency},
        "external": external_checks,
    }

@app.post("/__client_error__")
async def client_error(payload: dict):
    # Log client-side runtime errors for easier debugging
    import logging
    logging.error("CLIENT ERROR: %s", payload)
    return {"ok": True}


# Middleware pour compter les requêtes et mesurer latence
@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    method = request.method
    path = request.url.path
    with REQUEST_LATENCY.labels(method=method, path=path).time():
        try:
            response = await call_next(request)
            status = str(response.status_code)
        except Exception as e:
            # Count as 500
            REQUEST_COUNT.labels(method=method, path=path, status='500').inc()
            raise
    REQUEST_COUNT.labels(method=method, path=path, status=status).inc()
    return response


@app.get('/metrics')
def metrics():
    # Export metrics in Prometheus format
    data = generate_latest(REGISTRY)
    return JSONResponse(content=data.decode('utf-8'), media_type=CONTENT_TYPE_LATEST)
# CORS (configuré depuis .env)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:8080").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in ALLOWED_ORIGINS],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    # Initialiser Redis si configuré
    try:
        from app.core.cache import init_redis
        await init_redis()
    except Exception as e:
        import logging
        logging.warning("Redis initialization skipped: %s", e)
    
    import logging as startup_logging
    
    # Vérifier si les tables existent déjà
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables_exist = "users" in inspector.get_table_names()
    
    if not tables_exist:
        # Essayer d'exécuter schema.sql s'il existe (prioritaire)
        schema_path = "./schema.sql"
        if os.path.exists(schema_path):
            startup_logging.info("Exécution du schema.sql pour initialiser la base de données...")
            try:
                with open(schema_path, 'r') as f:
                    schema_sql = f.read()
                from sqlalchemy import text
                from sqlalchemy.orm import Session as SASession
                with engine.connect() as conn:
                    # Utiliser raw_connection pour exécuter le script complet avec psycopg2
                    raw_conn = conn.connection.dbapi_connection
                    cursor = raw_conn.cursor()
                    cursor.execute(schema_sql)
                    raw_conn.commit()
                    cursor.close()
                startup_logging.info("Schema SQL exécuté avec succès!")
            except Exception as e:
                startup_logging.warning("Erreur schema.sql, fallback sur SQLModel: %s", e)
                # Fallback sur SQLModel
                try:
                    SQLModel.metadata.create_all(engine, checkfirst=True)
                    startup_logging.info("Tables créées avec succès par SQLModel")
                except Exception as e2:
                    startup_logging.exception("Erreur création tables: %s", e2)
        else:
            # Pas de schema.sql, utiliser SQLModel
            startup_logging.info("Pas de schema.sql trouvé, utilisation de SQLModel...")
            try:
                SQLModel.metadata.create_all(engine, checkfirst=True)
                startup_logging.info("Tables créées avec succès par SQLModel")
            except Exception as e:
                startup_logging.exception("Erreur création tables: %s", e)
    else:
        startup_logging.info("Tables déjà créées, initialisation ignorée")

    # Ensure uploads directory exists
    try:
        os.makedirs("./static/uploads", exist_ok=True)
    except Exception:
        pass

    # Create an initial admin user from environment variables if provided
    try:
        from sqlmodel import Session, select
        from .models import User
        from .auth.routes import get_password_hash
        import logging

        ENABLE_LOCAL_AUTH = os.getenv("ENABLE_LOCAL_AUTH", "true").lower() in ("1", "true", "yes")
        admin_username = os.getenv("ADMIN_USERNAME")
        admin_email = os.getenv("ADMIN_EMAIL")
        admin_password = os.getenv("ADMIN_PASSWORD")

        if ENABLE_LOCAL_AUTH and admin_username and admin_password:
            with Session(engine) as session:
                existing = session.exec(select(User).where((User.username == admin_username) | (User.email == admin_email))).first()
                if not existing:
                    logging.info("Creating initial admin user '%s'", admin_username)
                    hashed = get_password_hash(admin_password)
                    admin = User(username=admin_username, email=admin_email or "", password_hash=hashed, is_admin=True)
                    session.add(admin)
                    session.commit()
                else:
                    logging.info("Admin user '%s' already exists", admin_username)
    except Exception as e:
        # Don't crash startup if user creation fails; just log
        import logging
        logging.exception("Failed to ensure admin user: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    """Fermer les connexions au shutdown"""
    try:
        from app.core.cache import close_redis
        await close_redis()
    except Exception as e:
        import logging
        logging.warning("Redis cleanup skipped: %s", e)


app.include_router(auth_router, prefix="/api")
app.include_router(wishlists_router, prefix="/api")
app.include_router(items_router, prefix="/api")
app.include_router(reservations_router, prefix="/api")
app.include_router(public_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(groups_router, prefix="/api")
app.include_router(shares_router, prefix="/api")
app.include_router(scrape_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")

# metadata logging
from .metadata import router as metadata_router
app.include_router(metadata_router)

@app.get("/")
async def root():
    return {"message": "Bienvenue sur l'API Wisherr"}

