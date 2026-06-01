FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
# Must match `src/config/env.ts#PORT` and the upstream port in
# `frontend/nginx.conf` (`server backend:4000`).
EXPOSE 4000
CMD ["node", "dist/server.js"]
