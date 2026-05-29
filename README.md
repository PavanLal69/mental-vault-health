# 👵 Memory Vault

Memory Vault is a complete AI-powered web application designed for families to preserve and protect precious life stories, helping elderly family members suffering from dementia and memory loss rediscover their history.

The application features a high-performance **Rust (Axum) Backend** with JWT authentication and a highly accessible **React (Vite) Frontend** optimized for elderly user interaction.

---

## 🚀 Key Features

1. **Elderly-Friendly UI (Accessibility)**: Clean visual cards with large touch targets, a high-contrast toggle, and a **dynamic font-size scaler (A, A+, A++)** to maximize readability.
2. **Interactive Family Tree**: An SVG-rendered generation tree connecting family members. Click a card to view their biography and immediately filter all memories linked to them.
3. **Voice Assistant**: A simple microphone interface allowing users to ask questions like *"Who is my grandson?"* or *"Tell me about my wedding"* and hear a warm response read aloud.
4. **JWT Security & Auth**: Password hashing using `bcrypt` and route authorization via `jsonwebtoken`.
5. **Auto-Seeding**: Creates and seeds the SQLite database with 4 family members, pre-established relationships, and 3 rich memories on the first launch.

---

## 🧠 Google Gemma Integration

Google Gemma is the core intelligence behind the Memory Vault. It is utilized in two main workflows:

### 1. Memory Story Summarization
When a family member uploads raw notes, transcripts, or journal entries, Gemma converts them into a warm, simple, 3-to-5 sentence story card suitable for cognitive therapy.
* **Prompt Used**:
  > *"You are an empathetic memory care assistant helping someone with dementia. Convert the following raw memory description or audio transcript into a short, engaging, and extremely easy-to-read story. Focus on warm emotions, clear simple sentences, and high readability..."*

### 2. Conversational Voice Assistant
Elderly users speak into the application. The system performs a local semantic vector search (using cosine similarity) on the SQLite database, extracts the relevant memory text, and feeds it to Gemma to answer the user's question with warmth and care.
* **Prompt Used**:
  > *"You are a loving voice assistant helper for a grandmother or grandfather with dementia. They just asked: \"[Question]\" ... Here is context about their actual family memories retrieved from their Vault: [Context] ... Generate a warm, friendly, short response based ONLY on the family memories..."*

### 🔄 Dual Routing (Cloud & Local Offline Fallback)
To ensure the application runs smoothly on any hardware, we implemented a dual-routing pipeline:
* **Together AI Cloud Inference**: If a `TOGETHER_API_KEY` is provided in the `.env` configuration, the backend runs the **`google/gemma-2-27b-it`** model in the cloud for near-instant, high-quality responses.
* **Local Ollama Fallback**: If no internet key is available, the backend automatically attempts to route requests to a local Ollama instance (defaulting to the **`gemma-4-26b-a4b-it`** or **`llama3.2:3b`** model) with a local heuristic narrative fallback to ensure the app never crashes.

---

## 🛠️ Tech Stack

* **Frontend**: React 18, Vite, CSS Variables, Web Speech API (Speech Recognition & Synthesis).
* **Backend**: Rust, Axum, SQLx, Tokio Runtime, Serde.
* **Database**: SQLite (Self-contained, automatically created on boot).

---

## 💻 Setup & Running Locally

### 1. Clone the repository
Ensure you are in the workspace root directory:
```bash
git clone https://github.com/PavanLal69/mental-vault-health.git
cd mental-vault-health
```

### 2. Configure Environment variables
Create a `.env` file inside the `backend` folder (this file is excluded in `.gitignore` to keep your credentials safe):
```env
DATABASE_URL=sqlite://memory_vault.db
PORT=5000
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=google/gemma-2-27b-it
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Together AI Key for Cloud Gemma Inference
TOGETHER_API_KEY=your_together_api_key_here
```

### 3. Run the Backend (Rust)
```bash
cd backend
cargo run
```
*Note: This creates `memory_vault.db` and starts the API server on `http://localhost:5000`.*

### 4. Run the Frontend (React + Vite)
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
*Note: Opens the application interface on `http://localhost:3000`.*

### 🔑 Pre-seeded Login
* **Email**: `family@vault.com`
* **Password**: `password123`
