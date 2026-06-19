param(
  [string]$OutputPath = "delivery/no-cap-clean.zip"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path "$PSScriptRoot\..").Path
$output = Join-Path $root $OutputPath
$staging = Join-Path $root "delivery/staging"

$excluded = @(
  ".git",
  ".wrangler",
  ".dev.vars",
  "node_modules",
  "delivery",
  "*.zip",
  "*.log",
  "*.tmp",
  "*.bak"
)

if (Test-Path $staging) {
  Remove-Item -LiteralPath $staging -Recurse -Force
}
New-Item -ItemType Directory -Path $staging | Out-Null

Get-ChildItem -LiteralPath $root -Force | Where-Object {
  $name = $_.Name
  -not ($excluded | Where-Object { $name -like $_ })
} | ForEach-Object {
  Copy-Item -LiteralPath $_.FullName -Destination $staging -Recurse -Force
}

New-Item -ItemType Directory -Path (Split-Path $output -Parent) -Force | Out-Null
if (Test-Path $output) {
  Remove-Item -LiteralPath $output -Force
}
Compress-Archive -Path (Join-Path $staging "*") -DestinationPath $output -Force
Remove-Item -LiteralPath $staging -Recurse -Force

Write-Host "Created clean delivery zip: $output"
