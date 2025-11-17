# Load variables from .env file
if (Test-Path ..\.env) {
    Get-Content ..\.env | ForEach-Object {
        if ($_ -match '^([^=#]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Load variables from site-specific .env file
$siteEnvPath = "..\src\.sites\$env:SITE_CODE\.env"
if (Test-Path $siteEnvPath) {
    Get-Content $siteEnvPath | ForEach-Object {
        if ($_ -match '^([^=#]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Check if DOCKER_BUILD_MODE is set
if (-not $env:DOCKER_BUILD_MODE) {
    Write-Error "Error: DOCKER_BUILD_MODE environment variable is not set (valid values: 'pip' or 'uv')"
    exit 1
}

# Check if DOCKER_BLOG_CODE is set
if (-not $env:DOCKER_BLOG_CODE) {
    Write-Error "Error: DOCKER_BLOG_CODE environment variable is not set (e.g. 'hiivelabs')"
    exit 1
}

Write-Host "Building [$env:DOCKER_BUILD_MODE] docker container for [$env:DOCKER_BLOG_CODE] blog."

# Stop existing containers (ignore errors)
docker compose -p "$env:DOCKER_BLOG_CODE" down 2>$null

# Create network (ignore errors if already exists)
docker network create "$env:DOCKER_BLOG_CODE-network" 2>$null

# Create volumes (ignore errors if already exist)
docker volume create "$env:DOCKER_BLOG_CODE-dev-workspace" 2>$null
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "$env:DOCKER_BLOG_CODE-build-workspace" 2>$null

# Start containers
docker compose -p "$env:DOCKER_BLOG_CODE" up --build -d