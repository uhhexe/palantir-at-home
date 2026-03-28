#!/bin/bash
export PATH="/Users/lattice/node-local/bin:$PATH"
exec node node_modules/.bin/next dev -p "${PORT:-3001}"
