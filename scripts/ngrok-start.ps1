# chatapp/scripts/ngrok-start.ps1
# Run via: pnpm tunnel (from monorepo root)

Write-Host "🚇 Starting ngrok tunnel on port 4000..." -ForegroundColor Cyan

# Kill any existing ngrok instances to avoid port 4040 conflicts
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1

# Start ngrok directly — no config file needed
$ngrokProcess = Start-Process -FilePath "ngrok" `
  -ArgumentList "http", "4000" `
  -PassThru -WindowStyle Minimized

Write-Host "⏳ Waiting for ngrok to be ready..." -ForegroundColor Yellow

# Poll ngrok local API — up to 15 seconds
$maxRetries = 15
$retryCount = 0
$backendUrl = $null

while ($retryCount -lt $maxRetries) {
  Start-Sleep -Seconds 1
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop
    $tunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
    if ($tunnel) {
      $backendUrl = $tunnel.public_url
      break
    }
  } catch {
    # not ready yet, keep polling
  }
  $retryCount++
  Write-Host "  ...retrying ($retryCount/$maxRetries)" -ForegroundColor DarkGray
}

if (-not $backendUrl) {
  Write-Host "❌ Could not get tunnel URL after $maxRetries seconds." -ForegroundColor Red
  Write-Host "   Try running manually: ngrok http 4000" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "✅ Tunnel active:" -ForegroundColor Green
Write-Host "   Backend → $backendUrl" -ForegroundColor White

# Resolve monorepo root (script is in /scripts/, root is one level up)
$root = Split-Path $PSScriptRoot -Parent

# ── Patch backend/.env.development ──────────────────────────────────────────
$backendEnv = Join-Path $root "apps\backend\.env.development"
if (Test-Path $backendEnv) {
  $content = Get-Content $backendEnv -Raw
  if ($content -match "NGROK_URL=.*") {
    $content = $content -replace "NGROK_URL=.*", "NGROK_URL=$backendUrl"
  } else {
    $content = $content.TrimEnd() + "`nNGROK_URL=$backendUrl"
  }
  Set-Content $backendEnv $content -NoNewline
  Write-Host "📝 Patched backend/.env.development → NGROK_URL" -ForegroundColor DarkGreen
} else {
  Write-Host "⚠️  backend/.env.development not found, skipping." -ForegroundColor Yellow
}

# ── Patch mobile/.env ────────────────────────────────────────────────────────
$mobileEnv = Join-Path $root "apps\mobile\.env"
$mobileEnvExample = Join-Path $root "apps\mobile\.env.example"
$targetMobileEnv = if (Test-Path $mobileEnv) { $mobileEnv } else { $mobileEnvExample }

if (Test-Path $targetMobileEnv) {
  $content = (Get-Content $targetMobileEnv -Raw) ?? ""
  if ($content -match "EXPO_PUBLIC_API_URL=.*") {
    $content = $content -replace "EXPO_PUBLIC_API_URL=.*", "EXPO_PUBLIC_API_URL=$backendUrl"
  } else {
    $content = $content.TrimEnd() + "`nEXPO_PUBLIC_API_URL=$backendUrl"
  }
  Set-Content $targetMobileEnv $content -NoNewline
  Write-Host "📝 Patched mobile/.env → EXPO_PUBLIC_API_URL" -ForegroundColor DarkGreen
} else {
  Write-Host "⚠️  mobile/.env not found, skipping." -ForegroundColor Yellow
}

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "  Share with teammates / mobile devices:" -ForegroundColor Cyan
Write-Host "  $backendUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Web stays on → http://localhost:4000 (local only)" -ForegroundColor DarkGray
Write-Host "  Mobile reads → EXPO_PUBLIC_API_URL (patched above)" -ForegroundColor DarkGray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "⚠️  Now restart your dev servers to pick up new URLs!" -ForegroundColor Magenta
Write-Host "🔍 Traffic inspector → http://localhost:4040" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Press Ctrl+C to stop ngrok..." -ForegroundColor DarkGray

# Keep script alive — Ctrl+C will kill ngrok cleanly
try {
  Wait-Process -Id $ngrokProcess.Id
} catch {
  Write-Host "`n🛑 ngrok stopped." -ForegroundColor Red
}