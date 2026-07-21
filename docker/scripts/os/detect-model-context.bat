@echo off
REM Detect native context sizes for LLM models
REM For Docker Model Runner: updates docker-compose.llm.yaml with actual values
REM For Ollama: exits silently (no action needed)

setlocal enabledelayedexpansion

REM Exit silently if LLM is disabled
if "%PUBLIC_LLM_ENABLED%"=="false" exit /b 0

REM Exit silently if using Ollama (doesn't need integer replacement)
if "%LLM_PROVIDER%"=="ollama" exit /b 0

REM Only process for Docker Model Runner
REM (either explicitly set or will be auto-detected)
set "COMPOSE_FILE=.\compose\docker-compose.llm.yaml"
if not defined LLM_DOCKER_TEXT_MODEL set "LLM_DOCKER_TEXT_MODEL=ai/llama3.1:8B-F16"
if not defined LLM_DOCKER_VISION_MODEL set "LLM_DOCKER_VISION_MODEL=ai/qwen3-vl:8B-UD-Q4_K_XL"

REM Function to get model context size
call :GetModelContextSize "%LLM_DOCKER_TEXT_MODEL%" 32768 TEXT_CONTEXT
call :GetModelContextSize "%LLM_DOCKER_VISION_MODEL%" 32768 VISION_CONTEXT

echo Detected context sizes:
echo   Text model (%LLM_DOCKER_TEXT_MODEL%): %TEXT_CONTEXT% tokens
echo   Vision model (%LLM_DOCKER_VISION_MODEL%): %VISION_CONTEXT% tokens

REM Update compose file - only replace if still using variable syntax
if not exist "%COMPOSE_FILE%" (
    echo Warning: %COMPOSE_FILE% not found
    exit /b 1
)

REM Check and replace LLM_TEXT_CONTEXT_SIZE
findstr /C:"context_size: ${LLM_TEXT_CONTEXT_SIZE}" "%COMPOSE_FILE%" >nul 2>&1
if !errorlevel! equ 0 (
    powershell -Command "(Get-Content '%COMPOSE_FILE%') -replace 'context_size: \$\{LLM_TEXT_CONTEXT_SIZE\}', 'context_size: %TEXT_CONTEXT% # ${LLM_TEXT_CONTEXT_SIZE}' | Set-Content '%COMPOSE_FILE%'"
    echo Updated LLM_TEXT_CONTEXT_SIZE in %COMPOSE_FILE%
)

REM Check and replace LLM_VISION_CONTEXT_SIZE
findstr /C:"context_size: ${LLM_VISION_CONTEXT_SIZE}" "%COMPOSE_FILE%" >nul 2>&1
if !errorlevel! equ 0 (
    powershell -Command "(Get-Content '%COMPOSE_FILE%') -replace 'context_size: \$\{LLM_VISION_CONTEXT_SIZE\}', 'context_size: %VISION_CONTEXT% # ${LLM_VISION_CONTEXT_SIZE}' | Set-Content '%COMPOSE_FILE%'"
    echo Updated LLM_VISION_CONTEXT_SIZE in %COMPOSE_FILE%
)

echo Context sizes applied to %COMPOSE_FILE%
exit /b 0

:GetModelContextSize
REM Args: %1=model, %2=default, %3=output var name
set "model=%~1"
set "default=%~2"
set "context_size=%default%"

REM Try to get context_length from model metadata
for /f "tokens=*" %%i in ('docker model inspect "%model%" 2^>nul ^| findstr "context_length"') do (
    set "line=%%i"
    REM Extract number from line
    for /f "tokens=2 delims=:" %%j in ("!line!") do (
        set "value=%%j"
        set "value=!value: =!"
        set "value=!value:,=!"
        if !value! gtr 0 (
            set "context_size=!value!"
        )
    )
)

set "%~3=%context_size%"
exit /b 0