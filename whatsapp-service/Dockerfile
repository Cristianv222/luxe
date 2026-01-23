FROM node:18-alpine

WORKDIR /app

# Dependencias para compilación nativa + git (requerido por algunas dependencias npm)
RUN apk add --no-cache python3 make g++ git

# Copiar package.json primero para cachear dependencias
COPY package*.json ./

# Instalar dependencias (omit dev es el nuevo flag)
RUN npm install --omit=dev && npm cache clean --force

# Copiar código fuente
COPY . .

# Puerto de la API (se configura via ENV PORT)
EXPOSE 21465

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:21465/health || exit 1

# Usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/auth_info && \
    chown -R nodejs:nodejs /app

USER nodejs

CMD ["node", "server.js"]
