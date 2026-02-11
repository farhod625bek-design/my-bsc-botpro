FROM node:18-slim

WORKDIR /app

# Avval package fayllarini ko'chiramiz
COPY package*.json ./

# Kutubxonalarni o'rnatamiz
RUN npm install

# Keyin qolgan hamma faylni ko'chiramiz
COPY . .

CMD ["node", "bot.js"]
