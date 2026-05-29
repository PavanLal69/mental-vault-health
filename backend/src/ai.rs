use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AIService {
    pub ollama_url: String,
    pub model_name: String,
    pub embedding_model: String,
    pub hf_token: Option<String>,
}

impl AIService {
    pub fn new() -> Self {
        let ollama_url = std::env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string());
        let model_name = std::env::var("OLLAMA_MODEL").unwrap_or_else(|_| "google/gemma-4-26b-a4b-it".to_string());
        let embedding_model = std::env::var("OLLAMA_EMBEDDING_MODEL").unwrap_or_else(|_| "nomic-embed-text".to_string());
        
        let hf_token = std::env::var("TOGETHER_API_KEY")
            .ok()
            .or_else(|| std::env::var("HF_TOKEN").ok())
            .filter(|s| !s.trim().is_empty());
        
        Self {
            ollama_url,
            model_name,
            embedding_model,
            hf_token,
        }
    }

    /// Helper to generate text from Together AI, Hugging Face, or local Ollama
    pub async fn generate_text(&self, prompt: &str) -> Option<String> {
        if let Some(ref token) = self.hf_token {
            if token.starts_with("vck_") {
                println!("Calling Together AI API for model: {}", self.model_name);
                self.call_together_api(prompt, token).await
            } else {
                println!("Calling Hugging Face Inference API for model: {}", self.model_name);
                self.call_huggingface_api(prompt, token).await
            }
        } else {
            println!("Calling local Ollama API on: {} for model: {}", self.ollama_url, self.model_name);
            let client = Client::builder()
                .timeout(Duration::from_secs(12))
                .build()
                .unwrap_or_default();

            let payload = json!({
                "model": self.model_name,
                "prompt": prompt,
                "stream": false
            });

            if let Ok(res) = client
                .post(format!("{}/api/generate", self.ollama_url))
                .json(&payload)
                .send()
                .await
            {
                if res.status().is_success() {
                    if let Ok(json_res) = res.json::<serde_json::Value>().await {
                        if let Some(story) = json_res.get("response").and_then(|v| v.as_str()) {
                            return Some(story.trim().to_string());
                        }
                    }
                }
            }
            None
        }
    }

    async fn call_together_api(&self, prompt: &str, token: &str) -> Option<String> {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        let url = "https://api.together.xyz/v1/chat/completions";

        // Map model name. If the model name is google/gemma-4-26b-a4b-it,
        // Together API uses gemma model IDs like google/gemma-2-27b-it or google/gemma-2-9b-it.
        // We will default to their model, but fallback to google/gemma-2-27b-it if needed.
        let model = if self.model_name.contains("/") {
            &self.model_name
        } else {
            "google/gemma-2-27b-it"
        };

        let payload = json!({
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "max_tokens": 300,
            "temperature": 0.7
        });

        if let Ok(res) = client
            .post(url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&payload)
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(json_res) = res.json::<serde_json::Value>().await {
                    if let Some(choices) = json_res.get("choices").and_then(|v| v.as_array()) {
                        if let Some(first) = choices.first() {
                            if let Some(message) = first.get("message") {
                                if let Some(content) = message.get("content").and_then(|v| v.as_str()) {
                                    return Some(content.trim().to_string());
                                }
                            }
                        }
                    }
                }
            } else {
                println!("Together AI API returned error status: {}", res.status());
                if let Ok(err_text) = res.text().await {
                    println!("Together AI Error Details: {}", err_text);
                }
            }
        }
        None
    }

    async fn call_huggingface_api(&self, prompt: &str, token: &str) -> Option<String> {
        let client = Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        let url = format!("https://api-inference.huggingface.co/models/{}", self.model_name);

        let payload = json!({
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 300,
                "return_full_text": false
            }
        });

        if let Ok(res) = client
            .post(&url)
            .header("Authorization", format!("Bearer {}", token))
            .json(&payload)
            .send()
            .await
        {
            if res.status().is_success() {
                if let Ok(text) = res.text().await {
                    if let Ok(json_list) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
                        if let Some(first) = json_list.first() {
                            if let Some(generated_text) = first.get("generated_text").and_then(|v| v.as_str()) {
                                return Some(generated_text.trim().to_string());
                            }
                        }
                    } else if let Ok(json_dict) = serde_json::from_str::<serde_json::Value>(&text) {
                        if let Some(generated_text) = json_dict.get("generated_text").and_then(|v| v.as_str()) {
                            return Some(generated_text.trim().to_string());
                        }
                    }
                }
            } else {
                println!("Hugging Face API returned error status: {}", res.status());
            }
        }
        None
    }

    /// Generates a simplified, easy-to-read, memory-retrieval story from raw text notes or voice transcripts.
    pub async fn generate_memory_story(&self, raw_input: &str, category: &str) -> String {
        let system_prompt = format!(
            "You are an empathetic memory care assistant helping someone with dementia. \
             Convert the following raw memory description or audio transcript into a short, engaging, and extremely easy-to-read story. \
             Focus on warm emotions, clear simple sentences, and high readability. Keep it between 3 to 5 sentences. \
             Category of memory: {}. Raw Memory Context: {}",
            category, raw_input
        );

        if let Some(story) = self.generate_text(&system_prompt).await {
            story
        } else {
            self.generate_fallback_story(raw_input, category)
        }
    }

    /// Generates a vector embedding for a piece of text (used for semantic search).
    pub async fn get_embedding(&self, text: &str) -> Vec<f32> {
        let client = Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap_or_default();

        let payload = json!({
            "model": self.embedding_model,
            "prompt": text
        });

        if let Ok(res) = client
            .post(format!("{}/api/embeddings", self.ollama_url))
            .json(&payload)
            .send()
            .await
        {
            if res.status().is_success() {
                #[derive(Deserialize)]
                struct EmbedResponse {
                    embedding: Vec<f32>,
                }
                if let Ok(embed_res) = res.json::<EmbedResponse>().await {
                    return embed_res.embedding;
                }
            }
        }

        // Fallback embedding: deterministic vector of length 128 based on word frequencies
        self.generate_fallback_embedding(text)
    }

    /// Helper to compute cosine similarity between two vectors
    pub fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
        if v1.len() != v2.len() || v1.is_empty() {
            return 0.0;
        }
        let dot_product: f32 = v1.iter().zip(v2.iter()).map(|(x, y)| x * y).sum();
        let norm_v1: f32 = v1.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_v2: f32 = v2.iter().map(|y| y * y).sum::<f32>().sqrt();
        
        if norm_v1 == 0.0 || norm_v2 == 0.0 {
            return 0.0;
        }
        dot_product / (norm_v1 * norm_v2)
    }

    fn generate_fallback_story(&self, raw_input: &str, category: &str) -> String {
        let sentences: Vec<&str> = raw_input.split(|c| c == '.' || c == '!' || c == '?').collect();
        let first_sentence = sentences.first().unwrap_or(&raw_input).trim();
        
        if first_sentence.is_empty() {
            return format!("A beautiful memory kept safe in the Vault under {}.", category);
        }

        format!(
            "This is a wonderful memory about {}. It brings back memories of {} days. \
             Looking at this reminds us of the laughter, love, and special details shared together. \
             It is a precious moment that will always stay in our hearts.",
            first_sentence,
            category.to_lowercase()
        )
    }

    fn generate_fallback_embedding(&self, text: &str) -> Vec<f32> {
        let mut embedding = vec![0.0; 128];
        let words: Vec<&str> = text.split_whitespace().collect();
        
        for word in words {
            let hash = word.bytes().fold(0u32, |acc, b| acc.wrapping_add(b as u32));
            let idx = (hash % 128) as usize;
            embedding[idx] += 1.0;
        }
        
        let sum_sq: f32 = embedding.iter().map(|x| x * x).sum();
        let magnitude = sum_sq.sqrt();
        
        if magnitude > 0.0 {
            for val in embedding.iter_mut() {
                *val /= magnitude;
            }
        }
        
        embedding
    }
}
