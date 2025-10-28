FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install

COPY . .

RUN npm run build

RUN  npm run prisma:migrate

EXPOSE 3000

CMD ["npm", "run", "start"]
