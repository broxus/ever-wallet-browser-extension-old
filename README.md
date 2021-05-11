## TON Crystal Wallet
TON Wallet browser extension

### Requirements

- Rust 1.50+ with installed target `wasm32-unknown-unknown`
- wasm-pack
- binaryen 99+ (for `wasm-opt`)
- Node.js 14+ 

### How to build

```bash
# Prepare builder container
docker build --tag ton-crystal-extension .

# Build extension
docker run -ti --rm --mount type=bind,source=$(pwd),target=/app ton-crystal-extension

# Extension output will be at $(pwd)/dist 
```
