FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

COPY backend/ ./backend/
COPY frontend/dist/ ./frontend/dist/

EXPOSE 3001

CMD ["node", "backend/src/server.js"]
