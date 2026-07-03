# Back-compat wrapper — restores prod dumps into the staging dev project.
# For any other project ref, use restore-supabase-db.ps1 directly.
#
# Usage:
#   .\scripts\restore-staging-db.ps1 `
#     -UseDirectConnection `
#     -PoolerHost "unused" `
#     -Password "your-db-password"

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

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$args = @(
  "-ProjectRef", $ProjectRef,
  "-Password", $Password,
  "-PoolerHost", $PoolerHost,
  "-Port", $Port
)
if ($IncludeRoles) { $args += "-IncludeRoles" }
if ($UseDirectConnection) { $args += "-UseDirectConnection" }

& (Join-Path $scriptDir "restore-supabase-db.ps1") @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
