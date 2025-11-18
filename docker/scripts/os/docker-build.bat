@echo off
setlocal enabledelayedexpansion

REM Load variables from .env file
if exist ..\.env (
    for /f "usebackq tokens=1,* delims==" %%a in ("..\.env") do (
        set "%%a=%%b"
    )
)

REM Load variables from site-specific .env file
if exist "..\src\.sites\%SITE_CODE%\.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("..\src\.sites\%SITE_CODE%\.env") do (
        set "%%a=%%b"
    )
)

REM Check if DOCKER_BUILD_MODE is set
if "%DOCKER_BUILD_MODE%"=="" (
    echo Error: DOCKER_BUILD_MODE environment variable is not set (valid values: "pip" or "uv"^) 1>&2
    exit /b 1
)

REM Check if DOCKER_BLOG_CODE is set
if "%DOCKER_BLOG_CODE%"=="" (
    echo Error: DOCKER_BLOG_CODE environment variable is not set (e.g. "hiivelabs"^) 1>&2
    exit /b 1
)

echo Building [%DOCKER_BUILD_MODE%] docker container for [%DOCKER_BLOG_CODE%] blog.

REM Compose file configuration
set "COMPOSE_FILES=-f compose\docker-compose.yaml"

REM Auto-detect Docker Model Runner capability (unless manually overridden)
if "%COMPOSE_PROFILES%"=="" (
    REM Check if LLM is disabled
    if "%LLM_ENABLED%"=="false" (
        set "COMPOSE_PROFILES=no-llm"
        echo.
        echo 🚫 LLM functionality disabled (LLM_ENABLED=false^)
        echo.
    ) else if "%LLM_PROVIDER%"=="docker" (
        set "COMPOSE_FILES=-f compose\docker-compose.yaml -f compose\docker-compose.llm.yaml"
        echo.
        echo 🐳 Using Docker Model Runner (LLM_PROVIDER=docker^)
        goto :check_docker_models
    ) else if "%LLM_PROVIDER%"=="ollama" (
        set "COMPOSE_PROFILES=ollama"
        echo.
        echo 📦 Using custom Ollama container (LLM_PROVIDER=ollama^)
        echo.
    ) else if not "%LLM_PROVIDER%"=="" (
        echo.
        echo ❌ LLM provider '%LLM_PROVIDER%' is not yet implemented 1>&2
        echo    Valid options: docker, ollama 1>&2
        echo    Coming soon: claude, openai 1>&2
        echo.
        exit /b 1
    ) else (
        echo.
        echo 🔍 Auto-detecting LLM deployment method...

        REM Check for Docker Model Runner
        docker model --help >nul 2>&1
        if !errorlevel! equ 0 (
            set "USE_MODEL_RUNNER=true"
            set "COMPOSE_FILES=-f compose\docker-compose.yaml -f compose\docker-compose.llm.yaml"

            echo ✅ Docker Model Runner available

            REM Check for dual-model configuration
            if not "%LLM_DOCKER_TEXT_MODEL%"=="" if not "%LLM_DOCKER_VISION_MODEL%"=="" (
                REM Dual-model mode
                set "MISSING_MODELS="

                REM Check text model (remove ai/ prefix for checking)
                set "TEXT_MODEL=%LLM_DOCKER_TEXT_MODEL:ai/=%"
                docker model list 2>nul | findstr /C:"!TEXT_MODEL!" >nul
                if !errorlevel! neq 0 (
                    echo    ✗ Text model missing: !TEXT_MODEL!
                    set "MISSING_MODELS=!MISSING_MODELS! %LLM_DOCKER_TEXT_MODEL%"
                ) else (
                    echo    ✓ Text model cached: !TEXT_MODEL!
                )

                REM Check vision model
                set "VISION_MODEL=%LLM_DOCKER_VISION_MODEL:ai/=%"
                docker model list 2>nul | findstr /C:"!VISION_MODEL!" >nul
                if !errorlevel! neq 0 (
                    echo    ✗ Vision model missing: !VISION_MODEL!
                    set "MISSING_MODELS=!MISSING_MODELS! %LLM_DOCKER_VISION_MODEL%"
                ) else (
                    echo    ✓ Vision model cached: !VISION_MODEL!
                )
            ) else (
                REM Single-model mode
                if "%LLM_DOCKER_MODEL%"=="" (
                    set "FULL_MODEL=ai/qwen3-vl:8B-UD-Q4_K_XL"
                ) else (
                    set "FULL_MODEL=%LLM_DOCKER_MODEL%"
                )
                set "MODEL_NAME=!FULL_MODEL:ai/=!"

                docker model list 2>nul | findstr /C:"!MODEL_NAME!" >nul
                if !errorlevel! neq 0 (
                    echo    ✗ Model missing: !MODEL_NAME!
                    set "MISSING_MODELS=!FULL_MODEL!"
                ) else (
                    echo    ✓ Model cached: !MODEL_NAME!
                )
            )

            REM If models are missing, cancel build with instructions
            if not "!MISSING_MODELS!"=="" (
                echo.
                echo ❌ Required Docker models are not available
                echo.
                echo Please pull the missing models before building:
                echo.
                for %%m in (!MISSING_MODELS!) do echo   docker model pull %%m
                echo.
                echo Or disable LLM features by setting LLM_ENABLED=false in .env
                echo.
                exit /b 1
            )
        ) else (
            set "COMPOSE_PROFILES=ollama"
            echo 📦 Using custom Ollama container (fallback mode^)
            echo.
            echo ℹ️  Required Ollama models:

            if not "%LLM_OLLAMA_TEXT_MODEL%"=="" if not "%LLM_OLLAMA_VISION_MODEL%"=="" (
                echo    - Text model: %LLM_OLLAMA_TEXT_MODEL%
                echo    - Vision model: %LLM_OLLAMA_VISION_MODEL%
                echo.
                echo    After container starts, pull models with:
                echo    docker exec %DOCKER_BLOG_CODE%-ollama ollama pull %LLM_OLLAMA_TEXT_MODEL%
                echo    docker exec %DOCKER_BLOG_CODE%-ollama ollama pull %LLM_OLLAMA_VISION_MODEL%
            ) else (
                if "%LLM_OLLAMA_MODEL%"=="" (
                    set "OLLAMA_MODEL=llama3.2-vision:11b"
                ) else (
                    set "OLLAMA_MODEL=%LLM_OLLAMA_MODEL%"
                )
                echo    - Model: !OLLAMA_MODEL!
                echo.
                echo    After container starts, pull models with:
                echo    docker exec %DOCKER_BLOG_CODE%-ollama ollama pull !OLLAMA_MODEL!
            )
        )
        echo.
    )
) else (
    echo ℹ️  Using manually configured profile: %COMPOSE_PROFILES%
    if not "%COMPOSE_PROFILES%"=="ollama" if not "%COMPOSE_PROFILES%"=="no-llm" (
        set "COMPOSE_FILES=-f compose\docker-compose.yaml -f compose\docker-compose.llm.yaml"
    )
    echo.
)

