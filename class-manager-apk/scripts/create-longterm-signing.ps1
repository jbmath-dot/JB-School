# For a ONE-TIME migration when the old APK signing key is irretrievably lost.
# This new key CANNOT update old APKs; export JSON and uninstall the old app first.
# Run locally, not from a public GitHub runner. Keep a secure backup of the .jks.
param(
  [string]$KeyStorePath = "$env:LOCALAPPDATA\JBMath\ClassManagerSigning\class-manager-release.jks",
  [string]$Repository = "jbmath-dot/JB-School"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function PutSecret([string]$Name,[string]$Value) {
  $Value | & gh secret set $Name --repo $Repository
  if($LASTEXITCODE -ne 0) { throw "Failed to set GitHub Secret: $Name" }
}
if(-not (Get-Command keytool -ErrorAction SilentlyContinue)) { throw "Install JDK (keytool) first." }
if(-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "Install GitHub CLI and run gh auth login." }
& gh auth status 2>$null
if($LASTEXITCODE -ne 0){
  Write-Host "GitHub CLI 로그인이 필요합니다. 브라우저 인증을 시작합니다."
  & gh auth login --hostname github.com --web --git-protocol https
  if($LASTEXITCODE -ne 0){throw "GitHub CLI 인증이 완료되지 않았습니다."}
}
& gh auth status
if($LASTEXITCODE -ne 0){throw "GitHub CLI에 로그인되지 않았습니다."}
if(Test-Path -LiteralPath $KeyStorePath){throw "A key already exists at the destination. No existing keys will be overwritten."}

Write-Host "WARNING: A NEW signing key cannot update previously installed debug APKs."
Write-Host "Before installing a new APK you must back up seating and attendance JSON, uninstall old app once, then install the new stable-key APK."
$consent=Read-Host "To create and register a NEW long-lived key type MIGRATE"
if($consent -cne "MIGRATE"){Write-Host "Cancelled";exit 0}
$storeSecure=Read-Host "Create a strong keystore password (store securely)" -AsSecureString
$confirmSecure=Read-Host "Enter the same password again for verification" -AsSecureString
$pass=[System.Net.NetworkCredential]::new("",$storeSecure).Password
$confirmPass=[System.Net.NetworkCredential]::new("",$confirmSecure).Password
if($pass -cne $confirmPass){throw "비밀번호가 일치하지 않습니다. 키를 만들지 않았습니다."}
$confirmPass=$null
if($pass.Length -lt 12) { throw "Please use a password of at least 12 characters." }

$folder=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($KeyStorePath))
[IO.Directory]::CreateDirectory($folder) | Out-Null
$alias="classmanager-release"
try {
  $env:CM_SIGNING_STORE_PASSWORD=$pass
  & keytool -genkeypair -keystore $KeyStorePath -storetype JKS -alias $alias -keyalg RSA -keysize 4096 -validity 13000 -dname "CN=ClassManager App Release Key" -storepass:env CM_SIGNING_STORE_PASSWORD -keypass:env CM_SIGNING_STORE_PASSWORD -noprompt
  if($LASTEXITCODE -ne 0) { throw "Keystore generation failed." }
  $lines=@(& keytool -J-Duser.language=en -list -v -keystore $KeyStorePath -storepass:env CM_SIGNING_STORE_PASSWORD -alias $alias)
  $sha=$null
  foreach($line in $lines) {
    if($line -match 'SHA256:\s*([0-9A-Fa-f:]{80,})'){ $sha=($Matches[1] -replace ':','').ToUpperInvariant();break }
  }
  if(-not $sha){throw "Could not read new signing certificate."}
  Write-Host "New key certificate SHA-256: $sha"
  $answer=Read-Host "Register this new key in GitHub encrypted Secrets? Type YES"
  if($answer -cne "YES"){Write-Host "Keystore retained locally. Registration cancelled.";exit 0}
  $base64=[Convert]::ToBase64String([IO.File]::ReadAllBytes($KeyStorePath))
  PutSecret "CM_SIGNING_KEYSTORE_BASE64" $base64
  PutSecret "CM_SIGNING_STORE_PASSWORD" $pass
  PutSecret "CM_SIGNING_KEY_ALIAS" $alias
  PutSecret "CM_SIGNING_KEY_PASSWORD" $pass
  PutSecret "CM_SIGNING_STORE_TYPE" "JKS"
  PutSecret "CM_SIGNING_EXPECTED_SHA256" $sha
  Write-Host ("Registered long-term signing key. Local signing key: " + $KeyStorePath)
  Write-Host "IMPORTANT: Store a second ENCRYPTED backup of this .jks file and its password securely. Never upload either to a public GitHub repository."
  Write-Host "GitHub Actions: run '학급관리 APK 검사 및 고정 키 업데이트 빌드' with build_signed_update=true."
} finally {
  Remove-Item Env:\CM_SIGNING_STORE_PASSWORD -ErrorAction SilentlyContinue
  $base64=$null
  $pass=$null
}
