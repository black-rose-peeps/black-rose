# Restore prod dumps (supabase/backups/*.sql) into the dev/staging Supabase project.
#
# Passwords with @ or other special chars are OK (uses PGPASSWORD, not a URI).
#
# Usage:
#   1. Dashboard -> project xjwugbbrqpwnenmlrkdh -> Connect -> Session pooler
#      Copy the Host (e.g. aws-0-ap-southeast-1.pooler.supabase.com) -- NOT the literal "...."
#   2. Settings -> Database -> copy the database password
#   3. Run (host only — or paste the full URI from Connect; script extracts the host):
#        .\scripts\restore-staging-db.ps1 `
#          -PoolerHost "aws-1-ap-northeast-1.pooler.supabase.com" `
#          -Password "your-db-password"
#
# Requires: psql on PATH, dumps in supabase/backups/

param(
  [string]$ProjectRef = "xjwugbbrqpwnenmlrkdh",
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
  # Accept either "aws-1-ap-northeast-1.pooler.supabase.com" or a pasted postgres URI.
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
    # Drop accidental path suffix if someone pasted host/db
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

Write-Host "Target: $PgUser @ ${PgHost}:${Port}/postgres"

Push-Location $Root
try {
  if ($IncludeRoles) {
    $rolesPath = Join-Path $Backups "roles.sql"
    if ((Get-Item $rolesPath).Length -gt 0) {
      Write-Host "Applying roles.sql ..."
      Invoke-Psql @("--single-transaction", "--variable", "ON_ERROR_STOP=1", "--file", $rolesPath)
    } else {
      Write-Host "Skipping empty roles.sql"
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
