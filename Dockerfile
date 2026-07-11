FROM node:18-bullseye-slim

# FFmpeg install karein
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean

WORKDIR /app

# Dependencies install karein
COPY package.json ./
RUN npm install

# Saara code copy karein
COPY . .

# Music files save karne ke liye folder banayein
RUN mkdir -p music

EXPOSE 3000
CMD ["node", "server.js"]

