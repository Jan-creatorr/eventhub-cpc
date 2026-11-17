param(
  [string]$OutputDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) 'backups')
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'read-env.ps1')

$dbHost = Get-DbSetting -Name 'DB_HOST' -Default '127.0.0.1'
$dbPort = Get-DbSetting -Name 'DB_PORT' -Default '3306'
$dbUser = Get-DbSetting -Name 'DB_USER'
$dbPassword = Get-DbSetting -Name 'DB_PASSWORD'
$dbName = Get-DbSetting -Name 'DB_NAME' -Default 'eventhub_cpc'

if (-not $dbUser -or -not $dbName) {
  throw 'DB_USER and DB_NAME must be set in .env before backing up.'
}

$dumpTool = Resolve-DatabaseTool -Executable 'mysqldump.exe'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path -LiteralPath $projectRoot -PathType Container)) {
  throw "Project root not found: $projectRoot"
}
if (-not (Test-Path -LiteralPath $OutputDirectory)) {
  New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupFile = Join-Path $OutputDirectory "$dbName-$timestamp.sql"

$env:MYSQL_PWD = $dbPassword
try {
  & $dumpTool `
    "--host=$dbHost" `
    "--port=$dbPort" `
    "--user=$dbUser" `
    '--databases' $dbName `
    '--single-transaction' `
    '--routines' `
    '--events' `
    '--triggers' `
    '--no-tablespaces' `
    '--default-character-set=utf8mb4' `
    "--result-file=$backupFile"

  if ($LASTEXITCODE -ne 0) {
    throw "mysqldump failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}

$hash = (Get-FileHash -LiteralPath $backupFile -Algorithm SHA256).Hash
"Backup created: $backupFile"
"SHA256: $hash"
