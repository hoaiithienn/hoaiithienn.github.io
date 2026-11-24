FROM node:22.16.0-bookworm-slim

ENV ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates clang python3 qemu-system-x86 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY astro.config.mjs ./
COPY firmware ./firmware
COPY public ./public
COPY scripts ./scripts
COPY src ./src

RUN npm run firmware:build && npm run qemu:fetch

EXPOSE 4321
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4321"]
