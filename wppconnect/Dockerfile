FROM node:18-alpine

WORKDIR /usr/src/app

# Install required packages including Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Clone and install WPPConnect Server
RUN git clone https://github.com/wppconnect-team/wppconnect-server.git . && \
    npm install && \
    npm run build

# Expose port
EXPOSE 21465

# Start the server (using the built version)
CMD ["node", "dist/server.js"]
