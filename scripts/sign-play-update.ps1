#requires -Version 7.0
param([string]$PackageDirectory = $PSScriptRoot)
$ErrorActionPreference = 'Stop'
# 배포 폴더의 무서명 AAB만 처리하며 키 생성·다운로드·교체는 하지 않는다.
$playDirectory = (Resolve-Path -LiteralPath $PackageDirectory).Path
$playInfo = Get-Content -LiteralPath (Join-Path $playDirectory 'build-info.json') -Raw | ConvertFrom-Json
$playBundle = Join-Path $playDirectory 'app-release.aab'
if ((Get-FileHash -LiteralPath $playBundle -Algorithm SHA256).Hash -ne $playInfo.sha256) { throw 'Bundle hash does not match build-info.json.' }
if ([string]$playInfo.versionCode -notmatch '^[1-9][0-9]{0,9}$') { throw 'Invalid build number.' }
if ($playInfo.expectedCertificateSha256 -ne 'f5ad3a778d18b33973938b40f5b93f604c0cb099095a9875b09aa4f0c57a98bd') { throw 'Expected Play upload certificate differs from the build24 release.' }
$playOutput = Join-Path $playDirectory ('skyard-build' + $playInfo.versionCode + '-play-signed.aab')
& (Join-Path $PSScriptRoot 'sign-aab.ps1') -Bundle $playBundle -Output $playOutput -ExpectedCertificateSha256 $playInfo.expectedCertificateSha256
Write-Output "Verified Play upload bundle: $playOutput"
