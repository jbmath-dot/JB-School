# Run on YOUR Windows PC only. Never upload the keystore to a public repository.
# Prerequisites: JDK keytool; GitHub CLI (gh auth login).
# Example:
# .\configure-original-signing.ps1 -ExistingApk "C:\Users\me\Downloads\학급관리.apk" -OriginalKeystore "C:\my-safe-folder\original-debug.keystore" -KeyAlias "androiddebugkey"
param(
  [Parameter(Mandatory=$true)][string]$ExistingApk,
  [Parameter(Mandatory=$true)][string]$OriginalKeystore,
  [Parameter(Mandatory=$true)][string]$KeyAlias,
  [string]$StoreType = "",
  [string]$Repository = "jbmath-dot/JB-School"
)
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fingerprint([string[]]$Lines) {
  foreach($line in $Lines) {
    if($line -match 'SHA256:\s*([0-9A-Fa-f:]{80,})') {
      return ($Matches[1] -replace ':','').ToUpperInvariant()
    }
  }
  throw "서명 인증서 SHA-256 지문을 찾을 수 없습니다."
}
function PutSecret([string]$Name,[string]$Value) {
  # Pipe values into GitHub CLI; do not put secret content into shell command arguments.
  $Value | & gh secret set $Name --repo $Repository
  if($LASTEXITCODE -ne 0) { throw "GitHub Secret 저장 실패: $Name" }
}
if(-not (Test-Path -LiteralPath $ExistingApk -PathType Leaf)) { throw "기존 APK 파일이 없습니다." }
if(-not (Test-Path -LiteralPath $OriginalKeystore -PathType Leaf)) { throw "기존 서명 키 저장소 파일이 없습니다." }
if(-not (Get-Command keytool -ErrorAction SilentlyContinue)) { throw "JDK의 keytool을 설치해 주세요." }
if(-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "GitHub CLI 설치 후 gh auth login을 실행해 주세요." }
& gh auth status
if($LASTEXITCODE -ne 0){ throw "GitHub CLI 로그인 필요: gh auth login" }

$apkPath = (Resolve-Path -LiteralPath $ExistingApk).Path
$keyPath = (Resolve-Path -LiteralPath $OriginalKeystore).Path
$apkCertificate = @(& keytool -J-Duser.language=en -printcert -jarfile $apkPath 2>&1)
if($LASTEXITCODE -ne 0) { throw "기존 APK의 서명 확인 실패: 올바른 APK를 지정해 주세요." }
$apkSha = Fingerprint $apkCertificate

$storeSecure = Read-Host "원본 keystore 비밀번호 (화면에 표시되지 않음)" -AsSecureString
$keySecure = Read-Host "원본 키 비밀번호 (같으면 Enter)" -AsSecureString
$storePassword = [System.Net.NetworkCredential]::new("",$storeSecure).Password
$keyPassword = [System.Net.NetworkCredential]::new("",$keySecure).Password
if([string]::IsNullOrEmpty($keyPassword)){$keyPassword = $storePassword}
if([string]::IsNullOrEmpty($storePassword)){throw "원본 keystore 비밀번호가 비어 있습니다."}

try {
  # Keytool reads its password from a temporary process environment variable.
  $env:CM_SIGNING_STORE_PASSWORD = $storePassword
  $keystoreCert = @(& keytool -J-Duser.language=en -list -v -keystore $keyPath -storepass:env CM_SIGNING_STORE_PASSWORD -alias $KeyAlias 2>&1)
  if($LASTEXITCODE -ne 0) { throw "원본 keystore / 비밀번호 / alias가 올바르지 않습니다." }
  $keySha = Fingerprint $keystoreCert
  Write-Host ("기존 APK 인증서 : " + $apkSha)
  Write-Host ("원본 키 인증서   : " + $keySha)
  if($apkSha -ne $keySha) {
    throw "서명 불일치: 이 키로는 현재 설치된 앱을 덮어쓰기 업데이트할 수 없습니다. 어떤 키도 등록하지 않았습니다."
  }
  if(-not $PSCmdlet.ShouldContinue("검증된 원본 키를 GitHub Actions의 암호화된 Repository Secrets에 등록하시겠습니까?","원본 키 일치 확인")) {
    Write-Host "검증만 완료했습니다. 등록은 취소되었습니다."
    exit 0
  }
  $encoded = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keyPath))
  PutSecret "CM_SIGNING_KEYSTORE_BASE64" $encoded
  PutSecret "CM_SIGNING_STORE_PASSWORD" $storePassword
  PutSecret "CM_SIGNING_KEY_ALIAS" $KeyAlias
  PutSecret "CM_SIGNING_KEY_PASSWORD" $keyPassword
  PutSecret "CM_SIGNING_EXPECTED_SHA256" $apkSha
  if($StoreType -ne ""){PutSecret "CM_SIGNING_STORE_TYPE" $StoreType}
  Write-Host "설정 완료. GitHub Actions에서 학급관리 APK 검사 및 기존 키로 업데이트 빌드를 선택하고 build_signed_update 옵션을 켜세요."
} finally {
  Remove-Item Env:\CM_SIGNING_STORE_PASSWORD -ErrorAction SilentlyContinue
  $encoded = $null
  $storePassword = $null
  $keyPassword = $null
}
