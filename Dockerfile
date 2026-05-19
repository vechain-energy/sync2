# Use an official Node.js runtime as a parent image
FROM node:24-alpine

# Set the working directory in the container
WORKDIR /app

# Install native build dependencies for Electron/node-hid rebuilds
RUN apk add --no-cache \
    git \
    python3 \
    g++ \
    make \
    pkgconf \
    libusb-dev \
    linux-headers \
    eudev-dev

# Copy files to the working directory
COPY . .

# Configure npm & install npm packages
RUN NODE_NO_WARNINGS=1 npm_config_openssl_fips= npm ci --no-audit --no-fund --no-update-notifier --loglevel=error

# Default port
ENV PORT=8080

# Expose the port the app runs on
EXPOSE ${PORT}

# Command to run the application
CMD ["npx", "quasar", "build"]
