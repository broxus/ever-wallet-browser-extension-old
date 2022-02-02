FROM rust:1.58.1-buster

WORKDIR /app

RUN set -eux; \
    apt-get update ; \
    apt-get install -y --no-install-recommends \
        binaryen \
        libssl-dev \
        ; \
    \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - ; \
    apt-get install -y nodejs ;

RUN set -eux; \
    rustup target add wasm32-unknown-unknown; \
    cargo install --git https://github.com/broxus/wasm-pack.git; \
    npm install -g @broxus/wasm-pack ;

CMD ["/app/build.sh"]
