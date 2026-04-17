$ErrorActionPreference = "Stop"

$iscc = Get-Command "ISCC.exe" -ErrorAction SilentlyContinue

if (-not $iscc) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
      $iscc = [pscustomobject]@{ Source = $candidate }
      break
    }
  }
}

if (-not $iscc) {
  throw "Inno Setup nao encontrado. Instale com: winget install --id JRSoftware.InnoSetup -e"
}

& $iscc.Source "installer\FinancePro.iss"
