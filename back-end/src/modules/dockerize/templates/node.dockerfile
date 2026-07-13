# --- STAGE 1: Build & Install Dependencies ---
FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

# --- STAGE 2: Production Runtime ---
FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app ./
USER node
EXPOSE 3000
CMD ["node", "index.js"]