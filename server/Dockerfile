FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm install --workspaces --include-workspace-root --ignore-scripts
COPY tsconfig.base.json ./
COPY shared ./shared
COPY server ./server
RUN npm --workspace shared run build \
 && npm --workspace server run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/dist ./server/dist
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
