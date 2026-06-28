@echo off
title Tiger O2C - Demo 3 - The accuracy numbers
echo ==================================================================
echo   DEMO 3  -  How accurate are the agents? (measured, not claimed)
echo ==================================================================
echo.
echo --- Invoice Match: scored against a known answer key ---
cd /d "%~dp0invoice-match"
node eval/run.js
echo.
echo --- Remittance Capture: scored against a known answer key ---
cd /d "%~dp0remittance-capture"
node eval/run.js
echo.
echo ------------------------------------------------------------------
pause >nul
