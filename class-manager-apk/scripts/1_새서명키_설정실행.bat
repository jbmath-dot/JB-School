@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto bad_directory

echo.
echo ClassManager - create long-term Android signing key
echo ----------------------------------------------
echo IMPORTANT: Back up attendance and seating JSON first.
echo Do not uninstall the existing app yet.
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 goto missing_powershell
where keytool.exe >nul 2>nul
if errorlevel 1 goto missing_jdk
where gh.exe >nul 2>nul
if errorlevel 1 goto missing_gh

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-longterm-signing.ps1"
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo Signing key setup failed. See the message above.
if "%RESULT%"=="0" echo Script finished. Check whether GitHub secrets were registered.
pause
exit /b %RESULT%

:missing_powershell
echo ERROR: Windows PowerShell is unavailable.
pause
exit /b 1

:missing_jdk
echo ERROR: Java JDK keytool was not found.
echo Open a NEW terminal and run: winget install --id Microsoft.OpenJDK.17 -e
echo Then close and restart this setup.
pause
exit /b 1

:missing_gh
echo ERROR: GitHub CLI was not found.
echo Open a NEW terminal and run: winget install --id GitHub.cli -e
echo Then close and restart this setup.
pause
exit /b 1

:bad_directory
echo ERROR: Could not enter the scripts directory.
pause
exit /b 1
