# Stage 1: Build React static assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve using Express server
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server.js db.js ./
COPY --from=builder /app/dist ./dist

EXPOSE 5000
ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server.js"]
