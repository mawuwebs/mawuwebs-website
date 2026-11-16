FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# postinstall runs `prisma generate`
RUN DATABASE_URL=file:/tmp/build.db npm ci

COPY . .
ARG NEXT_PUBLIC_PLAUSIBLE_DOMAIN=""
ENV NEXT_PUBLIC_PLAUSIBLE_DOMAIN=$NEXT_PUBLIC_PLAUSIBLE_DOMAIN
ARG AUTH_URL=""
ENV AUTH_URL=$AUTH_URL
RUN DATABASE_URL=file:/tmp/build.db sh -c "npx prisma migrate deploy && npm run build"

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec npm start -- -H 0.0.0.0 -p 3000"]
