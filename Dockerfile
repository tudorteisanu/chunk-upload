FROM node:24-alpine

WORKDIR /app

FROM node:24-alpine

WORKDIR /app

RUN npm install -g pm2

COPY dist ./dist

COPY ecosystem.config.cjs .

CMD ["pm2-runtime", "start", "dist/index.js", "--name", "chunk-upload", "-i", "max", "--max-memory-restart", "500M"]

