use axum::{
    routing::{get, post},
    Router,
};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod ai;
mod auth;
mod db;
mod memories;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment variables
    dotenvy::dotenv().ok();

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://memory_vault.db".to_string());
    let server_port = std::env::var("PORT").unwrap_or_else(|_| "5000".to_string());
    let port: u16 = server_port.parse().unwrap_or(5000);

    // Initialize database pool and run migrations
    println!("Connecting to database: {}", database_url);
    let pool = db::init_db(&database_url).await;

    // Create uploads directory if it doesn't exist
    let upload_dir = "./uploads";
    if !std::path::Path::new(upload_dir).exists() {
        std::fs::create_dir_all(upload_dir).unwrap_or_default();
    }

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any) // For hackathon prototype, allow Any. For production, specify origins.
        .allow_methods(Any)
        .allow_headers(Any);

    // Setup routes
    let app = Router::new()
        // Auth API
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/login", post(auth::login))
        // Memories API
        .route("/api/memories", post(memories::upload_memory).get(memories::get_memories))
        .route("/api/memories/daily", get(memories::get_daily_memory))
        .route("/api/memories/search", get(memories::search_memories))
        // Voice Assistant query
        .route("/api/voice/query", get(memories::voice_query))
        // Family Relationship Tree API
        .route("/api/family-members", post(memories::create_family_member).get(memories::get_family_members))
        .route("/api/relationships", post(memories::create_relationship).get(memories::get_relationships))
        // Serve static uploads
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .fallback_service(
            ServeDir::new("./dist").fallback(tower_http::services::ServeFile::new("./dist/index.html"))
        )
        .layer(cors)
        .with_state(pool);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Memory Vault Server running on: http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
