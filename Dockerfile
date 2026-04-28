# ─── Stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias (capa cacheable mientras package*.json no cambie)
# --legacy-peer-deps: vite-plugin-pwa@1.2.0 declara peer vite ^3..^7,
# pero el proyecto usa vite 8.x. En local no se nota porque node_modules
# ya está instalado; en un build limpio npm ci falla con ERESOLVE.
# Usamos `npm install` (no `ci`) para tolerar lock-file ligeramente
# desincronizado.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Variables públicas de Vite — Easypanel las pasa como build-args
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Compilar (genera /app/dist)
RUN npm run build


# ─── Stage 2: runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Servidor estático ligero
RUN npm install -g serve@14

# Solo el bundle compilado, no node_modules ni código fuente
COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

# -s = SPA mode (todas las rutas → index.html, necesario para React Router)
# -l = listen on $PORT
CMD ["sh", "-c", "serve -s dist -l ${PORT:-3000}"]
