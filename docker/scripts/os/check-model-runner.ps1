#!/usr/bin/env pwsh
# Check if Docker Model Runner is available

Write-Host "🔍 Checking Docker Model Runner availability..." -ForegroundColor Cyan
Write-Host ""

# Check Docker Compose version
Write-Host "1️⃣  Checking Docker Compose version..."
try {
    $composeVersionOutput = docker compose version --short 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker command failed"
    }
    $composeVersion = $composeVersionOutput.ToString().Trim() -replace '^v', ''
    Write-Host "   Docker Compose version: $composeVersion"

    # Parse version
    $versionParts = $composeVersion -split '\.'
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]

    if ($major -lt 2 -or ($major -eq 2 -and $minor -lt 38)) {
        Write-Host "   ❌ Docker Compose 2.38+ required" -ForegroundColor Red
        Write-Host "   Current version: $composeVersion" -ForegroundColor Red
        Write-Host ""
        Write-Host "📝 Recommendation: Use custom Ollama container" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "   ✅ Docker Compose 2.38+ detected" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Docker not found. Please install Docker." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check Docker Desktop
Write-Host "2️⃣  Checking Docker Desktop..."
try {
    $dockerInfo = docker info 2>&1 | Out-String
    if ($dockerInfo -match "Docker Desktop") {
        if ($dockerInfo -match "Server Version:\s+(\S+)") {
            $desktopVersion = $matches[1]
            Write-Host "   Docker Desktop detected: $desktopVersion"

            # Check for 4.40+
            $versionParts = $desktopVersion -split '\.'
            $major = [int]$versionParts[0]
            $minor = [int]$versionParts[1]

            if ($major -ge 5 -or ($major -eq 4 -and $minor -ge 40)) {
                Write-Host "   ✅ Docker Desktop 4.40+ detected" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️  Docker Desktop 4.40+ recommended for best experience" -ForegroundColor Yellow
                Write-Host "   Current version: $desktopVersion" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ℹ️  Docker Desktop not detected (using Docker Engine)"
        Write-Host "   Model Runner may have limited functionality without Docker Desktop"
    }
} catch {
    Write-Host "   ⚠️  Could not determine Docker type" -ForegroundColor Yellow
}

Write-Host ""

# Test docker model command
Write-Host "3️⃣  Testing Docker Model Runner command..."
try {
    docker model --help 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 'docker model' command available" -ForegroundColor Green
    } else {
        throw "Command not available"
    }
} catch {
    Write-Host "   ❌ 'docker model' command not available" -ForegroundColor Red
    Write-Host "   This is expected on Linux or older Docker versions"
    Write-Host ""
    Write-Host "📝 Recommendation: Use custom Ollama container" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Docker Model Runner is available!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Edit docker/docker-compose.yaml:"
Write-Host "      - Uncomment the 'models' section at the bottom"
Write-Host "      - Uncomment the 'models' section in the blog service"
Write-Host "      - Comment out the 'ollama' service"
Write-Host ""
Write-Host "   2. The model will be automatically pulled on first 'docker compose up'"
Write-Host ""
Write-Host "   3. Environment variables will be injected:"
Write-Host "      - LLM_OLLAMA_URL (from endpoint_var)"
Write-Host "      - LLM_MODEL_NAME (from model_var)"
Write-Host ""
exit 0