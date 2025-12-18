FROM node:20-alpine

RUN npm install -g npm@9.6.7

WORKDIR /app

COPY . .

EXPOSE 8300

ENTRYPOINT ["node", "index.js"]
