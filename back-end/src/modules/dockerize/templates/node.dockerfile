FROM {{BASE_IMAGE}} AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .

FROM {{BASE_IMAGE}} AS runner
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /usr/src/app ./
USER node
EXPOSE {{PORT}}
CMD [{{RUN_COMMAND}}]