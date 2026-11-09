@echo off
setlocal
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo  학급관리 - 새 장기 서명 키 설정
echo  --------------------------------
echo  기존 앱은 아직 삭제하지 마세요.
echo  명렬 및 출결 JSON 백업이 먼저 필요합니다.
echo.
where keytool.exe >nul 2>nul
if errorlevel 1 (
 echo [필수] Java JDK 17 설치가 필요합니다.
 echo 설치 예: winget install --id Microsoft.OpenJDK.17 -e
 echo 설치 후 새 명령 프롬프트에서 다시 실행하세요.
 pause
 exit /b 1
)
where gh.exe >nul 2>nul
if errorlevel 1 (
 echo [필수] GitHub CLI 설치가 필요합니다. GitHub Desktop과 별도입니다.
 echo 설치 예: winget install --id GitHub.cli -e
 echo 설치 후 새 명령 프롬프트에서 다시 실행하세요.
 pause
 exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-longterm-signing.ps1"
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" echo 설정 중 오류가 발생했습니다. 위 내용을 확인해 주세요.
pause
exit /b %RESULT%
