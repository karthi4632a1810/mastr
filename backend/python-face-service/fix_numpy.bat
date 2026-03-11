@echo off
REM Fix numpy compatibility issue with insightface on Windows
REM This script reinstalls numpy and insightface with compatible versions

echo Fixing numpy compatibility issue...

REM Uninstall current versions
pip uninstall -y numpy insightface

REM Install compatible numpy version first
pip install "numpy>=1.24.0,<2.0.0"

REM Reinstall insightface from local wheel
pip install insightface-0.7.3-cp312-cp312-win_amd64.whl

echo Done! Try running the service again.
pause

