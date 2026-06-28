@echo off
title Tiger O2C - FULL Reusable-Agents Demo
cls
echo.
echo   ================================================================
echo         TIGER O2C   -   REUSABLE AI AGENTS   -   FULL DEMO
echo   ================================================================
echo.
echo   This plays 5 short demos in order. After each one: read the
echo   result, say your line, then press any key to continue.
echo.
echo     1) Pipeline  -  an email becomes a matched payment
echo     2) Tests     -  it is real, tested software
echo     3) Numbers   -  measured accuracy
echo     4) Headless  -  the agent on its own, no UI
echo     5) Config    -  same agent, different client settings = reuse
echo.
echo   Press any key to begin...
pause >nul

call "%~dp0demo-1-pipeline.bat"
call "%~dp0demo-2-tests.bat"
call "%~dp0demo-3-numbers.bat"
call "%~dp0demo-4-headless.bat"
call "%~dp0demo-5-config.bat"

cls
echo.
echo   ================================================================
echo         DEMO COMPLETE
echo   ================================================================
echo.
echo   Recap for the client:
echo     - Two PRE-BUILT agents, proven with tests and accuracy numbers
echo     - They run on their own (no UI) and compose end to end
echo     - Reused per client by CONFIG, not by rebuilding
echo     =^> that is what shortens implementation time.
echo.
echo   Press any key to close.
pause >nul
