@echo off
title HIMS - Hospital Information Management System
echo ========================================================
echo HIMS - Hospital Information Management System Local Starter
echo ========================================================

rem Check if virtual environment exists
if not exist .venv_app (
    echo [PYTHON] .venv_app klasoru bulunamadi.
    echo Lutfen once python -m venv .venv_app calistirin.
    pause
    exit /b
)

rem Check if hospital.db exists, if not seed it
if not exist hospital.db (
    echo [DATABASE] hospital.db bulunamadi. Veritabani olusturuluyor...
    call .venv_app\Scripts\activate.bat
    python tools/setup.py
    echo [DATABASE] Veritabani basariyla olusturuldu!
) else (
    echo [DATABASE] hospital.db bulundu.
)

rem Check if frontend/node_modules exists, if not install dependencies
if not exist frontend\node_modules (
    echo [FRONTEND] node_modules bulunamadi. Bagimliliklar yukleniyor...
    cd frontend
    call npm install
    cd ..
) else (
    echo [FRONTEND] node_modules bulundu.
)

rem Start Backend in a new window
echo [BACKEND] API sunucusu baslatiliyor on Port 8005...
start "HIMS Backend" cmd /c "call .venv_app\Scripts\activate.bat && python -m uvicorn api.main:app --host 127.0.0.1 --port 8005 --reload"

rem Start Frontend in a new window
echo [FRONTEND] React Vite sunucusu baslatiliyor on Port 5173...
start "HIMS Frontend" cmd /c "cd frontend && npm run dev"

echo ========================================================
echo [OK] HIMS Uygulamasi baslatildi!
echo Backend: http://127.0.0.1:8005
echo Frontend: http://localhost:5173
echo ========================================================
pause
