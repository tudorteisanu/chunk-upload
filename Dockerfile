FROM node:24-alpine

WORKDIR /app

RUN npm install -g pm2

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy built application
COPY dist ./dist

# Copy PM2 config
COPY ecosystem.config.cjs .

# Create uploads directory
RUN mkdir -p uploads/chunks uploads/files

EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]

