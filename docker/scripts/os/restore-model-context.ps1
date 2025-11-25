# Restore docker-compose.llm.yaml to use environment variable syntax
# This reverses the changes made by detect-model-context.ps1

$ErrorActionPreference = "Stop"

# Exit silently if LLM is disabled
if ($env:PUBLIC_LLM_ENABLED -eq "false") {
    exit 0
}

# Exit silently if using Ollama (no restoration needed)
if ($env:LLM_PROVIDER -eq "ollama") {
    exit 0
}

$ComposeFile = ".\compose\docker-compose.llm.yaml"

if (-not (Test-Path $ComposeFile)) {
    Write-Host "Warning: $ComposeFile not found"
    exit 1
}

$content = Get-Content $ComposeFile -Raw

# Restore ${LLM_TEXT_CONTEXT_SIZE} from inline values
if ($content -match 'context_size: \d+ # \$\{LLM_TEXT_CONTEXT_SIZE\}') {
    $content = $content -replace 'context_size: \d+ # \$\{LLM_TEXT_CONTEXT_SIZE\}', 'context_size: ${LLM_TEXT_CONTEXT_SIZE}'
    Write-Host "Restored LLM_TEXT_CONTEXT_SIZE in $ComposeFile"
}

# Restore ${LLM_VISION_CONTEXT_SIZE} from inline values
if ($content -match 'context_size: \d+ # \$\{LLM_VISION_CONTEXT_SIZE\}') {
    $content = $content -replace 'context_size: \d+ # \$\{LLM_VISION_CONTEXT_SIZE\}', 'context_size: ${LLM_VISION_CONTEXT_SIZE}'
    Write-Host "Restored LLM_VISION_CONTEXT_SIZE in $ComposeFile"
}

Set-Content -Path $ComposeFile -Value $content -NoNewline

Write-Host "Restored environment variable syntax in $ComposeFile"