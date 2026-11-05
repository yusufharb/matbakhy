# ==============================================================================
# Marketplace Core — Automated Fork Generator (PowerShell)
# ==============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Name,

    [Parameter(Mandatory=$false)]
    [string]$Slug,

    [Parameter(Mandatory=$false)]
    [string]$Preset,

    [Parameter(Mandatory=$false)]
    [string]$Currency,

    [Parameter(Mandatory=$false)]
    [string]$Locale = "ar",

    [Parameter(Mandatory=$false)]
    [string]$OutputDir
)

$ErrorActionPreference = "Stop"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   NEXUS Marketplace Core -- Fork and New Project Initializer    " -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not $Name) {
    $Name = Read-Host "1. Enter New Marketplace Name (e.g. BasketPort, SouqGlobal, PharmaCore)"
    if (-not $Name) { $Name = "MyMarketplace" }
}

if (-not $Slug) {
    $defaultSlug = ($Name -replace '[^a-zA-Z0-9]', '').ToLower()
    $Slug = Read-Host "2. Enter Project Slug [$defaultSlug]"
    if (-not $Slug) { $Slug = $defaultSlug }
}

if (-not $Preset) {
    Write-Host "`nSelect Business Vertical Preset:" -ForegroundColor Green
    Write-Host "  1: b2b_wholesale   - B2B Bulk Marketplace (MOQ active, Price Tiers, Escrow, RFQ Quotes)"
    Write-Host "  2: b2c_retail      - B2C Multi-Vendor Retail (MOQ off, Fast Checkout, Reviews, Cards)"
    Write-Host "  3: food_grocery    - Food and Quick Commerce (Dark stores, Immediate routing, Fresh items)"
    Write-Host "  4: services_custom - Services and Freelance (Milestone escrow, Custom proposals)"
    $choice = Read-Host "Choose [1-4] (Default: 1)"
    switch ($choice) {
        "2" { $Preset = "b2c_retail" }
        "3" { $Preset = "food_grocery" }
        "4" { $Preset = "services_custom" }
        Default { $Preset = "b2b_wholesale" }
    }
}

if (-not $Currency) {
    $Currency = Read-Host "3. Default Base Currency (SAR / USD / EGP / AED / EUR) [SAR]"
    if (-not $Currency) { $Currency = "SAR" }
}

$coreRoot = (Get-Item $PSScriptRoot).Parent.FullName

if (-not $OutputDir) {
    $suggestedPath = Join-Path (Split-Path -Parent $coreRoot) $Name
    $OutputDir = Read-Host "4. Target Directory for New Project [$suggestedPath]"
    if (-not $OutputDir) { $OutputDir = $suggestedPath }
}

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDir)

Write-Host "`n-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Initializing Fork with configuration:" -ForegroundColor Cyan
Write-Host "  - Marketplace Name : $Name" -ForegroundColor White
Write-Host "  - Project Slug     : $Slug" -ForegroundColor White
Write-Host "  - Business Preset  : $Preset" -ForegroundColor White
Write-Host "  - Default Currency : $Currency" -ForegroundColor White
Write-Host "  - Default Locale   : $Locale (Cairo Arabic font enabled)" -ForegroundColor White
Write-Host "  - Target Directory : $resolvedOutput" -ForegroundColor White
Write-Host "-----------------------------------------------------------------`n" -ForegroundColor Gray

if (Test-Path $resolvedOutput) {
    $overwrite = Read-Host "Target directory '$resolvedOutput' already exists. Continue and update? (y/n)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 1
    }
} else {
    New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
}

Write-Host "Step 1/5: Copying core engine files (excluding build caches and temp files)..." -ForegroundColor Green

$excludeDirs = @("node_modules", ".git", "bin", "dist", "pgdata", ".vscode", ".idea", "scratch")
$excludeFiles = @("*.exe", "*.log", "test_*.json", "patch_*.json")

$robocopyArgs = @(
    $coreRoot,
    $resolvedOutput,
    "/E",
    "/XD"
) + $excludeDirs + @("/XF") + $excludeFiles + @("/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np")

& robocopy @robocopyArgs | Out-Null

Write-Host "Step 2/5: Customizing environment files (.env)..." -ForegroundColor Green

$rootEnvLines = @(
    "PLATFORM_NAME=""$Name""",
    "PLATFORM_SLUG=""$Slug""",
    "BUSINESS_PRESET=""$Preset""",
    "DEFAULT_CURRENCY=""$Currency""",
    "DEFAULT_LOCALE=""$Locale""",
    "",
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=postgres",
    "POSTGRES_DB=marketplace_$Slug",
    "POSTGRES_PORT=5432",
    "",
    "API_PORT=8080",
    "DATABASE_URL=postgres://postgres:postgres@localhost:5432/marketplace_$Slug?sslmode=disable",
    "",
    "FRONTEND_PORT=5173",
    "VITE_API_URL=http://localhost:8080/api/v1"
)
$rootEnvContent = $rootEnvLines -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $resolvedOutput ".env"), $rootEnvContent, [System.Text.Encoding]::UTF8)

