FROM node:18-alpine AS builder

WORKDIR /app 

COPY ./package*.json .

RUN npm install 

COPY . .

# needed in build time not in run time
ENV REACT_APP_API_HOST="/api" 

RUN npm run build 
# this is react app build folder called build if vite build folder called dist
FROM nginx:stable-alpine3.23-slim
# FROM nginxinc/nginx-unprivileged:stable-alpine # you can use this image directly to avoid running as root run as non root -> nginx but it increases image size 
# so i will do it manually


COPY --from=builder /app/build /usr/share/nginx/html

WORKDIR /usr/share/nginx/html

## nginx must listen on a port >1024 as non-root
RUN sed -i 's/listen\s*80;/listen 8080;/' /etc/nginx/conf.d/default.conf && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run && \
    sed -i '/user  nginx;/d' /etc/nginx/nginx.conf && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx


EXPOSE 8080

CMD [ "nginx", "-g", "daemon off;" ]