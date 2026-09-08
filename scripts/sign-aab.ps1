#requires -Version 7.0
param(
  [Parameter(Mandatory=$true)][string]$Bundle,
  [Parameter(Mandatory=$true)][string]$Output,
  [string]$JdkPath = $env:JAVA_HOME
)
$ErrorActionPreference = 'Stop'
if (-not $JdkPath) {
  $JdkPath = (Get-ChildItem -LiteralPath (Join-Path $env:LOCALAPPDATA 'skylog-tools') -Directory -Filter 'jdk-*' | Select-Object -First 1).FullName
}
if (-not (Test-Path -LiteralPath (Join-Path $JdkPath 'bin/keytool.exe'))) { throw 'Set JAVA_HOME to a JDK 21+ installation.' }
$skylogSigningDir = Join-Path $env:LOCALAPPDATA 'skylog-signing'
New-Item -ItemType Directory -Force -Path $skylogSigningDir | Out-Null
$skylogAcl = [System.Security.AccessControl.DirectorySecurity]::new()
$skylogAcl.SetAccessRuleProtection($true, $false)
$skylogIdentity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$skylogRule = New-Object System.Security.AccessControl.FileSystemAccessRule($skylogIdentity,'FullControl','ContainerInherit,ObjectInherit','None','Allow')
$skylogAcl.AddAccessRule($skylogRule)
# Set-Acl이 감사 권한까지 요청하는 환경에서도 접근 권한(DACL)만 적용한다.
[System.IO.FileSystemAclExtensions]::SetAccessControl([System.IO.DirectoryInfo]::new($skylogSigningDir), $skylogAcl)
$skylogKey = Join-Path $skylogSigningDir 'skylog-upload.p12'
$skylogPasswordFile = Join-Path $skylogSigningDir 'password.dpapi.xml'
if ((Test-Path -LiteralPath $skylogKey) -ne (Test-Path -LiteralPath $skylogPasswordFile)) { throw 'Signing material is incomplete. Restore it; do not overwrite an existing upload key.' }
$skylogInput = (Resolve-Path -LiteralPath $Bundle).Path
if (Test-Path -LiteralPath $Output) { throw 'Choose a new output filename; an existing signed bundle will not be overwritten.' }
try {
  if (-not (Test-Path -LiteralPath $skylogKey)) {
    $skylogRandom = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($skylogRandom)
    $env:SKYLOG_UPLOAD_PASSWORD = [Convert]::ToBase64String($skylogRandom)
    & (Join-Path $JdkPath 'bin/keytool.exe') -genkeypair -noprompt -keystore $skylogKey -storetype PKCS12 -storepass:env SKYLOG_UPLOAD_PASSWORD -keypass:env SKYLOG_UPLOAD_PASSWORD -alias skylog-upload -keyalg RSA -keysize 4096 -validity 10000 -dname 'CN=Skylog Upload,OU=Mobile,O=Skylog,C=KR'
    if ($LASTEXITCODE -ne 0) { throw 'Key generation failed.' }
    ConvertTo-SecureString $env:SKYLOG_UPLOAD_PASSWORD -AsPlainText -Force | Export-Clixml -LiteralPath $skylogPasswordFile
  } else {
    $skylogSecure = Import-Clixml -LiteralPath $skylogPasswordFile
    $env:SKYLOG_UPLOAD_PASSWORD = [System.Net.NetworkCredential]::new('', $skylogSecure).Password
  }
  Copy-Item -LiteralPath $skylogInput -Destination $Output
  & (Join-Path $JdkPath 'bin/jarsigner.exe') -keystore $skylogKey -storepass:env SKYLOG_UPLOAD_PASSWORD -keypass:env SKYLOG_UPLOAD_PASSWORD -sigalg SHA256withRSA -digestalg SHA-256 $Output skylog-upload
  if ($LASTEXITCODE -ne 0) { throw 'AAB signing failed.' }
  & (Join-Path $JdkPath 'bin/jarsigner.exe') -verify -strict -keystore $skylogKey -storepass:env SKYLOG_UPLOAD_PASSWORD $Output
  if ($LASTEXITCODE -ne 0) { throw 'AAB signature verification failed.' }
  & (Join-Path $JdkPath 'bin/keytool.exe') -exportcert -rfc -keystore $skylogKey -storepass:env SKYLOG_UPLOAD_PASSWORD -alias skylog-upload -file (Join-Path $skylogSigningDir 'upload-certificate.pem')
  if ($LASTEXITCODE -ne 0) { throw 'Certificate export failed.' }
  Get-FileHash -LiteralPath $Output -Algorithm SHA256
  Write-Output "Upload key location (private, never commit): $skylogSigningDir"
} finally {
  Remove-Item Env:SKYLOG_UPLOAD_PASSWORD -ErrorAction SilentlyContinue
}
