from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import logging

# Configure application logging
logging.basicConfig(
    filename='app.log',
    level=logging.ERROR,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from .routers.public import router as public_router
from .routers.auth import router as auth_router

import os
import os
# from .db import engine  <-- BU SATIR HATALIYDI, SİLDİK
# from sqlalchemy import inspect <-- GEREKSİZ, SİLDİK


app = FastAPI(title='HIMS API')

# Production-ready CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Database exist check - important for Render
    if not os.path.exists("hospital.db"):
        logger.info("Database not found, running setup...")
        # Note: In production, we run setup script or migrations
        # For simplicity on Render Free tier, it will use the repo-bundled .db
        # But if you want to seed it automatically:
        # import subprocess
        # subprocess.run(["python", "tools/setup.py"])
        pass



@app.get('/health')
def health():
    return {'status': 'ok'}


@app.get('/')
def root():
    return {'service': 'HIMS API', 'version': '0.1'}


app.include_router(public_router, prefix="/api")
app.include_router(auth_router, prefix="/api/auth")
