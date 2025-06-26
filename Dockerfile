FROM node:22-bookworm-slim AS base

# Required for Prisma + FFmpeg + SSL
RUN apt-get update \
  && apt-get install --no-install-recommends -y \
    ffmpeg \
    tini \
    openssl \
    ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*


# === Stage 2: Install full dependencies (including dev)
FROM base AS dependencies

WORKDIR /usr/app

RUN apt-get update \
  && apt-get install --no-install-recommends -y \
    python3 \
    python-is-python3 \
    build-essential \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn install
RUN cp -R node_modules /usr/app/prod_node_modules


# === Stage 3: Build project (patched play.ts compiles here)
FROM dependencies AS builder

COPY . .

# 👇 this ensures Prisma + your patched play.ts compiles
RUN yarn prisma generate || true
RUN yarn build


# === Stage 4: Final runtime image
FROM base AS runner

WORKDIR /usr/app

COPY --from=builder /usr/app/dist ./dist
COPY --from=dependencies /usr/app/prod_node_modules ./node_modules
COPY --from=builder /usr/app/node_modules/.prisma/client ./node_modules/.prisma/client

# include any runtime files you might rely on (optional)
COPY . .

ARG COMMIT_HASH=unknown
ARG BUILD_DATE=unknown

ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV COMMIT_HASH=$COMMIT_HASH
ENV BUILD_DATE=$BUILD_DATE
ENV ENV_FILE=/config

CMD ["tini", "--", "node", "--enable-source-maps", "dist/scripts/migrate-and-start.js"]
