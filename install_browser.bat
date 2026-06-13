@echo off
setlocal
cd /d "%~dp0"

echo Installing Playwright Chromium browser for MediaCrawlerPortable...
echo This step requires network access and may take several minutes.

if not exist "MediaCrawlerGUI.exe" (
  echo MediaCrawlerGUI.exe was not found. Please run this file inside the MediaCrawlerPortable folder.
  pause
  exit /b 1
)

MediaCrawlerGUI.exe --install-browser
if errorlevel 1 (
  echo Browser installation failed. Please check your network connection and try again.
  pause
  exit /b 1
)

echo Browser installation complete.
pause
