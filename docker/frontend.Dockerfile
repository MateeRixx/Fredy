# Fraud Command — frontend build stage
# Produces static assets served by nginx / the FastAPI backend.
FROM node:22-alpine AS build

WORKDIR /srv/web

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install

COPY frontend/ .
RUN npm run build

FROM nginx:1.27-alpine AS serve

COPY --from=build /srv/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80