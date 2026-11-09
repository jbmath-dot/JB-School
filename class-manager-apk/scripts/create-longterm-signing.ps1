# Long-lived Android signing key setup. Run only on the user's Windows PC.
# Supports resuming after key creation when GitHub registration did not complete.
# NEVER upload the .jks file or the password to the public repository.
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
  Write-Host "GitHub CLI login is required. Opening browser authentication."
  & gh auth login --hostname github.com --web --git-protocol https
  if($LASTEXITCODE -ne 0){throw "GitHub CLI authentication was not completed."}
}
& gh auth status
if($LASTEXITCODE -ne 0){throw "GitHub CLI is not logged in."}

$folder=[IO.Path]::GetDirectoryName([IO.Path]::GetFullPath($KeyStorePath))
[IO.Directory]::CreateDirectory($folder) | Out-Null
$alias="classmanager-release"
$alreadyExists=Test-Path -LiteralPath $KeyStorePath -PathType Leaf

Write-Host "WARNING: A new signing key CANNOT update previously installed debug APKs."
Write-Host "Back up seating and attendance JSON before uninstalling the existing app."
if($alreadyExists){
  Write-Host ("Existing keystore detected: " + $KeyStorePath)
  Write-Host "The existing signing key will be REUSED. It will NOT be overwritten or regenerated."
  $consent=Read-Host "To resume registration using the EXISTING key, type RESUME"
  if($consent -cne "RESUME"){Write-Host "Cancelled. Existing key was left unchanged.";exit 0}
  $storeSecure=Read-Host "Enter the EXISTING keystore password" -AsSecureString
  $pass=[System.Net.NetworkCredential]::new("",$storeSecure).Password
} else {
  $consent=Read-Host "To create a NEW long-lived signing key, type MIGRATE"
  if($consent -cne "MIGRATE"){Write-Host "Cancelled";exit 0}
  $storeSecure=Read-Host "Create a strong keystore password (store securely)" -AsSecureString
  $confirmSecure=Read-Host "Enter the same password again for verification" -AsSecureString
  $pass=[System.Net.NetworkCredential]::new("",$storeSecure).Password
  $confirmPass=[System.Net.NetworkCredential]::new("",$confirmSecure).Password
  if($pass -cne $confirmPass){throw "Passwords do not match. No key was created."}
  $confirmPass=$null
  if($pass.Length -lt 12) { throw "Please use a password of at least 12 characters." }
}
if([string]::IsNullOrEmpty($pass)){throw "The keystore password cannot be empty."}
$base64=$null

try {
  $env:CM_SIGNING_STORE_PASSWORD=$pass
  if(-not $alreadyExists) {
    # Never overwrite an existing keystore, including after a previous failed run.
    if(Test-Path -LiteralPath $KeyStorePath){throw "A keystore already exists. Refusing to overwrite it."}
    & keytool -genkeypair -keystore $KeyStorePath -storetype JKS -alias $alias -keyalg RSA -keysize 4096 -validity 13000 -dname "CN=ClassManager App Release Key" -storepass:env CM_SIGNING_STORE_PASSWORD -keypass:env CM_SIGNING_STORE_PASSWORD -noprompt
    if($LASTEXITCODE -ne 0){throw "Keystore generation failed."}
  }
  # Do NOT pass -J-Duser.language=en: Windows PowerShell may split that JVM
  # option into invalid keytool arguments. The SHA256 marker is locale-stable.
  $lines=@(& keytool -list -v -keystore $KeyStorePath -storepass:env CM_SIGNING_STORE_PASSWORD -alias $alias)
  if($LASTEXITCODE -ne 0){throw "Cannot read the keystore. Check the EXISTING password and alias; the key was not changed."}
  $sha=$null
  foreach($line in $lines) {
    if($line -match 'SHA256:\s*([0-9A-Fa-f:]{80,})'){
      $sha=($Matches[1] -replace ':','').ToUpperInvariant()
      break
    }
  }
  if(-not $sha){throw "Could not read the signing certificate SHA256 fingerprint; the key was not changed."}
  Write-Host ("Signing certificate SHA-256: " + $sha)
  $answer=Read-Host "Register this EXISTING signing key in GitHub encrypted Secrets? Type YES"
  if($answer -cne "YES"){Write-Host "Keystore retained locally. Registration cancelled.";exit 0}

  $base64=[Convert]::ToBase64String([IO.File]::ReadAllBytes($KeyStorePath))
  PutSecret "CM_SIGNING_KEYSTORE_BASE64" $base64
  PutSecret "CM_SIGNING_STORE_PASSWORD" $pass
  PutSecret "CM_SIGNING_KEY_ALIAS" $alias
  PutSecret "CM_SIGNING_KEY_PASSWORD" $pass
  PutSecret "CM_SIGNING_STORE_TYPE" "JKS"
  PutSecret "CM_SIGNING_EXPECTED_SHA256" $sha
  Write-Host ("Registered original long-term signing key. Local keystore: " + $KeyStorePath)
  Write-Host "IMPORTANT: Keep an encrypted backup of the .jks AND its password."
  Write-Host "Never upload the key or password to public GitHub, chat, or an unapproved storage service."
  Write-Host "Next step: run the GitHub Actions workflow with build_signed_update=true on main."
} finally {
  Remove-Item Env:\CM_SIGNING_STORE_PASSWORD -ErrorAction SilentlyContinue
  $base64=$null
  $pass=$null
}
