param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [string]$Confirm = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'read-env.ps1')

if (-not (Test-Path -LiteralPath $BackupFile -PathType Leaf)) {
  throw "Backup file not found: $BackupFile"
}

$dbHost = Get-DbSetting -Name 'DB_HOST' -Default '127.0.0.1'
$dbPort = Get-DbSetting -Name 'DB_PORT' -Default '3306'
$dbUser = Get-DbSetting -Name 'DB_USER'
$dbPassword = Get-DbSetting -Name 'DB_PASSWORD'
$dbName = Get-DbSetting -Name 'DB_NAME' -Default 'eventhub_cpc'

if (-not $dbUser -or -not $dbName) {
  throw 'DB_USER and DB_NAME must be set in .env before restoring.'
}

Write-Warning "This will overwrite the '$dbName' database from: $BackupFile"
if ($Confirm -ne 'YES') {
  $answer = Read-Host "Type YES to continue"
  if ($answer -ne 'YES') {
    'Restore cancelled.'
    exit 1
  }
}

$mysqlTool = Resolve-DatabaseTool -Executable 'mysql.exe'
$env:MYSQL_PWD = $dbPassword
try {
  Get-Content -LiteralPath $BackupFile -Raw |
    & $mysqlTool `
      "--host=$dbHost" `
      "--port=$dbPort" `
      "--user=$dbUser" `
      '--default-character-set=utf8mb4'

  if ($LASTEXITCODE -ne 0) {
    throw "mysql restore failed with exit code $LASTEXITCODE."
  }
}
finally {
  Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}

"Restore complete for database: $dbName"
