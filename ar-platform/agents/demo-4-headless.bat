@echo off
title Tiger O2C - Demo 4 - Call the agent directly (no UI)
cd /d "%~dp0invoice-match"
echo ==================================================================
echo   DEMO 4  -  The Invoice Match agent called directly - no screen,
echo   no UI - just a payment in, a matched decision out.
echo ==================================================================
echo.
echo Input payment: $165,000 (see samples\payment-split.json)
echo.
node cli.js samples/payment-split.json
echo.
echo ------------------------------------------------------------------
echo   The agent split the payment across the two matching invoices.
pause >nul
