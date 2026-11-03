$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
$listener = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
if ($listener) { Write-Host 'Demo already listening at http://127.0.0.1:8787'; exit 0 }
$taskNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node).Source }
$taskArgs = @()
if (Test-Path -LiteralPath (Join-Path $taskRoot '.env')) { $taskArgs += '--env-file=.env' }
$taskArgs += 'server.mjs'
Start-Process -FilePath $taskNode -ArgumentList $taskArgs -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskRoot 'demo.stdout.log') -RedirectStandardError (Join-Path $taskRoot 'demo.stderr.log')
Write-Host 'Demo starting at http://127.0.0.1:8787'
