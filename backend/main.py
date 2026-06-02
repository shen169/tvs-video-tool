from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .task_manager import InMemoryTaskStore

app = FastAPI(title="TVS Video Tool API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = InMemoryTaskStore()


@app.get("/api/health")
def health():
    return {"status": "ok"}


from .routes import router, init_routes
init_routes(store)
app.include_router(router)
