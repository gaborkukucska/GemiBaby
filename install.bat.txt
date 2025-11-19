
@echo off
title GemiBaby Installer
color 0b

echo ----------------------------------------
echo       GEMIBABY ENVIRONMENT SETUP
echo ----------------------------------------
echo.

:: 1. Check Node
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: 2. Check Ollama
where ollama >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Ollama not found.
    echo     Please download and install Ollama from: https://ollama.com/download/windows
    echo     Once installed, run this script again.
    pause
    exit /b
) else (
    echo [V] Ollama detected.
)

:: 3. Provision Models
echo.
echo [!] Verifying AI Models...

:: Default Models
set GENERAL_MODEL=llama3
set CODER_MODEL=deepseek-coder
set VISION_MODEL=llava

echo     Checking General Model (%GENERAL_MODEL%)...
ollama list | findstr "%GENERAL_MODEL%" >nul
if %errorlevel% neq 0 (
    echo     Downloading %GENERAL_MODEL%...
    ollama pull %GENERAL_MODEL%
) else (
    echo     [V] %GENERAL_MODEL% ready.
)

echo     Checking Coder Model (%CODER_MODEL%)...
ollama list | findstr "%CODER_MODEL%" >nul
if %errorlevel% neq 0 (
    echo     Downloading %CODER_MODEL%...
    ollama pull %CODER_MODEL%
) else (
    echo     [V] %CODER_MODEL% ready.
)

echo     Checking Vision Model (%VISION_MODEL%)...
ollama list | findstr "%VISION_MODEL%" >nul
if %errorlevel% neq 0 (
    echo     Downloading %VISION_MODEL%...
    ollama pull %VISION_MODEL%
) else (
    echo     [V] %VISION_MODEL% ready.
)

:: 4. Install NPM
echo.
echo [!] Installing Web App Dependencies...
call npm install

if %errorlevel% neq 0 (
    color 0c
    echo [X] Error installing dependencies.
    pause
    exit /b
)

color 0a
echo.
echo [V] Setup Complete!
echo.
echo To start GemiBaby, type: npm run dev
echo.
pause
