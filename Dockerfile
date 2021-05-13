FROM debian:buster-slim

WORKDIR /app

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH \
    TOOLCHAIN=stable

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        wget \
        curl \
        build-essential \
        binaryen \
        pkg-config \
        libssl-dev \
        ; \
    \
    url="https://static.rust-lang.org/rustup/dist/x86_64-unknown-linux-gnu/rustup-init"; \
    wget "$url"; \
    chmod +x rustup-init; \
    ./rustup-init -y --no-modify-path --default-toolchain $TOOLCHAIN; \
    rm rustup-init; \
    chmod -R a+w $RUSTUP_HOME $CARGO_HOME; \
    rustup --version; \
    cargo --version; \
    rustc --version; \
    \
    curl -sL https://deb.nodesource.com/setup_14.x | bash - ; \
    apt-get install -y nodejs ; \
    \
    apt-get remove -y --auto-remove \
        wget \
        ; \
    rm -rf /var/lib/apt/lists/*;

RUN set -eux; \
    rustup target add wasm32-unknown-unknown; \
    cargo install --git https://github.com/broxus/wasm-pack.git;

CMD ["/app/build.sh"]
