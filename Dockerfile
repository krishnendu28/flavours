FROM node:18-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.js"]
