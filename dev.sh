#!/bin/bash
export PATH="$HOME/node-local/bin:$PATH"
exec node node_modules/.bin/next dev -p "${PORT:-3001}"
