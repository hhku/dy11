@echo off
setlocal
cd /d "%~dp0"

echo This project forbids batch deletion. This script will not delete folders.
echo It only moves old build outputs into timestamped folders so you can remove them manually.

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set TS=%%i

if exist "release\MediaCrawlerPortable" (
  move "release\MediaCrawlerPortable" "release\MediaCrawlerPortable_clean_%TS%" >nul
  echo Moved release\MediaCrawlerPortable
)

if exist "release\MediaCrawlerPortable.zip" (
  move "release\MediaCrawlerPortable.zip" "release\MediaCrawlerPortable_clean_%TS%.zip" >nul
  echo Moved release\MediaCrawlerPortable.zip
)

if exist "build\pyinstaller" (
  move "build\pyinstaller" "build\pyinstaller_clean_%TS%" >nul
  echo Moved build\pyinstaller
)

echo Clean staging complete. Delete the *_clean_* folders manually if you no longer need them.
pause
