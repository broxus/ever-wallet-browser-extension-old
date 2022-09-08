FROM rust:1.63.0-bullseye

WORKDIR /app

RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      binaryen \
      libssl-dev \
      pkg-config \
      curl \
      git \
      npm \
    ;

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash; \
    export NVM_DIR="$HOME/.nvm"; \
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; \
    nvm install v18.7.0 \
    npm install npm@latest -g \
    ;

RUN set -eux; \
    mkdir -p /usr/local/cargo/registry/cache; \
    rustup target add wasm32-unknown-unknown; \
    cargo install --git https://github.com/broxus/wasm-pack.git;

CMD ["/app/build.sh"]
