FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# msnodesqlv8 e opcional e nao e necessario no Cloud Run (Linux)
RUN npm ci --omit=optional --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["npm", "start"]