FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY sync.js ./
USER node
CMD ["node", "sync.js"]
