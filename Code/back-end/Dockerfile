# ---------- deps stage: install + compile native modules ----------
FROM node:18-alpine AS deps
WORKDIR /app

# bcrypt is a native module - needs a toolchain to compile on alpine (musl)
# need while build time to use bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./
# --omit=dev: nodemon (and any other devDependency: nodemon in package.json) never enters the image
# --only=production: install only production dependencies same effect as --omit=dev

RUN npm ci --omit=dev 

# ---------- production stage ----------
FROM node:18-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# simple-git shells out to the real git binary at runtime - needs it installed
# remove cache before save layer to reduce image size
# need while run time to use simple-git
RUN apk add --no-cache git

# terraform CLI is shelled out to at runtime (modules/infra/terraform/utils/execTerraform.js)
# curl/unzip are only needed to fetch + extract the binary, so they're removed
# in the same layer to keep them out of the final image (apk cache is skipped
# already via --no-cache, so nothing else to clean up here)
ARG TERRAFORM_VERSION=1.9.8
RUN apk add --no-cache --virtual .terraform-deps curl unzip \
    && curl -fsSL -o /tmp/terraform.zip "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
    && unzip /tmp/terraform.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/terraform \
    && rm /tmp/terraform.zip \
    && apk del .terraform-deps

COPY --from=deps /app/node_modules ./node_modules

#not include files in .dockerignore
COPY . . 

# node:alpine already ships a non-root "node" user, same idea as nginx's
# built-in "nginx" user - no need to create one ourselves
# USER node

EXPOSE 5000

CMD ["node", "src/server.js"]