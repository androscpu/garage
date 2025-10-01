FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY tsconfig.json ./
COPY src ./src
RUN npm run build || true
EXPOSE 3000
CMD ["npm","run","start"]
