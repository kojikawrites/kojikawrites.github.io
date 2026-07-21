@echo off
REM Check if Docker Model Runner is available

echo Checking Docker Model Runner availability...
echo.

REM Check Docker Compose version
echo 1. Checking Docker Compose version...
docker compose version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    X Docker not found. Please install Docker.
    exit /b 1
)

for /f "tokens=3" %%i in ('docker compose version --short 2^>nul') do set COMPOSE_VERSION=%%i
echo    Docker Compose version: %COMPOSE_VERSION%

REM Simple version check (assumes 2.38+)
echo    Checking if version is 2.38+...
echo %COMPOSE_VERSION% | findstr /r "^2\.[3-9][8-9]\|^2\.[4-9][0-9]\|^[3-9]\." >nul
if %ERRORLEVEL% NEQ 0 (
    echo    X Docker Compose 2.38+ required
    echo    Current version: %COMPOSE_VERSION%
    echo.
    echo Recommendation: Use custom Ollama container
    exit /b 1
)

echo    OK Docker Compose 2.38+ detected
echo.

REM Check if docker model command exists
echo 2. Testing Docker Model Runner command...
docker model --help >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo    X 'docker model' command not available
    echo.
    echo Recommendation: Use custom Ollama container
    exit /b 1
)

echo    OK 'docker model' command available
echo.

echo OK Docker Model Runner is available!
echo.
echo Next steps:
echo    1. Edit docker/docker-compose.yaml:
echo       - Uncomment the 'models' section at the bottom
echo       - Uncomment the 'models' section in the blog service
echo       - Comment out the 'ollama' service
echo.
echo    2. The model will be automatically pulled on first 'docker compose up'
echo.
exit /b 0