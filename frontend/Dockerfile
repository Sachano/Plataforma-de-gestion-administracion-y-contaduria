# Fase de construcción (Build)
FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Fase de producción (Nginx para servir estáticos)
FROM nginx:stable-alpine as production-stage

# Copiar archivos construidos al directorio de Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Exponer puerto 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
