use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs::File;
use std::path::Path;

pub async fn init_db(database_url: &str) -> SqlitePool {
    let db_path = database_url.trim_start_matches("sqlite://");
    
    if !Path::new(db_path).exists() {
        println!("Creating database file at: {}", db_path);
        if let Some(parent) = Path::new(db_path).parent() {
            std::fs::create_dir_all(parent).unwrap_or_default();
        }
        File::create(db_path).expect("Failed to create database file");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Failed to connect to SQLite database");

    run_migrations(&pool).await;
    seed_data(&pool).await;

    pool
}

async fn run_migrations(pool: &SqlitePool) {
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create users table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS memories (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            ai_story TEXT,
            category TEXT NOT NULL,
            media_url TEXT,
            media_type TEXT NOT NULL,
            event_date TEXT,
            embedding TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create memories table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS family_members (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            birth_date TEXT,
            relation TEXT NOT NULL,
            photo_url TEXT,
            bio TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create family_members table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS relationships (
            id TEXT PRIMARY KEY NOT NULL,
            member_a_id TEXT NOT NULL,
            member_b_id TEXT NOT NULL,
            relation_type TEXT NOT NULL,
            FOREIGN KEY(member_a_id) REFERENCES family_members(id) ON DELETE CASCADE,
            FOREIGN KEY(member_b_id) REFERENCES family_members(id) ON DELETE CASCADE
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create relationships table");

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS memory_links (
            memory_id TEXT NOT NULL,
            member_id TEXT NOT NULL,
            PRIMARY KEY (memory_id, member_id),
            FOREIGN KEY(memory_id) REFERENCES memories(id) ON DELETE CASCADE,
            FOREIGN KEY(member_id) REFERENCES family_members(id) ON DELETE CASCADE
        );"
    )
    .execute(pool)
    .await
    .expect("Failed to create memory_links table");

    println!("Database migrations completed successfully.");
}

async fn seed_data(pool: &SqlitePool) {
    let count_users: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(pool)
        .await
        .unwrap_or(0);

    if count_users == 0 {
        println!("Seeding database with default mock family data...");
        
        let user_id = "u1111111-1111-1111-1111-111111111111";
        let email = "family@vault.com";
        let password_hash = bcrypt::hash("password123", bcrypt::DEFAULT_COST).unwrap();
        let name = "Miller Family";
        let role = "admin";
        
        sqlx::query(
            "INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(user_id)
        .bind(email)
        .bind(password_hash)
        .bind(name)
        .bind(role)
        .execute(pool)
        .await
        .unwrap();

        let g1_id = "m1111111-1111-1111-1111-111111111111"; // Robert (Grandfather)
        let g2_id = "m2222222-2222-2222-2222-222222222222"; // Helen (Grandmother)
        let c1_id = "m3333333-3333-3333-3333-333333333333"; // Sarah (Daughter)
        let k1_id = "m4444444-4444-4444-4444-444444444444"; // Jack (Grandson)

        sqlx::query(
            "INSERT INTO family_members (id, name, birth_date, relation, photo_url, bio) VALUES 
             (?, 'Robert Miller', '1942-08-15', 'Grandfather', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop', 'Loving grandfather, retired woodworker, loves jazz music and outdoor fishing.'),
             (?, 'Helen Miller', '1945-04-22', 'Grandmother', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop', 'Generous grandmother, former elementary school teacher, famous for baking delicious apple pies.'),
             (?, 'Sarah Smith', '1970-11-05', 'Daughter', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop', 'Robert and Helen''s daughter. Creative designer, organizer of all family dinners.'),
             (?, 'Jack Smith', '2000-02-12', 'Grandson', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop', 'Sarah''s son, Helen and Robert''s grandson. Aspiring tech developer, loves playing guitar.')"
        )
        .bind(g1_id)
        .bind(g2_id)
        .bind(c1_id)
        .bind(k1_id)
        .execute(pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO relationships (id, member_a_id, member_b_id, relation_type) VALUES 
             ('r1', ?, ?, 'spouse'),
             ('r2', ?, ?, 'parent-child'),
             ('r3', ?, ?, 'parent-child'),
             ('r4', ?, ?, 'parent-child')"
        )
        .bind(g1_id)
        .bind(g2_id)
        .bind(g1_id)
        .bind(c1_id)
        .bind(g2_id)
        .bind(c1_id)
        .bind(c1_id)
        .bind(k1_id)
        .execute(pool)
        .await
        .unwrap();

        let ai = crate::ai::AIService::new();
        
        let mem1_id = "mem11111-1111-1111-1111-111111111111";
        let mem1_title = "Cabin Trip at Lake Chelan 1985";
        let mem1_desc = "Our summer trip to the log cabin at Lake Chelan. Robert taught Sarah how to fish, and Helen baked blueberry cobbler over the campfire. It was a beautiful sunny week.";
        let mem1_story = ai.generate_memory_story(mem1_desc, "Travel").await;
        let mem1_embed = serde_json::to_string(&ai.get_embedding(mem1_desc).await).unwrap();

        let mem2_id = "mem22222-2222-2222-2222-222222222222";
        let mem2_title = "Helen & Robert Wedding 1968";
        let mem2_desc = "Our wedding day in Denver, Colorado. Helen wore a beautiful white lace gown and Robert wore a classic dark suit. We danced our first dance to Etta James. All our close friends and family were there.";
        let mem2_story = ai.generate_memory_story(mem2_desc, "Marriage").await;
        let mem2_embed = serde_json::to_string(&ai.get_embedding(mem2_desc).await).unwrap();

        let mem3_id = "mem33333-3333-3333-3333-333333333333";
        let mem3_title = "Grandson Jack's First Steps 2002";
        let mem3_desc = "Grandson Jack took his very first steps in the living room today. Helen was cheering him on and Robert captured it on the video camera. Jack was laughing and hugging the teddy bear.";
        let mem3_story = ai.generate_memory_story(mem3_desc, "Family").await;
        let mem3_embed = serde_json::to_string(&ai.get_embedding(mem3_desc).await).unwrap();

        sqlx::query(
            "INSERT INTO memories (id, title, description, ai_story, category, media_url, media_type, event_date, embedding) VALUES 
             (?, ?, ?, ?, 'Travel', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop', 'image', '1985-07-15', ?),
             (?, ?, ?, ?, 'Marriage', 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop', 'image', '1968-06-08', ?),
             (?, ?, ?, ?, 'Family', 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&h=600&fit=crop', 'image', '2002-05-18', ?)"
        )
        .bind(mem1_id)
        .bind(mem1_title)
        .bind(mem1_desc)
        .bind(mem1_story)
        .bind(mem1_embed)
        .bind(mem2_id)
        .bind(mem2_title)
        .bind(mem2_desc)
        .bind(mem2_story)
        .bind(mem2_embed)
        .bind(mem3_id)
        .bind(mem3_title)
        .bind(mem3_desc)
        .bind(mem3_story)
        .bind(mem3_embed)
        .execute(pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO memory_links (memory_id, member_id) VALUES (?, ?), (?, ?), (?, ?), (?, ?)"
        )
        .bind(mem1_id)
        .bind(g1_id)
        .bind(mem1_id)
        .bind(c1_id)
        .bind(mem2_id)
        .bind(g1_id)
        .bind(mem2_id)
        .bind(g2_id)
        .execute(pool)
        .await
        .unwrap();

        println!("Default mock family data seeded successfully.");
    }
}
