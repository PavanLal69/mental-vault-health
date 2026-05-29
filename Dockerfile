# ==========================================
# Stage 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Rust Backend
# ==========================================
FROM rust:1.75-slim AS backend-builder
WORKDIR /app/backend

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

COPY backend/Cargo.toml backend/Cargo.lock ./
# Create mock project files to compile and cache dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

COPY backend/src ./src
COPY backend/.cargo ./.cargo
# Touch entry point to force rebuild with real source code
RUN touch src/main.rs
RUN cargo build --release

# ==========================================
# Stage 3: Runner Container (Cloud Run)
# ==========================================
FROM debian:bookworm-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

# Copy built backend binary
COPY --from=backend-builder /app/backend/target/release/memory-vault-backend ./backend-bin
# Copy built static frontend files into expected dist folder
COPY --from=frontend-builder /app/frontend/dist ./dist

# Create uploads directory (used for memory photos/audio)
RUN mkdir -ok uploads

# Exposed port is dynamically handled by Axum checking the $PORT env variable
ENV PORT=8080
EXPOSE 8080

CMD ["./backend-bin"]
