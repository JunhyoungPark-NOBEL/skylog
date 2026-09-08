#requires -Version 7.0
param([string]$PackageDirectory = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
# 배포 ZIP 안에서 실행한다. 비밀 키를 만들거나 다운로드하지 않는다.
$updateDirectory = (Resolve-Path -LiteralPath $PackageDirectory).Path
$updateInfo = Get-Content -LiteralPath (Join-Path $updateDirectory 'build-info.json') -Raw | ConvertFrom-Json
$updateApk = Join-Path $updateDirectory 'app-release-unsigned.apk'
if ((Get-FileHash -LiteralPath $updateApk -Algorithm SHA256).Hash -ne $updateInfo.sha256) {
  throw 'The unsigned APK hash does not match build-info.json.'
}
$oldCertificate = Get-Content -LiteralPath (Join-Path $updateDirectory 'build9-certificate.txt') -Raw
$certificateMatch = [regex]::Match($oldCertificate, 'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]{64})')
if (-not $certificateMatch.Success) { throw 'The verified build9 public certificate is missing.' }
if ([string]$updateInfo.versionCode -notmatch '^[1-9][0-9]{0,9}$') { throw 'Invalid build number.' }
$updateOutput = Join-Path $updateDirectory ('skylog-build' + $updateInfo.versionCode + '-update.apk')
& (Join-Path $PSScriptRoot 'sign-test-apk.ps1') -Apk $updateApk -Output $updateOutput -ExpectedCertificateSha256 $certificateMatch.Groups[1].Value
Write-Output "Verified update APK: $updateOutput"
