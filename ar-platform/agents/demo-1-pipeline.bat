@echo off
title Tiger O2C - Demo 1 - Two agents end to end
cd /d "%~dp0remittance-capture"
echo ==================================================================
echo   DEMO 1  -  An email of text becomes a matched payment
echo   (Remittance Capture agent  -^>  Invoice Match agent, no UI)
echo ==================================================================
echo.
node pipeline-demo.js
echo.
echo ------------------------------------------------------------------
echo   Done. Close this window or press a key.
pause >nul