$backendEnvLines = @(
    "PORT=8080",
    "ENV=development",
    "DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/marketplace_$Slug?sslmode=disable",
    "DB_MAX_CONNS=25",
    "DB_MIN_CONNS=5",
    "DB_MAX_IDLE_TIME=30m",
    "REDIS_URL=redis://127.0.0.1:6379/0",
    "NATS_URL=nats://127.0.0.1:4222",
    "JWT_SECRET=${Slug}-enterprise-marketplace-secret-change-in-prod",
    "JWT_EXPIRATION_HOURS=24"
)
$backendEnvContent = $backendEnvLines -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $resolvedOutput "backend\.env"), $backendEnvContent, [System.Text.Encoding]::UTF8)

$frontendEnvLines = @(
    "VITE_API_URL=http://localhost:8080/api/v1",
    "VITE_DEFAULT_PORTAL=merchant",
    "VITE_DEFAULT_LOCALE=$Locale",
    "VITE_APP_TITLE=""$Name Marketplace"""
)
$frontendEnvContent = $frontendEnvLines -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $resolvedOutput "Marketplace Admin Dashboard\.env"), $frontendEnvContent, [System.Text.Encoding]::UTF8)

Write-Host "Step 3/5: Configuring business preset feature flags..." -ForegroundColor Green

$moqValue = if ($Preset -eq "b2b_wholesale") { "true" } else { "false" }
$rfqValue = if ($Preset -eq "b2b_wholesale" -or $Preset -eq "services_custom") { "true" } else { "false" }
$reviewsValue = if ($Preset -eq "b2c_retail" -or $Preset -eq "services_custom") { "true" } else { "true" }
$multiWhValue = if ($Preset -eq "food_grocery" -or $Preset -eq "b2b_wholesale") { "true" } else { "false" }

$presetSql = @"

-- ==============================================================================
-- FORK SPECIFIC OVERRIDES: $Name ($Preset)
-- ==============================================================================
UPDATE platform.configurations SET value = '$Name' WHERE key = 'marketplace.name';
UPDATE platform.configurations SET value = '$Currency' WHERE key = 'marketplace.base_currency';
UPDATE platform.configurations SET value = '$Locale' WHERE key = 'marketplace.default_language';
UPDATE platform.configurations SET value = '$moqValue' WHERE key = 'features.moq';
UPDATE platform.configurations SET value = '$rfqValue' WHERE key = 'features.rfq';
UPDATE platform.configurations SET value = '$reviewsValue' WHERE key = 'features.reviews';
UPDATE platform.configurations SET value = '$multiWhValue' WHERE key = 'features.multi_warehouse';
"@

$seedPath = Join-Path $resolvedOutput "backend\db\seeds\seed_data.sql"
if (Test-Path $seedPath) {
    [System.IO.File]::AppendAllText($seedPath, $presetSql, [System.Text.Encoding]::UTF8)
}

Write-Host "Step 4/5: Generating tailored README for this fork..." -ForegroundColor Green

$forkReadmeLines = @(
    "# $Name -- Marketplace Platform",
    "",
    "> Tailored deployment based on NEXUS Marketplace Core",
    "> Business Vertical: $Preset",
    "> Base Currency: $Currency | Primary Language: $Locale (Cairo Arabic font)",
    "",
    "---",
    "",
    "## Quick Start",
    "",
    "### 1. Start Infrastructure (PostgreSQL 16, Redis, NATS)",
    "```bash",
    "docker compose -f deploy/docker-compose.yml up -d",
    "```",
    "",
    "### 2. Start Backend API",
    "```bash",
    "cd backend",
    "go run ./cmd/api",
    "```",
    "",
    "### 3. Start Frontend Dashboard and Storefront",
    "```bash",
    "cd ""Marketplace Admin Dashboard""",
    "npm install",
    "npm run dev",
    "```",
    "",
    "---",
    "",
    "## Syncing Upstream Core Updates",
    "```bash",
    "git remote add upstream ""$coreRoot""",
    "git fetch upstream",
    "git merge upstream/main --allow-unrelated-histories",
    "```"
)
$forkReadmeContent = $forkReadmeLines -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $resolvedOutput "README.md"), $forkReadmeContent, [System.Text.Encoding]::UTF8)

Write-Host "Step 5/5: Initializing Git repository and linking upstream..." -ForegroundColor Green

Push-Location $resolvedOutput
try {
    if (-not (Test-Path ".git")) {
        git init --quiet
        git branch -M main
        git add .
        git commit -m "feat: initial commit for $Name ($Preset) from Marketplace Core" --quiet
        git remote add upstream "$coreRoot"
        Write-Host "  [OK] New Git repository initialized on branch 'main'" -ForegroundColor DarkGreen
        Write-Host "  [OK] 'upstream' remote configured pointing to core repository" -ForegroundColor DarkGreen
    }
} catch {
    Write-Warning "Git initialization note: $_"
} finally {
    Pop-Location
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "   SUCCESS: $Name is ready at: $resolvedOutput" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "`nNext steps to launch:" -ForegroundColor Yellow
Write-Host "  1. cd `"$resolvedOutput`""
Write-Host "  2. cd `"Marketplace Admin Dashboard`" && npm install && npm run dev"
Write-Host "  3. Create remote repository on GitHub: https://github.com/new"
Write-Host "  4. git remote add origin https://github.com/<your-org>/$Slug.git"
Write-Host "  5. git push -u origin main"
Write-Host ""
