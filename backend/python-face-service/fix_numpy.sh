#!/bin/bash
# Fix numpy compatibility issue with insightface
# This script reinstalls numpy and insightface with compatible versions

echo "Fixing numpy compatibility issue..."

# Uninstall current versions
pip uninstall -y numpy insightface

# Install compatible numpy version first
pip install "numpy>=1.24.0,<2.0.0"

# Reinstall insightface
pip install insightface-0.7.3-cp312-cp312-win_amd64.whl

echo "Done! Try running the service again."

