param(
  [string]$EnvPath = (Join-Path (Split-Path -Parent $PSScriptRoot) '.env')
)

if (-not (Test-Path -LiteralPath $EnvPath -PathType Leaf)) {
  throw "Environment file not found: $EnvPath"
}

$script:DbSettings = @{}

foreach ($line in Get-Content -LiteralPath $EnvPath) {
  $trimmed = $line.Trim()
  if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }

  $separator = $trimmed.IndexOf('=')
  if ($separator -le 0) { continue }

  $key = $trimmed.Substring(0, $separator).Trim()
  $value = $trimmed.Substring($separator + 1).Trim()

  if ($value.Length -ge 2) {
    $isQuoted = ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
    if ($isQuoted) {
      $value = $value.Substring(1, $value.Length - 2)
    }
  }

  $script:DbSettings[$key] = $value
}

function Get-DbSetting {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Default = ''
  )

  if ($script:DbSettings.ContainsKey($Name) -and $script:DbSettings[$Name]) {
    return [string]$script:DbSettings[$Name]
  }
  return $Default
}

function Resolve-DatabaseTool {
  param([Parameter(Mandatory = $true)][string]$Executable)

  $command = Get-Command $Executable -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $candidates = @(
    (Join-Path 'C:\xampp\mysql\bin' $Executable),
    (Join-Path 'C:\Program Files\MySQL\MySQL Server 8.0\bin' $Executable),
    (Join-Path 'C:\Program Files\MySQL\MySQL Server 8.4\bin' $Executable)
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
  }

  throw "$Executable was not found. Add MySQL/MariaDB's bin folder to PATH or use the XAMPP default location."
}
