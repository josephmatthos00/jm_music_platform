FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Compila o seed separadamente (o tsconfig exclui prisma/ do build principal)
RUN npx tsc prisma/seed.ts prisma/sync-b2.ts \
    --outDir dist/prisma \
    --module commonjs \
    --target ES2022 \
    --esModuleInterop \
    --skipLibCheck \
    --resolveJsonModule \
    --moduleResolution node

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]