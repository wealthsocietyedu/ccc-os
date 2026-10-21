FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv python3-dev build-essential fonts-liberation ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir 'faster-whisper==1.2.1' 'av==15.1.0' 'yt-dlp[default]' curl_cffi
# Download once at build time, never during a user's first three-hour job.
RUN python3 -c "from huggingface_hub import snapshot_download; snapshot_download('Systran/faster-whisper-small.en', local_dir='/opt/whisper-small.en')"
ENV WHISPER_MODEL=/opt/whisper-small.en WHISPER_THREADS=2 NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci --prefix server --omit=dev && npm ci --prefix client --include=dev
COPY . .
RUN npm run build --prefix client && fc-cache -f
EXPOSE 8080
CMD ["node","server/index.js"]
