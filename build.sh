#!/bin/bash

set -eux;

npm install;
npm run build;
cp $(which wasm-opt) /root/.cache/.wasm-pack/wasm-opt-4d7a65327e9363b7/wasm-opt;
npm run build;
