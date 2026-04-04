FROM node:22-alpine

RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++ \
    && pip3 install yt-dlp --break-system-packages

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN npm install
RUN npm install --prefix server
RUN npm install --prefix client

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "server/index.js"]
