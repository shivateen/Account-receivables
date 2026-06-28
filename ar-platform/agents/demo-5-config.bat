@echo off
title Tiger O2C - Demo 5 - Same agent, different client config
cd /d "%~dp0invoice-match"
echo ==================================================================
echo   DEMO 5  -  Reuse = configuration, not rebuilding.
echo   The SAME agent, run with two different clients' settings.
echo ==================================================================
echo.
echo --- Client A (default settings) ---
node eval/run.js
echo.
echo --- Client B (stricter settings - one borderline case now differs) ---
node eval/run.js client-b
echo.
echo ------------------------------------------------------------------
echo   Same package. No code change. Just config. That is reusability.
pause >nul
