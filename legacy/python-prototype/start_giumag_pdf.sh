#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Giumag PDF Studio"
if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv
fi
if [ ! -f ".venv/.giumag_ready" ]; then
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
  touch .venv/.giumag_ready
fi
exec .venv/bin/python launcher.py
