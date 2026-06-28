@echo off
title Tiger O2C - Demo 2 - The agents are tested software
echo ==================================================================
echo   DEMO 2  -  These are real, tested packages (not UI tricks)
echo ==================================================================
echo.
echo --- Invoice Match agent: unit tests ---
cd /d "%~dp0invoice-match"
node --test
echo.
echo --- Remittance Capture agent: unit tests ---
cd /d "%~dp0remittance-capture"
node --test
echo.
echo ------------------------------------------------------------------
echo   All green = every behaviour is verified by automated tests.
pause >nul
