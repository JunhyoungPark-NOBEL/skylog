#requires -Version 7.0
param(
  [Parameter(Mandatory=$true)][string]$Apk,
  [Parameter(Mandatory=$true)][string]$Output,
  [string]$SdkPath = $env:ANDROID_HOME,
  [string]$JdkPath = $env:JAVA_HOME,
  [string]$Keystore = (Join-Path $env:LOCALAPPDATA 'skylog-signing/skylog-upload.p12'),
  [string]$PasswordFile = (Join-Path $env:LOCALAPPDATA 'skylog-signing/password.dpapi.xml'),
  [string]$KeyAlias = 'skylog-upload',
  [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedCertificateSha256
)
$ErrorActionPreference = 'Stop'
if (-not $SdkPath) { $SdkPath = Join-Path $env:LOCALAPPDATA 'skylog-tools/android-sdk' }
if (-not $JdkPath) {
  $JdkPath = (Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'skylog-tools') -Directory -Filter 'jdk-*' | Select-Object -First 1).FullName
}
$skylogBuildTools = Join-Path $SdkPath 'build-tools/36.0.0'
$skylogAlign = Join-Path $skylogBuildTools 'zipalign.exe'
$skylogSigner = Join-Path $skylogBuildTools 'apksigner.bat'
foreach ($tool in @($skylogAlign, $skylogSigner, (Join-Path $JdkPath 'bin/java.exe'))) {
  if (-not (Test-Path -LiteralPath $tool)) { throw "Missing tool: $tool" }
}
$skylogKey = $Keystore
$skylogPasswordFile = $PasswordFile
# AAB와 같은 기존 키만 사용한다. 키 복원 여부를 확인하기 전에 새 키를 만들지 않는다.
if (-not (Test-Path -LiteralPath $skylogKey) -or -not (Test-Path -LiteralPath $skylogPasswordFile)) {
  throw 'Restore the upload key and DPAPI password, or create the first key with sign-aab.ps1 before signing an APK.'
}
$skylogInput = (Resolve-Path -LiteralPath $Apk).Path
$skylogOutput = [IO.Path]::GetFullPath($Output)
if (Test-Path -LiteralPath $skylogOutput) { throw 'Choose a new output filename; an existing APK will not be overwritten.' }
if (-not (Test-Path -LiteralPath (Split-Path -Parent $skylogOutput))) { throw 'Create the output directory first.' }
$skylogTemp = $skylogOutput + '.' + [guid]::NewGuid().ToString('N') + '.tmp.apk'
$skylogPreviousJava = $env:JAVA_HOME
try {
  $env:JAVA_HOME = $JdkPath
  $skylogSecure = Import-Clixml -LiteralPath $skylogPasswordFile
  $env:SKYLOG_UPLOAD_PASSWORD = [Net.NetworkCredential]::new('', $skylogSecure).Password
  & $skylogAlign -P 16 4 $skylogInput $skylogTemp
  if ($LASTEXITCODE -ne 0) { throw 'APK alignment failed.' }
  & $skylogSigner sign --ks $skylogKey --ks-key-alias $KeyAlias --ks-pass env:SKYLOG_UPLOAD_PASSWORD --key-pass env:SKYLOG_UPLOAD_PASSWORD --v4-signing-enabled false $skylogTemp
  if ($LASTEXITCODE -ne 0) { throw 'APK signing failed.' }
  $skylogVerification = & $skylogSigner verify --verbose --print-certs $skylogTemp
  if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
  $skylogVerification | Write-Output
  if ($ExpectedCertificateSha256) {
    $skylogCertMatch = [regex]::Match(($skylogVerification -join "`n"), 'Signer #1 certificate SHA-256 digest: ([a-fA-F0-9]{64})')
    if (-not $skylogCertMatch.Success -or $skylogCertMatch.Groups[1].Value -ne $ExpectedCertificateSha256) {
      throw 'Certificate mismatch: this key cannot update the existing APK. No installable output was published.'
    }
  }
  & $skylogAlign -c -P 16 4 $skylogTemp
  if ($LASTEXITCODE -ne 0) { throw 'Signed APK alignment verification failed.' }
  Move-Item -LiteralPath $skylogTemp -Destination $skylogOutput
  Get-FileHash -LiteralPath $skylogOutput -Algorithm SHA256
} finally {
  Remove-Item Env:SKYLOG_UPLOAD_PASSWORD -ErrorAction SilentlyContinue
  $env:JAVA_HOME = $skylogPreviousJava
  if (Test-Path -LiteralPath $skylogTemp) { Remove-Item -LiteralPath $skylogTemp -Force }
}
