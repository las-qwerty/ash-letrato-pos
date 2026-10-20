@echo off
setlocal
cd /d "%~dp0"

rem Node isn't on the system PATH on this machine — add it for this session.
set "PATH=%ProgramFiles%\nodejs;%PATH%"

rem Start the POS dev server if nothing is listening on :3100 yet.
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3100' -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "ASH LETRATO POS server" /min cmd /c "npm run dev"
  timeout /t 15 /nobreak >nul
)

rem Edge kiosk-printing: window.print() goes straight to the default printer
rem with no print dialog. --app opens a chromeless POS window.
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
start "" "%EDGE%" --kiosk-printing --app=http://localhost:3100/pos

endlocal
