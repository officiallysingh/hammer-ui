# ---- deps ----
    FROM node:20-alpine AS deps
    WORKDIR /repo
    COPY package.json package-lock.json turbo.json ./
    COPY apps/web/package.json apps/web/package.json
    COPY packages packages
    RUN npm ci
    
    # ---- builder ----
    FROM node:20-alpine AS builder
    WORKDIR /repo
    COPY --from=deps /repo/node_modules node_modules
    COPY . .
    RUN npm run build
    
    # ---- runner ----
# ---- runner ----
    FROM node:20-alpine AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=3000
    
    RUN apk add --no-cache dumb-init wget
    
    # Copy standalone output (contains apps/web/server.js typically)
    COPY --from=builder /repo/apps/web/.next/standalone ./
    
    # IMPORTANT: copy static + public into the SAME nested app folder
    COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
    COPY --from=builder /repo/apps/web/public ./apps/web/public
    
    # Run from the nested app directory
    WORKDIR /app/apps/web
    EXPOSE 3000
    
    ENTRYPOINT ["dumb-init", "--"]
    CMD ["node", "server.js"]
    
    