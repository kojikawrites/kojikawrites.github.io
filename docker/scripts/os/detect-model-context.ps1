# Detect native context sizes for LLM models
# For Docker Model Runner: updates docker-compose.llm.yaml with actual values
# For Ollama: exits silently (no action needed)

$ErrorActionPreference = "Stop"

# Exit silently if LLM is disabled
if ($env:PUBLIC_LLM_ENABLED -eq "false") {
    exit 0
}

# Exit silently if using Ollama (doesn't need integer replacement)
if ($env:LLM_PROVIDER -eq "ollama") {
    exit 0
}

# Only process for Docker Model Runner
# (either explicitly set or will be auto-detected)
$ComposeFile = ".\compose\docker-compose.llm.yaml"
$TextModel = if ($env:LLM_DOCKER_TEXT_MODEL) { $env:LLM_DOCKER_TEXT_MODEL } else { "ai/llama3.1:8B-F16" }
$VisionModel = if ($env:LLM_DOCKER_VISION_MODEL) { $env:LLM_DOCKER_VISION_MODEL } else { "ai/qwen3-vl:8B-UD-Q4_K_XL" }

function Get-ModelContextSize {
    param (
        [string]$Model,
        [int]$Default
    )

    try {
        # Try to get context_length from model metadata
        $metadata = docker model inspect $Model 2>$null | Out-String
        if ($metadata -match '"context_length"[:\s]+(\d+)') {
            $contextSize = [int]$matches[1]
            if ($contextSize -gt 0) {
                return $contextSize
            }
        }
    }
    catch {
        # Silently fall back to default
    }

    return $Default
}

# Get context sizes (with sensible defaults)
$TextContext = Get-ModelContextSize -Model $TextModel -Default 32768
$VisionContext = Get-ModelContextSize -Model $VisionModel -Default 32768

Write-Host "Detected context sizes:"
Write-Host "  Text model ($TextModel): $TextContext tokens"
Write-Host "  Vision model ($VisionModel): $VisionContext tokens"

# Update compose file - only replace if still using variable syntax
# This prevents double-replacement if script runs multiple times

if (Test-Path $ComposeFile) {
    $content = Get-Content $ComposeFile -Raw

    # Replace ${LLM_TEXT_CONTEXT_SIZE} with actual value + comment (if not already replaced)
    if ($content -match 'context_size: \$\{LLM_TEXT_CONTEXT_SIZE\}') {
        $content = $content -replace 'context_size: \$\{LLM_TEXT_CONTEXT_SIZE\}', "context_size: $TextContext # `${LLM_TEXT_CONTEXT_SIZE}"
        Write-Host "Updated LLM_TEXT_CONTEXT_SIZE in $ComposeFile"
    }

    # Replace ${LLM_VISION_CONTEXT_SIZE} with actual value + comment (if not already replaced)
    if ($content -match 'context_size: \$\{LLM_VISION_CONTEXT_SIZE\}') {
        $content = $content -replace 'context_size: \$\{LLM_VISION_CONTEXT_SIZE\}', "context_size: $VisionContext # `${LLM_VISION_CONTEXT_SIZE}"
        Write-Host "Updated LLM_VISION_CONTEXT_SIZE in $ComposeFile"
    }

    Set-Content -Path $ComposeFile -Value $content -NoNewline
}
else {
    Write-Host "Warning: $ComposeFile not found"
    exit 1
}

Write-Host "Context sizes applied to $ComposeFile"