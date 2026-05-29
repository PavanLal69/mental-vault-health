use axum::{
    extract::{Multipart, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Datelike;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::SqlitePool;
use std::path::Path;
use std::time::Duration;
use uuid::Uuid;

use crate::ai::AIService;

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct Memory {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub ai_story: Option<String>,
    pub category: String,
    pub media_url: Option<String>,
    pub media_type: String,
    pub event_date: Option<String>,
    pub embedding: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct FamilyMember {
    pub id: String,
    pub name: String,
    pub birth_date: Option<String>,
    pub relation: String,
    pub photo_url: Option<String>,
    pub bio: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::FromRow)]
pub struct Relationship {
    pub id: String,
    pub member_a_id: String,
    pub member_b_id: String,
    pub relation_type: String,
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

#[derive(Deserialize)]
pub struct FamilyMemberPayload {
    pub name: String,
    pub birth_date: Option<String>,
    pub relation: String,
    pub photo_url: Option<String>,
    pub bio: Option<String>,
}

#[derive(Deserialize)]
pub struct RelationshipPayload {
    pub member_a_id: String,
    pub member_b_id: String,
    pub relation_type: String,
}

// Memories CRUD & Search
pub async fn get_memories(
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let memories = sqlx::query_as::<_, Memory>("SELECT * FROM memories ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    Ok(Json(memories))
}

pub async fn get_daily_memory(
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let memories = sqlx::query_as::<_, Memory>("SELECT * FROM memories")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    if memories.is_empty() {
        return Ok(Json(None::<Memory>));
    }

    let now = chrono::Utc::now();
    let day_of_year = now.ordinal() as usize;
    let idx = day_of_year % memories.len();
    let daily_mem = memories.get(idx).cloned();

    Ok(Json(daily_mem))
}

pub async fn upload_memory(
    State(pool): State<SqlitePool>,
    mut multipart: Multipart,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let mut title = String::new();
    let mut description = String::new();
    let mut category = String::new();
    let mut media_type = "text".to_string();
    let mut event_date = None;
    let mut media_url = None;
    let mut linked_member_ids: Vec<String> = Vec::new();

    let upload_dir = "./uploads";
    if !Path::new(upload_dir).exists() {
        std::fs::create_dir_all(upload_dir).unwrap_or_default();
    }

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();

        match name.as_str() {
            "title" => {
                if let Ok(text) = field.text().await {
                    title = text;
                }
            }
            "description" => {
                if let Ok(text) = field.text().await {
                    description = text;
                }
            }
            "category" => {
                if let Ok(text) = field.text().await {
                    category = text;
                }
            }
            "media_type" => {
                if let Ok(text) = field.text().await {
                    media_type = text;
                }
            }
            "event_date" => {
                if let Ok(text) = field.text().await {
                    if !text.is_empty() {
                        event_date = Some(text);
                    }
                }
            }
            "linked_members" => {
                if let Ok(text) = field.text().await {
                    if !text.is_empty() {
                        linked_member_ids = text
                            .split(',')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                    }
                }
            }
            "file" => {
                let file_name = field.file_name().unwrap_or("file").to_string();
                if !file_name.is_empty() {
                    let file_ext = Path::new(&file_name)
                        .extension()
                        .and_then(|ext| ext.to_str())
                        .unwrap_or("dat");
                    let unique_name = format!("{}.{}", Uuid::new_v4(), file_ext);
                    let file_path = format!("{}/{}", upload_dir, unique_name);
                    
                    if let Ok(bytes) = field.bytes().await {
                        if !bytes.is_empty() {
                            if std::fs::write(&file_path, bytes).is_ok() {
                                media_url = Some(format!("/uploads/{}", unique_name));
                            }
                        }
                    }
                }
            }
            _ => {}
        }
    }

    if title.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Title is required" })),
        ));
    }

    let ai_service = AIService::new();
    let ai_story = ai_service.generate_memory_story(&description, &category).await;
    let embedding_vec = ai_service.get_embedding(&format!("{} {}", title, description)).await;
    let embedding_json = serde_json::to_string(&embedding_vec).unwrap_or_default();

    let memory_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO memories (id, title, description, ai_story, category, media_url, media_type, event_date, embedding) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&memory_id)
    .bind(&title)
    .bind(&description)
    .bind(&ai_story)
    .bind(&category)
    .bind(&media_url)
    .bind(&media_type)
    .bind(&event_date)
    .bind(&embedding_json)
    .execute(&pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Failed to save memory: {}", e) })),
        )
    })?;

    for member_id in linked_member_ids {
        let _ = sqlx::query(
            "INSERT INTO memory_links (memory_id, member_id) VALUES (?, ?)"
        )
        .bind(&memory_id)
        .bind(&member_id)
        .execute(&pool)
        .await;
    }

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": memory_id,
            "title": title,
            "ai_story": ai_story,
            "media_url": media_url,
            "message": "Memory uploaded successfully"
        })),
    ))
}