:check_docker_models
REM Check Docker models if provider is explicitly docker
if "%LLM_PROVIDER%"=="docker" (
    set "MISSING_MODELS="

    REM Check for dual-model configuration
    if not "%LLM_DOCKER_TEXT_MODEL%"=="" if not "%LLM_DOCKER_VISION_MODEL%"=="" (
        REM Dual-model mode
        set "TEXT_MODEL=%LLM_DOCKER_TEXT_MODEL:ai/=%"
        docker model list 2>nul | findstr /C:"!TEXT_MODEL!" >nul
        if !errorlevel! neq 0 (
            echo    ✗ Text model missing: !TEXT_MODEL!
            set "MISSING_MODELS=!MISSING_MODELS! %LLM_DOCKER_TEXT_MODEL%"
        ) else (
            echo    ✓ Text model cached: !TEXT_MODEL!
        )

        set "VISION_MODEL=%LLM_DOCKER_VISION_MODEL:ai/=%"
        docker model list 2>nul | findstr /C:"!VISION_MODEL!" >nul
        if !errorlevel! neq 0 (
            echo    ✗ Vision model missing: !VISION_MODEL!
            set "MISSING_MODELS=!MISSING_MODELS! %LLM_DOCKER_VISION_MODEL%"
        ) else (
            echo    ✓ Vision model cached: !VISION_MODEL!
        )
    ) else (
        REM Single-model mode
        if "%LLM_DOCKER_MODEL%"=="" (
            set "FULL_MODEL=ai/qwen3-vl:8B-UD-Q4_K_XL"
        ) else (
            set "FULL_MODEL=%LLM_DOCKER_MODEL%"
        )
        set "MODEL_NAME=!FULL_MODEL:ai/=!"

        docker model list 2>nul | findstr /C:"!MODEL_NAME!" >nul
        if !errorlevel! neq 0 (
            echo    ✗ Model missing: !MODEL_NAME!
            set "MISSING_MODELS=!FULL_MODEL!"
        ) else (
            echo    ✓ Model cached: !MODEL_NAME!
        )
    )

    REM If models are missing, cancel build with instructions
    if not "!MISSING_MODELS!"=="" (
        echo.
        echo ❌ Required Docker models are not available
        echo.
        echo Please pull the missing models before building:
        echo.
        for %%m in (!MISSING_MODELS!) do echo   docker model pull %%m
        echo.
        echo Or disable LLM features by setting LLM_ENABLED=false in .env
        echo.
        exit /b 1
    )
    echo.
)

REM Stop all containers for this project
docker compose -f compose\docker-compose.yaml --profile ollama -p "%DOCKER_BLOG_CODE%" down 2>nul

REM Create network and volumes
docker network create "%DOCKER_BLOG_CODE%-network" 2>nul
docker volume create "%DOCKER_BLOG_CODE%-dev-workspace" 2>nul
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "%DOCKER_BLOG_CODE%-build-workspace" 2>nul
docker volume create "blog-ollama-models" 2>nul

REM Start containers
docker compose %COMPOSE_FILES% -p "%DOCKER_BLOG_CODE%" up --build -d