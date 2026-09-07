@echo off
setlocal
cd /d "%~dp0"
title Giumag PDF Studio

echo.
echo  ================================================
echo             GIUMAG PDF STUDIO
echo  ================================================
echo.

if exist ".venv\Scripts\python.exe" goto venv_ready

where py >nul 2>nul
if not errorlevel 1 (
    set "PY=py"
) else (
    where python >nul 2>nul
    if not errorlevel 1 (
        set "PY=python"
    ) else (
        echo [ERRORE] Python 3 non risulta installato.
        echo Installa Python 3.11 o superiore e abilita "Add Python to PATH".
        echo.
        pause
        exit /b 1
    )
)

echo [1/2] Creo l'ambiente locale alla prima esecuzione...
%PY% -m venv .venv
if errorlevel 1 goto error

:venv_ready
if exist ".venv\.giumag_ready" goto run

echo [2/2] Installo i componenti Python alla prima esecuzione...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto error
type nul > ".venv\.giumag_ready"

:run
echo Avvio Giumag PDF Studio...
".venv\Scripts\python.exe" launcher.py
if errorlevel 1 goto error
exit /b 0

:error
echo.
echo [ERRORE] Avvio non riuscito. Leggi il messaggio qui sopra.
pause
exit /b 1