pub async fn search_memories(
    State(pool): State<SqlitePool>,
    Query(query): Query<SearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let ai_service = AIService::new();
    let query_vector = ai_service.get_embedding(&query.q).await;

    let memories = sqlx::query_as::<_, Memory>("SELECT * FROM memories")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    let mut ranked_memories: Vec<(f32, Memory)> = memories
        .into_iter()
        .map(|mem| {
            let similarity = if let Some(ref embed_str) = mem.embedding {
                if let Ok(vec) = serde_json::from_str::<Vec<f32>>(embed_str) {
                    AIService::cosine_similarity(&query_vector, &vec)
                } else {
                    0.0
                }
            } else {
                0.0
            };
            (similarity, mem)
        })
        .collect();

    ranked_memories.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));

    let results: Vec<Memory> = ranked_memories
        .into_iter()
        .filter(|(score, _)| *score > 0.1)
        .map(|(_, mem)| mem)
        .collect();

    Ok(Json(results))
}

pub async fn voice_query(
    State(pool): State<SqlitePool>,
    Query(query): Query<SearchQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let ai_service = AIService::new();
    let query_vector = ai_service.get_embedding(&query.q).await;
    
    let memories = sqlx::query_as::<_, Memory>("SELECT * FROM memories")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    let mut ranked_memories: Vec<(f32, Memory)> = memories
        .into_iter()
        .map(|mem| {
            let similarity = if let Some(ref embed_str) = mem.embedding {
                if let Ok(vec) = serde_json::from_str::<Vec<f32>>(embed_str) {
                    AIService::cosine_similarity(&query_vector, &vec)
                } else {
                    0.0
                }
            } else {
                0.0
            };
            (similarity, mem)
        })
        .collect();

    ranked_memories.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    
    let context_memories: Vec<Memory> = ranked_memories
        .into_iter()
        .take(3)
        .filter(|(score, _)| *score > 0.1)
        .map(|(_, mem)| mem)
        .collect();

    let mut context_text = String::new();
    for mem in &context_memories {
        context_text.push_str(&format!(
            "- [Memory: {} (Category: {})] Description: {}. AI Narrative: {}\n",
            mem.title,
            mem.category,
            mem.description.as_deref().unwrap_or(""),
            mem.ai_story.as_deref().unwrap_or("")
        ));
    }

    let prompt = format!(
        "You are a loving voice assistant helper for a grandmother or grandfather with dementia. \
         They just asked: \"{}\"\n\n\
         Here is context about their actual family memories retrieved from their Vault:\n{}\n\
         Generate a warm, friendly, short response answering their question based ONLY on the family memories context. \
         Speak directly and gently. Use short, soothing sentences. Do not mention system details, 'embeddings', or 'context'. \
         If there are no relevant memories, say: \"I don't recall that specific memory, but I would love to look at your other photos with you.\"",
        query.q, context_text
    );

    let mut response_text = ai_service.generate_text(&prompt).await.unwrap_or_default();

    if response_text.is_empty() {
        if !context_memories.is_empty() {
            let best_match = &context_memories[0];
            response_text = format!(
                "Oh, I remember that! It reminds me of the memory called '{}'. {} \
                 It is such a beautiful part of our family story.",
                best_match.title,
                best_match.ai_story.as_deref().unwrap_or("That was a truly special day.")
            );
        } else {
            response_text = "I don't recall that specific memory, but I would love to browse your Memory Vault with you, sweetheart.".to_string();
        }
    }

    Ok(Json(json!({ "response": response_text })))
}

// Family Tree & Members
pub async fn create_family_member(
    State(pool): State<SqlitePool>,
    Json(payload): Json<FamilyMemberPayload>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let member_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO family_members (id, name, birth_date, relation, photo_url, bio) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&member_id)
    .bind(&payload.name)
    .bind(&payload.birth_date)
    .bind(&payload.relation)
    .bind(&payload.photo_url)
    .bind(&payload.bio)
    .execute(&pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Failed to create family member: {}", e) })),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": member_id,
            "name": payload.name,
            "relation": payload.relation,
            "message": "Family member profile created successfully"
        })),
    ))
}

pub async fn get_family_members(
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let members = sqlx::query_as::<_, FamilyMember>("SELECT * FROM family_members ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    Ok(Json(members))
}

pub async fn create_relationship(
    State(pool): State<SqlitePool>,
    Json(payload): Json<RelationshipPayload>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let rel_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO relationships (id, member_a_id, member_b_id, relation_type) VALUES (?, ?, ?, ?)"
    )
    .bind(&rel_id)
    .bind(&payload.member_a_id)
    .bind(&payload.member_b_id)
    .bind(&payload.relation_type)
    .execute(&pool)
    .await
    .map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": format!("Failed to create relationship: {}", e) })),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(json!({
            "id": rel_id,
            "message": "Relationship created successfully"
        })),
    ))
}

pub async fn get_relationships(
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let relations = sqlx::query_as::<_, Relationship>("SELECT * FROM relationships")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Database error: {}", e) })),
            )
        })?;

    Ok(Json(relations))
}
