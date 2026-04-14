FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && pip3 install yt-dlp --break-system-packages \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN pnpm install

COPY . .

CMD ["pnpm", "run", "start"]
