@echo off
setlocal
cd /d "%~dp0"

echo [1/5] Checking PyInstaller...
uv run --with pyinstaller python -m PyInstaller --version >nul 2>nul
if errorlevel 1 (
  echo Failed to prepare PyInstaller through uv.
  pause
  exit /b 1
)

echo [2/5] Preparing release folder...
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i
if exist "release\MediaCrawlerPortable" (
  move "release\MediaCrawlerPortable" "release\MediaCrawlerPortable_old_%TS%" >nul
)
if not exist "release" mkdir "release"

echo [3/5] Building one-folder executable...
uv run --with pyinstaller python -m PyInstaller --noconfirm --distpath release --workpath "build\pyinstaller_%TS%" MediaCrawlerGUI.spec
if errorlevel 1 (
  echo PyInstaller build failed.
  pause
  exit /b 1
)

echo [4/5] Copying portable helper files...
copy /Y README_PORTABLE.md "release\MediaCrawlerPortable\README_PORTABLE.md" >nul
copy /Y install_browser.bat "release\MediaCrawlerPortable\install_browser.bat" >nul

echo [5/5] Creating release\MediaCrawlerPortable.zip...
if exist "release\MediaCrawlerPortable.zip" (
  move "release\MediaCrawlerPortable.zip" "release\MediaCrawlerPortable_old_%TS%.zip" >nul
)
tar.exe -a -cf release\MediaCrawlerPortable.zip -C release MediaCrawlerPortable
if errorlevel 1 (
  echo Failed to create zip.
  pause
  exit /b 1
)

echo Done: release\MediaCrawlerPortable.zip
pause
