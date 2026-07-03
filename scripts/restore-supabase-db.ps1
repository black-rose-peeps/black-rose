# Restore supabase/backups/*.sql into any Supabase project (staging, new prod, etc.).
#
# Passwords with @ or other special chars are OK (uses PGPASSWORD, not a URI).
#
# Usage:
#   .\scripts\restore-supabase-db.ps1 `
#     -ProjectRef "your-project-ref" `
#     -UseDirectConnection `
#     -PoolerHost "unused" `
#     -Password "your-db-password"
#
# Session pooler (Dashboard -> Connect -> Session pooler -> copy host only):
#   .\scripts\restore-supabase-db.ps1 `
#     -ProjectRef "your-project-ref" `
#     -PoolerHost "aws-1-ap-northeast-1.pooler.supabase.com" `
#     -Password "your-db-password"
#
# Requires: psql on PATH, dumps in supabase/backups/

param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,
  [Parameter(Mandatory = $true)]
  [string]$Password,
  [Parameter(Mandatory = $true)]
  [string]$PoolerHost,
  [int]$Port = 5432,
  [switch]$IncludeRoles,
  [switch]$UseDirectConnection
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Backups = Join-Path $Root "supabase\backups"

foreach ($file in @("schema.sql", "data.sql")) {
  $path = Join-Path $Backups $file
  if (-not (Test-Path $path)) {
    throw "Missing $path. Run the supabase db dump commands first."
  }
}

if ($UseDirectConnection) {
  $PgHost = "db.$ProjectRef.supabase.co"
  $PgUser = "postgres"
} else {
  $hostInput = $PoolerHost.Trim()
  if ($hostInput -match '^postgres(?:ql)?://') {
    try {
      $uri = [Uri]$hostInput
      $PgHost = $uri.Host
      if ($uri.Port -gt 0) {
        $Port = $uri.Port
      }
    } catch {
      throw "Could not parse -PoolerHost URI. Pass only the hostname, e.g. aws-1-ap-northeast-1.pooler.supabase.com"
    }
  } else {
    $PgHost = $hostInput -replace '^https?://', ''
    if ($PgHost -match '^([^/]+)') {
      $PgHost = $Matches[1]
    }
  }
  $PgUser = "postgres.$ProjectRef"
}

function Invoke-Psql {
  param(
    [string[]]$ExtraArgs
  )
  $env:PGPASSWORD = $Password
  try {
    & psql -h $PgHost -p $Port -U $PgUser -d postgres @ExtraArgs
    if ($LASTEXITCODE -ne 0) {
      throw "psql exited with code $LASTEXITCODE"
    }
  } finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

Write-Host "Target: $PgUser @ ${PgHost}:${Port}/postgres (project $ProjectRef)"

Push-Location $Root
try {
  if ($IncludeRoles) {
    $rolesPath = Join-Path $Backups "roles.sql"
    if ((Test-Path $rolesPath) -and (Get-Item $rolesPath).Length -gt 0) {
      Write-Host "Applying roles.sql ..."
      Invoke-Psql @("--single-transaction", "--variable", "ON_ERROR_STOP=1", "--file", $rolesPath)
    } else {
      Write-Host "Skipping empty or missing roles.sql"
    }
  }

  Write-Host "Applying schema.sql ..."
  Invoke-Psql @(
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--file", (Join-Path $Backups "schema.sql")
  )

  Write-Host "Applying data.sql (session_replication_role=replica) ..."
  Invoke-Psql @(
    "--single-transaction",
    "--variable", "ON_ERROR_STOP=1",
    "--command", "SET session_replication_role = replica",
    "--file", (Join-Path $Backups "data.sql")
  )

  Write-Host "Restore finished. Verify row counts in the Supabase SQL editor."
} finally {
  Pop-Location
}
