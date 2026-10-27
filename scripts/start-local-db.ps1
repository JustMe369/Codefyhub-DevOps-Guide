$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDirectory = Join-Path $projectRoot ".local\postgres-data"
$logFile = Join-Path $projectRoot ".local\postgres.log"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"

if (-not (Test-Path -LiteralPath $pgCtl)) {
    throw "PostgreSQL 18 was not found at $pgCtl. Use Docker Compose instead."
}

if (-not (Test-Path -LiteralPath (Join-Path $dataDirectory "PG_VERSION"))) {
    throw "The project-local database has not been initialized. Follow README.md or use Docker Compose."
}

& $pgCtl -D $dataDirectory status 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Output "The DevOps Guide database is already running on 127.0.0.1:5433."
    exit 0
}

& $pgCtl -D $dataDirectory -l $logFile -o '-p 5433 -h 127.0.0.1' start
if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL did not start. Review $logFile."
}

Write-Output "The DevOps Guide database is running on 127.0.0.1:5433."
