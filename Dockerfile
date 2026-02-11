FROM node:18

# Ishchi katalogni yaratish
WORKDIR /app

# Package fayllarini nusxalash
COPY package*.json ./

# Kutubxonalarni o'rnatish
RUN npm install

# Bot kodini nusxalash
COPY . .

# Botni ishga tushirish
CMD ["node", "bot.js"]
