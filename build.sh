#!/bin/bash

set -eux

npm install --no-optional

mkdir -p "$HOME/.cache/.wasm-pack/wasm-opt-32d2875cd5f86da0/"
cp "$(which wasm-opt)" "$HOME/.cache/.wasm-pack/wasm-opt-32d2875cd5f86da0/wasm-opt"

export SKIP_WASM=1
pushd ./nekoton
/usr/local/cargo/bin/wasm-pack --verbose build --out-dir pkg --out-name index --target web
popd

npm run build
