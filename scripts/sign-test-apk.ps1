#requires -Version 7.0
param(
  [Parameter(Mandatory=$true)][string]$Apk,
  [Parameter(Mandatory=$true)][string]$Output,
  [string]$JdkPath = $env:JAVA_HOME,
  [switch]$CreateNewKey,
  [ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedCertificateSha256
)
$ErrorActionPreference = 'Stop'
if (-not $JdkPath) {
  $JdkPath = (Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'skylog-tools') -Directory -Filter 'jdk-*' | Select-Object -First 1).FullName
}
$keytool = Join-Path $JdkPath 'bin/keytool.exe'
if (-not (Test-Path -LiteralPath $keytool)) { throw 'JDK 21+ is required.' }
if (-not (Test-Path -LiteralPath $Apk)) { throw 'Input APK does not exist.' }
if (Test-Path -LiteralPath $Output) { throw 'Output APK already exists.' }
# 개인 체험용 키. Play 업로드 키와 별도로 보관하며 스토어 키 복원 상태를 바꾸지 않는다.
$testSigningDir = Join-Path $env:LOCALAPPDATA 'skylog-local-test-signing'
$testKey = Join-Path $testSigningDir 'skylog-local-test.p12'
$testPassword = Join-Path $testSigningDir 'password.dpapi.xml'
if (-not (Test-Path -LiteralPath $testKey) -and -not $CreateNewKey) {
  throw 'The existing personal-test key is missing. Run on the original signing PC or restore its key/password. A new key cannot update the installed APK; -CreateNewKey is only for a deliberate FIRST install.'
}
New-Item -ItemType Directory -Force -Path $testSigningDir | Out-Null
$testAcl = [Security.AccessControl.DirectorySecurity]::new()
$testAcl.SetAccessRuleProtection($true, $false)
$testIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$testAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($testIdentity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
[IO.FileSystemAclExtensions]::SetAccessControl([IO.DirectoryInfo]::new($testSigningDir), $testAcl)
if ((Test-Path -LiteralPath $testKey) -ne (Test-Path -LiteralPath $testPassword)) { throw 'Test signing material is incomplete. Restore both files.' }
try {
  if (-not (Test-Path -LiteralPath $testKey)) {
    $env:SKYLOG_TEST_PASSWORD = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    & $keytool -genkeypair -noprompt -keystore $testKey -storetype PKCS12 -storepass:env SKYLOG_TEST_PASSWORD -keypass:env SKYLOG_TEST_PASSWORD -alias skylog-local-test -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=Skylog Local Test,OU=Personal Testing,O=Skylog,C=KR'
    if ($LASTEXITCODE -ne 0) { throw 'Test key creation failed.' }
    ConvertTo-SecureString $env:SKYLOG_TEST_PASSWORD -AsPlainText -Force | Export-Clixml -LiteralPath $testPassword
  }
} finally {
  Remove-Item Env:SKYLOG_TEST_PASSWORD -ErrorAction SilentlyContinue
}
$testArguments = @{ Apk=$Apk; Output=$Output; JdkPath=$JdkPath; Keystore=$testKey; PasswordFile=$testPassword; KeyAlias='skylog-local-test' }
if ($ExpectedCertificateSha256) { $testArguments.ExpectedCertificateSha256 = $ExpectedCertificateSha256 }
& (Join-Path $PSScriptRoot 'sign-apk.ps1') @testArguments
