@echo off
REM Restore docker-compose.llm.yaml to use environment variable syntax
REM This reverses the changes made by detect-model-context.bat

setlocal enabledelayedexpansion

REM Exit silently if LLM is disabled
if "%LLM_ENABLED%"=="false" exit /b 0

REM Exit silently if using Ollama (no restoration needed)
if "%LLM_PROVIDER%"=="ollama" exit /b 0

set "COMPOSE_FILE=.\compose\docker-compose.llm.yaml"

if not exist "%COMPOSE_FILE%" (
    echo Warning: %COMPOSE_FILE% not found
    exit /b 1
)

REM Restore ${LLM_TEXT_CONTEXT_SIZE} from inline values
findstr /R "context_size: [0-9][0-9]* # \${LLM_TEXT_CONTEXT_SIZE}" "%COMPOSE_FILE%" >nul 2>&1
if !errorlevel! equ 0 (
    powershell -Command "(Get-Content '%COMPOSE_FILE%') -replace 'context_size: \d+ # \$\{LLM_TEXT_CONTEXT_SIZE\}', 'context_size: ${LLM_TEXT_CONTEXT_SIZE}' | Set-Content '%COMPOSE_FILE%'"
    echo Restored LLM_TEXT_CONTEXT_SIZE in %COMPOSE_FILE%
)

REM Restore ${LLM_VISION_CONTEXT_SIZE} from inline values
findstr /R "context_size: [0-9][0-9]* # \${LLM_VISION_CONTEXT_SIZE}" "%COMPOSE_FILE%" >nul 2>&1
if !errorlevel! equ 0 (
    powershell -Command "(Get-Content '%COMPOSE_FILE%') -replace 'context_size: \d+ # \$\{LLM_VISION_CONTEXT_SIZE\}', 'context_size: ${LLM_VISION_CONTEXT_SIZE}' | Set-Content '%COMPOSE_FILE%'"
    echo Restored LLM_VISION_CONTEXT_SIZE in %COMPOSE_FILE%
)

echo Restored environment variable syntax in %COMPOSE_FILE%
exit /b 0