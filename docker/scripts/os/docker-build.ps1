# Ensure cleanup always runs on exit (success or failure)
trap {
    & scripts\os\restore-model-context.ps1
    exit 1
}

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

# Detect and apply model context sizes to compose file
& scripts\os\detect-model-context.ps1

# Compose file configuration
$composeFiles = @("-f", "compose/docker-compose.yaml")

# Auto-detect Docker Model Runner capability (unless manually overridden)
if (-not $env:COMPOSE_PROFILES) {
    # Check if LLM is disabled
    if ($env:PUBLIC_LLM_ENABLED -eq "false") {
        $env:COMPOSE_PROFILES = "no-llm"
        Write-Host ""
        Write-Host "🚫 LLM functionality disabled (PUBLIC_LLM_ENABLED=false)" -ForegroundColor Yellow
        Write-Host ""
    }
    # Check if user explicitly chose Docker Model Runner
    elseif ($env:LLM_PROVIDER -eq "docker") {
        $composeFiles = @("-f", "compose/docker-compose.yaml", "-f", "compose/docker-compose.llm.yaml")
        Write-Host ""
        Write-Host "🐳 Using Docker Model Runner (LLM_PROVIDER=docker)" -ForegroundColor Cyan

        # Check Docker models
        $missingModels = @()

        if ($env:LLM_DOCKER_TEXT_MODEL -and $env:LLM_DOCKER_VISION_MODEL) {
            $textModel = $env:LLM_DOCKER_TEXT_MODEL -replace '^ai/', ''
            $visionModel = $env:LLM_DOCKER_VISION_MODEL -replace '^ai/', ''

            $modelList = docker model list 2>$null
            if ($modelList -match [regex]::Escape($textModel)) {
                Write-Host "   ✓ Text model cached: $textModel"
            } else {
                Write-Host "   ✗ Text model missing: $textModel"
                $missingModels += $env:LLM_DOCKER_TEXT_MODEL
            }

            if ($modelList -match [regex]::Escape($visionModel)) {
                Write-Host "   ✓ Vision model cached: $visionModel"
            } else {
                Write-Host "   ✗ Vision model missing: $visionModel"
                $missingModels += $env:LLM_DOCKER_VISION_MODEL
            }
        } else {
            $fullModel = if ($env:LLM_DOCKER_MODEL) { $env:LLM_DOCKER_MODEL } else { "ai/qwen3-vl:8B-UD-Q4_K_XL" }
            $modelName = $fullModel -replace '^ai/', ''

            $modelList = docker model list 2>$null
            if ($modelList -match [regex]::Escape($modelName)) {
                Write-Host "   ✓ Model cached: $modelName"
            } else {
                Write-Host "   ✗ Model missing: $modelName"
                $missingModels += $fullModel
            }
        }

        if ($missingModels.Count -gt 0) {
            Write-Host ""
            Write-Host "❌ Required Docker models are not available" -ForegroundColor Red
            Write-Host ""
            Write-Host "Please pull the missing models before building:"
            Write-Host ""
            foreach ($model in $missingModels) {
                Write-Host "  docker model pull $model"
            }
            Write-Host ""
            Write-Host "Or disable LLM features by setting PUBLIC_LLM_ENABLED=false in .env"
            Write-Host ""
            exit 1
        }
        Write-Host ""
    }
    # Check if user explicitly chose containerized Ollama (we manage the container)
    elseif ($env:LLM_PROVIDER -eq "ollama-docker") {
        $env:COMPOSE_PROFILES = "ollama"
        Write-Host ""
        Write-Host "📦 Using containerized Ollama (LLM_PROVIDER=ollama-docker)" -ForegroundColor Yellow
        Write-Host "   URL: http://ollama:11434 (internal Docker network)"
        Write-Host ""
    }
    # Check if user is using external Ollama (they manage it)
    elseif ($env:LLM_PROVIDER -eq "ollama") {
        # No Ollama container needed - user manages their own Ollama instance
        $env:COMPOSE_PROFILES = "no-llm"
        $ollamaUrl = if ($env:LLM_OLLAMA_URL) { $env:LLM_OLLAMA_URL } else { "http://host.docker.internal:11434" }
        Write-Host ""
        Write-Host "🔗 Using external Ollama (LLM_PROVIDER=ollama)" -ForegroundColor Cyan
        Write-Host "   URL: $ollamaUrl"
        Write-Host "   Note: Ensure your Ollama instance is running and accessible"
        Write-Host ""
    }
    # Check if user is using OpenAI API
    elseif ($env:LLM_PROVIDER -eq "openai") {
        # No local LLM container needed - using OpenAI API
        $env:COMPOSE_PROFILES = "no-llm"
        Write-Host ""
        Write-Host "🌐 Using OpenAI API (LLM_PROVIDER=openai)" -ForegroundColor Cyan
        if (-not $env:LLM_OPENAI_API_KEY) {
            Write-Host "   ⚠️  Warning: LLM_OPENAI_API_KEY not set" -ForegroundColor Yellow
        } else {
            Write-Host "   ✓ API key configured"
        }
        $textModel = if ($env:LLM_OPENAI_TEXT_MODEL) { $env:LLM_OPENAI_TEXT_MODEL } else { "gpt-4o" }
        $visionModel = if ($env:LLM_OPENAI_VISION_MODEL) { $env:LLM_OPENAI_VISION_MODEL } else { "gpt-4o" }
        Write-Host "   Text model: $textModel"
        Write-Host "   Vision model: $visionModel"
        Write-Host ""
    }
    # Check if user is using Claude/Anthropic API
    elseif ($env:LLM_PROVIDER -eq "claude") {
        # No local LLM container needed - using Anthropic API
        $env:COMPOSE_PROFILES = "no-llm"
        Write-Host ""
        Write-Host "🤖 Using Claude/Anthropic API (LLM_PROVIDER=claude)" -ForegroundColor Cyan
        if (-not $env:LLM_ANTHROPIC_API_KEY) {
            Write-Host "   ⚠️  Warning: LLM_ANTHROPIC_API_KEY not set" -ForegroundColor Yellow
        } else {
            Write-Host "   ✓ API key configured"
        }
        $textModel = if ($env:LLM_ANTHROPIC_TEXT_MODEL) { $env:LLM_ANTHROPIC_TEXT_MODEL } else { "claude-sonnet-4-20250514" }
        $visionModel = if ($env:LLM_ANTHROPIC_VISION_MODEL) { $env:LLM_ANTHROPIC_VISION_MODEL } else { "claude-sonnet-4-20250514" }
        Write-Host "   Text model: $textModel"
        Write-Host "   Vision model: $visionModel"
        Write-Host ""
    }
    # Check for unknown providers
    elseif ($env:LLM_PROVIDER) {
        Write-Host ""
        Write-Error "Unknown LLM provider '$env:LLM_PROVIDER'"
        Write-Host "   Valid options: docker, ollama, ollama-docker, openai, claude" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    else {
        Write-Host ""
        Write-Host "🔍 Auto-detecting LLM deployment method..." -ForegroundColor Cyan

        try {
            $composeVersion = (docker compose version --short 2>&1).ToString().Trim() -replace '^v', ''
            $versionParts = $composeVersion -split '\.'
            $major = [int]$versionParts[0]
            $minor = [int]$versionParts[1]

            $useModelRunner = $false

            # Check if Docker Compose 2.38+ and docker model command available
            if ($major -ge 2 -and $minor -ge 38) {
                try {
                    docker model --help 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $useModelRunner = $true
                        $composeFiles = @("-f", "compose/docker-compose.yaml", "-f", "compose/docker-compose.llm.yaml")

                        Write-Host "✅ Docker Model Runner available (Compose $composeVersion)" -ForegroundColor Green

                        # Track missing models
                        $missingModels = @()

                        # Check for dual-model configuration
                        if ($env:LLM_DOCKER_TEXT_MODEL -and $env:LLM_DOCKER_VISION_MODEL) {
                            # Dual-model mode
                            $textModel = $env:LLM_DOCKER_TEXT_MODEL -replace '^ai/', ''
                            $visionModel = $env:LLM_DOCKER_VISION_MODEL -replace '^ai/', ''

                            # Check text model
                            $modelList = docker model list 2>$null
                            if ($modelList -match [regex]::Escape($textModel)) {
                                Write-Host "   ✓ Text model cached: $textModel"
                            } else {
                                Write-Host "   ✗ Text model missing: $textModel"
                                $missingModels += $env:LLM_DOCKER_TEXT_MODEL
                            }

                            # Check vision model
                            if ($modelList -match [regex]::Escape($visionModel)) {
                                Write-Host "   ✓ Vision model cached: $visionModel"
                            } else {
                                Write-Host "   ✗ Vision model missing: $visionModel"
                                $missingModels += $env:LLM_DOCKER_VISION_MODEL
                            }
                        } else {
                            # Single-model mode
                            $fullModel = if ($env:LLM_DOCKER_MODEL) { $env:LLM_DOCKER_MODEL } else { "ai/qwen3-vl:8B-UD-Q4_K_XL" }
                            $modelName = $fullModel -replace '^ai/', ''

                            $modelList = docker model list 2>$null
                            if ($modelList -match [regex]::Escape($modelName)) {
                                Write-Host "   ✓ Model cached: $modelName"
                            } else {
                                Write-Host "   ✗ Model missing: $modelName"
                                $missingModels += $fullModel
                            }
                        }

                        # If models are missing, cancel build with instructions
                        if ($missingModels.Count -gt 0) {
                            Write-Host ""
                            Write-Host "❌ Required Docker models are not available" -ForegroundColor Red
                            Write-Host ""
                            Write-Host "Please pull the missing models before building:"
                            Write-Host ""
                            foreach ($model in $missingModels) {
                                Write-Host "  docker model pull $model"
                            }
                            Write-Host ""
                            Write-Host "Or disable LLM features by setting PUBLIC_LLM_ENABLED=false in .env"
                            Write-Host ""
                            exit 1
                        }
                    }
                } catch {}
            }

            if (-not $useModelRunner) {
                $env:COMPOSE_PROFILES = "ollama"
                Write-Host "📦 Using custom Ollama container (fallback mode)" -ForegroundColor Yellow
                Write-Host "   Compose version: $composeVersion"
                Write-Host ""
                Write-Host "ℹ️  Required Ollama models:"

                # Check for dual-model configuration
                if ($env:LLM_OLLAMA_TEXT_MODEL -and $env:LLM_OLLAMA_VISION_MODEL) {
                    Write-Host "   - Text model: $env:LLM_OLLAMA_TEXT_MODEL"
                    Write-Host "   - Vision model: $env:LLM_OLLAMA_VISION_MODEL"
                    Write-Host ""
                    Write-Host "   After container starts, pull models with:"
                    Write-Host "   docker exec $env:DOCKER_BLOG_CODE-ollama ollama pull $env:LLM_OLLAMA_TEXT_MODEL"
                    Write-Host "   docker exec $env:DOCKER_BLOG_CODE-ollama ollama pull $env:LLM_OLLAMA_VISION_MODEL"
                } else {
                    $ollamaModel = if ($env:LLM_OLLAMA_MODEL) { $env:LLM_OLLAMA_MODEL } else { "llama3.2-vision:11b" }
                    Write-Host "   - Model: $ollamaModel"
                    Write-Host ""
                    Write-Host "   After container starts, pull models with:"
                    Write-Host "   docker exec $env:DOCKER_BLOG_CODE-ollama ollama pull $ollamaModel"
                }
            }
        } catch {
            $env:COMPOSE_PROFILES = "ollama"
            Write-Host "📦 Using custom Ollama container (fallback mode)" -ForegroundColor Yellow
        }

        Write-Host ""
    }
} else {
    Write-Host "ℹ️  Using manually configured profile: $env:COMPOSE_PROFILES" -ForegroundColor Cyan
    if ($env:COMPOSE_PROFILES -ne "ollama" -and $env:COMPOSE_PROFILES -ne "no-llm") {
        $composeFiles = @("-f", "compose/docker-compose.yaml", "-f", "compose/docker-compose.llm.yaml")
    }
    Write-Host ""
}

# Stop all containers for this project (including ones from inactive profiles)
docker compose -f docker-compose.yaml --profile ollama -p "$env:DOCKER_BLOG_CODE" down 2>$null

# Create network (ignore errors if already exists)
docker network create "$env:DOCKER_BLOG_CODE-network" 2>$null

# Create volumes (ignore errors if already exist)
docker volume create "$env:DOCKER_BLOG_CODE-dev-workspace" 2>$null
docker volume create --driver local --opt type=tmpfs --opt device=tmpfs --opt o=size=8g,uid=1000 "$env:DOCKER_BLOG_CODE-build-workspace" 2>$null
docker volume create "blog-ollama-models" 2>$null
docker volume create "blog-cache" 2>$null

# Start containers
docker compose @composeFiles -p "$env:DOCKER_BLOG_CODE" up --build -d

# Restore compose file on successful completion
& scripts\os\restore-model-context.ps1