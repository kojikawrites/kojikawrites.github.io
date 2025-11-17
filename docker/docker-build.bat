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

REM Stop existing containers (ignore errors)
docker compose -p "%DOCKER_BLOG_CODE%" down 2>nul

REM Create network (ignore errors if already exists)
docker network create "%DOCKER_BLOG_CODE%-network" 2>nul

REM Create volumes (ignore errors if already exist)
docker volume create "%DOCKER_BLOG_CODE%-dev-workspace" 2>nul
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "%DOCKER_BLOG_CODE%-build-workspace" 2>nul

REM Start containers
docker compose -p "%DOCKER_BLOG_CODE%" up --build -d