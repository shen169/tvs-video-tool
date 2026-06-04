import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend/ directory (project root when deployed, backend/ locally)
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)
else:
    # Fallback: try project root
    _root_env = Path(__file__).parent.parent / ".env"
    if _root_env.exists():
        load_dotenv(_root_env)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .task_manager import FileTaskStore

app = FastAPI(title="TVS Video Tool API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = FileTaskStore()


@app.get("/api/health")
def health():
    return {"status": "ok"}


from .routes import router, init_routes
init_routes(store)
app.include_router(router)
