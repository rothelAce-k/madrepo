@echo off
echo ========================================
echo Starting P-Health Backend
echo ========================================
cd /d "C:\Users\micro\OneDrive\Desktop\P_Health\ml_pipeline\backend"
echo Current directory: %CD%
echo.
echo Starting uvicorn server...
python -m uvicorn main:app --reload --port 8000
pause
