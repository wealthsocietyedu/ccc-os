FROM node:22-alpine

# deno isn't in this Alpine base's stable repos (node:22-alpine tracks a
# stable release; deno is edge-only in apk), so pull just that one package
# from edge/community. Installing via the deno.land curl script instead is
# not reliable on Alpine — its prebuilt binaries target glibc, not musl.
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++ \
    && apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/edge/community deno \
    && pip3 install yt-dlp yt-dlp-ejs curl_cffi --break-system-packages

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
