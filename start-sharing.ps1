$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$taskNode = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
if (-not (Test-Path -LiteralPath $taskNode)) { $taskNode = (Get-Command node).Source }
if (Get-NetTCPConnection -LocalPort 8790 -State Listen -ErrorAction SilentlyContinue) { Write-Host 'Gateway already running. Existing tunnel must also remain active.'; exit 0 }
if (-not (Test-Path -LiteralPath '.local/gateway.env')) { throw 'Gateway credentials are not configured.' }
Start-Process -FilePath $taskNode -ArgumentList @('--env-file=.local/gateway.env','gateway.mjs') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput '.local/gateway.stdout.log' -RedirectStandardError '.local/gateway.stderr.log'
Start-Process -FilePath (Join-Path $PSScriptRoot '.local/cloudflared.exe') -ArgumentList @('tunnel','--no-autoupdate','--protocol','http2','--url','http://127.0.0.1:8790') -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput '.local/tunnel.stdout.log' -RedirectStandardError '.local/tunnel.stderr.log'
Write-Host 'Sharing bridge started. If restarted, update the cloud CODEX_GATEWAY_URL to the new trycloudflare URL in .local/tunnel.stderr.log.'
