@echo off
setlocal
cd /d "%~dp0"

if not defined CORDOVA_JAVA_HOME set "CORDOVA_JAVA_HOME=%ProgramFiles%\Java\jdk-17"
if not exist "%CORDOVA_JAVA_HOME%\bin\java.exe" (
    echo JDK 17 not found: "%CORDOVA_JAVA_HOME%"
    exit /b 1
)

set "JAVA_HOME=%CORDOVA_JAVA_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

call npx cordova run android %*
exit /b %ERRORLEVEL%
