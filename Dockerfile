FROM ubuntu:20.04

WORKDIR /app

RUN set -eux; \
    apt-get update ; \
    DEBIAN_FRONTEND=noninteractive  apt-get install -y  binaryen libssl-dev build-essential curl nodejs npm;

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | bash -s -- -y;
ENV PATH="/root/.cargo/bin:${PATH}"

RUN set -eux; \
    mkdir -p /usr/local/cargo/registry/cache ; \
    rustup target add wasm32-unknown-unknown; \
    cargo install wasm-pack

CMD ["/app/build.sh"]
