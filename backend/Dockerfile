# Usar una imagen ligera de Node.js
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto del servidor
EXPOSE 3001

# Comando para iniciar la aplicación
CMD ["npm", "start"]
