FROM node:22-slim

RUN apt-get update && apt-get install -y ffmpeg curl build-essential python3 libopus-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY scripts/ scripts/
RUN npm ci
COPY . .

CMD ["node", "src/index.js"]
