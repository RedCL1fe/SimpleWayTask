FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --prefer-offline --no-audit

COPY . .

EXPOSE 5173
