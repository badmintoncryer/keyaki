FROM node:20 as builder

RUN apt-get clean && \
    apt-get update && \
    apt-get install -y g++ make cmake unzip libcurl4-openssl-dev

# Lambda Runtime interface client
WORKDIR /ric
RUN --mount=type=bind,source=ric/package.json,target=/ric/package.json \
    --mount=type=bind,source=ric/package-lock.json,target=/ric/package-lock.json \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

# Lambda Function
WORKDIR /app
RUN --mount=type=bind,source=app/package.json,target=/app/package.json \
    --mount=type=bind,source=app/package-lock.json,target=/app/package-lock.json \
    --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci

RUN --mount=type=bind,source=app/index.ts,target=/app/index.ts \
    npx esbuild --bundle --format=cjs --platform=node --outdir=dist index.ts --external:chromium-bidi/lib/cjs/bidiMapper/BidiMapper --external:chromium-bidi/lib/cjs/cdp/CdpConnection

FROM node:20

ARG CHORME_VERSION=126.0.6478.182

# Chromeの依存ライブラリインストール
# https://pptr.dev/troubleshooting#chrome-doesnt-launch-on-linux
RUN apt-get clean && \
    apt-get update && \
    apt-get install -y ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

# Chrome for Testingインストール
RUN npx -y @puppeteer/browsers install chrome@${CHORME_VERSION} --platform linux && \
    mv chrome/linux-${CHORME_VERSION}/chrome-linux64 /browser && \
    rm -r chrome

# ビルダーイメージから必要なリソース(RICとLambda関数)をコピー
WORKDIR /function
COPY --from=builder /ric /function
COPY --from=builder /app/dist/index.js /function/index.js

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["index.handler"]
