#!/bin/bash

set -eux;

npm install;
mkdir -p /root/.cache/.wasm-pack/wasm-opt-32d2875cd5f86da0/
cp $(which wasm-opt) /root/.cache/.wasm-pack/wasm-opt-32d2875cd5f86da0/wasm-opt;
npm run build;
