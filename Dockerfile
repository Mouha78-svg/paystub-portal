# Stage 1 — build React frontend
FROM node:20-slim AS client-builder
WORKDIR /client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2 — production server
FROM node:20-slim

# Chromium and its dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ .

# Place the React build where the server expects it: ../client/dist relative to /app
COPY --from=client-builder /client/dist /client/dist

RUN mkdir -p pdf csv

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "index.js"]
