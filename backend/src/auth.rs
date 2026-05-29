use axum::{
    async_trait,
    extract::{FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::IntoResponse,
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};
use uuid::Uuid;

const JWT_SECRET: &[u8] = b"memory_vault_super_secret_session_key_9988";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String, // User ID
    pub email: String,
    pub role: String,
    pub exp: usize,
}

pub struct AuthenticatedUser {
    pub id: String,
    pub email: String,
    pub role: String,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthenticatedUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({ "error": "Missing Authorization header" })),
                )
            })?;

        if !auth_header.starts_with("Bearer ") {
            return Err((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "Invalid authorization token format" })),
            ));
        }

        let token = &auth_header[7..];
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(JWT_SECRET),
            &Validation::default(),
        )
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "Invalid or expired token" })),
            )
        })?;

        Ok(AuthenticatedUser {
            id: token_data.claims.sub,
            email: token_data.claims.email,
            role: token_data.claims.role,
        })
    }
}

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
    pub name: String,
    pub role: String,
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct UserDto {
    pub id: String,
    pub email: String,
    pub name: String,
    pub role: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserDto,
}

pub async fn register(
    State(pool): State<SqlitePool>,
    Json(payload): Json<RegisterPayload>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Check if user already exists
    let existing_user = sqlx::query("SELECT id FROM users WHERE email = ?")
        .bind(&payload.email)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    if existing_user.is_some() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "User with this email already exists" })),
        ));
    }

    // Hash the password
    let password_hash = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Hashing error: {}", e) })),
        )
    })?;

    let user_id = Uuid::new_v4().to_string();

    // Insert new user
    sqlx::query(
        "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&user_id)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(&payload.name)
    .bind(&payload.role)
    .execute(&pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Failed to create user: {}", e) })),
        )
    })?;

    // Generate JWT
    let token = generate_token(&user_id, &payload.email, &payload.role)?;

    Ok((
        StatusCode::CREATED,
        Json(AuthResponse {
            token,
            user: UserDto {
                id: user_id,
                email: payload.email,
                name: payload.name,
                role: payload.role,
            },
        }),
    ))
}

pub async fn login(
    State(pool): State<SqlitePool>,
    Json(payload): Json<LoginPayload>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    // Retrieve user from database
    let user_row = sqlx::query(
        "SELECT id, email, password_hash, name, role FROM users WHERE email = ?"
    )
    .bind(&payload.email)
    .fetch_optional(&pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Database error: {}", e) })),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid email or password" })),
        )
    })?;

    let user_id: String = user_row.get("id");
    let user_email: String = user_row.get("email");
    let password_hash: String = user_row.get("password_hash");
    let name: String = user_row.get("name");
    let role: String = user_row.get("role");

    // Verify password
    let is_valid = bcrypt::verify(&payload.password, &password_hash).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Password verification failed: {}", e) })),
        )
    })?;

    if !is_valid {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Invalid email or password" })),
        ));
    }

    // Generate JWT
    let token = generate_token(&user_id, &user_email, &role)?;

    Ok((
        StatusCode::OK,
        Json(AuthResponse {
            token,
            user: UserDto {
                id: user_id,
                email: user_email,
                name,
                role,
            },
        }),
    ))
}

fn generate_token(
    user_id: &str,
    email: &str,
    role: &str,
) -> Result<String, (StatusCode, Json<serde_json::Value>)> {
    let expiration = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET),
    )
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": format!("Failed to generate token: {}", e) })),
        )
    })
}
