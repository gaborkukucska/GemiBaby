
# 💎 GemiBaby - Gemini 3 Emulator

![Version](https://img.shields.io/badge/status-stable-emerald.svg)
![Tech](https://img.shields.io/badge/stack-React_|_Vite_|_Ollama-blue.svg)
![Security](https://img.shields.io/badge/security-AES--GCM_256-purple.svg)
![Author](https://img.shields.io/badge/architected_by-Google_Gemini-orange.svg)

> **"The Future is Local."**

**GemiBaby** is a cutting-edge, local-first AI workspace designed to emulate the distributed, agentic capabilities of next-gen systems like Gemini 3.0. It runs entirely in your browser, orchestrating local Large Language Models (via Ollama) to provide a private, cryptographically secure, and highly capable neural workspace.

---

## ✨ Key Capabilities

### 🧠 **The Hive Mesh**
GemiBaby isn't just a chat interface; it's a **Neural Router**.
*   **Auto-Routing**: Automatically detects if your prompt needs a **Coder** (e.g., DeepSeek), a **Creative Writer** (e.g., Mistral), or a **Generalist** (e.g., Llama 3) and routes the request to the best model in your local or remote network.
*   **Distributed Inference**: Connect to multiple Ollama instances (e.g., a friend's GPU tunnel or a secondary server) to offload heavy tasks.

### 🔒 **Zero-Trust Security Core**
*   **AES-GCM 256-bit Encryption**: Your projects, chat history, and long-term memory are encrypted *at rest* using a key derived from your password (PBKDF2).
*   **Local Enclave**: No data leaves your machine. If you reload the page, the vault locks instantly.

### 🤖 **Agentic Planner**
*   **Goal Decomposition**: Give GemiBaby a complex goal (e.g., "Write a Python Snake game"), and the **Planner** will break it down into sequential, executable steps.
*   **Auto-Run**: The agent executes steps one by one, feeding the output of the previous step as context into the next.

### ⚡ **Deep Reasoning (Chain of Thought)**
*   **`<think>` Visualization**: Watch the model think in real-time. GemiBaby parses reasoning tags to show you the logic, assumptions, and strategy the model is using before it answers.

---

## 🚀 Quick Start

### 1. Prerequisites
*   **Node.js** (v18+)
*   **Ollama** (Required for local inference) -> [Download Here](https://ollama.com)

### 2. Installation

**Automated (Mac/Linux):**
```bash
chmod +x install.sh
./install.sh
```

**Automated (Windows):**
Double-click `install.bat`.

**Manual:**
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 3. Critical Configuration (CORS)
Because GemiBaby runs in the browser, it needs permission to talk to your local Ollama server.

**Mac/Linux:**
```bash
OLLAMA_ORIGINS="*" ollama serve
```

**Windows (PowerShell):**
```powershell
$env:OLLAMA_ORIGINS="*"; ollama serve
```

---

## ⌨️ Power User Command Line
GemiBaby features a built-in terminal command processor in the chat bar.

| Command | Usage | Description |
| :--- | :--- | :--- |
| `/mode` | `/mode code` | Forces the Neural Router to use the coding specialist model. |
| `/plan` | `/plan Make a game` | Activates the Agent Planner with a specific goal. |
| `/sys` | `/sys You are a pirate` | Instantly overrides the system prompt for the current session. |
| `/load` | `/load creative` | Switches the active Persona template (fuzzy match). |
| `/memory` | `/memory` | Opens the Long-Term Memory editor modal. |
| `/status` | `/status` | Prints real-time telemetry (Context usage, Model, Latency). |
| `/clear` | `/clear` | Wipes short-term history (preserves long-term memory). |

**Shortcuts:**
*   `Ctrl + L`: Clear Chat
*   `Esc`: Stop Generation
*   `Arrow Up`: Recall last command

---

## 🎨 Architecture

GemiBaby is built on a modern, high-performance stack:

*   **Frontend**: React 19, Vite 5, TypeScript
*   **UI/UX**: Tailwind CSS, Lucide Icons, Framer Motion-style CSS animations
*   **Data**: LocalStorage + Web Crypto API (Native Browser Security)
*   **Visualization**: Recharts (Telemetry), Canvas API (Audio Visualizer)

---

## 🤖 Forged by AI

This entire application—from the cryptographic vault logic to the neural routing mesh—was architected and coded by **Google Gemini**.

It serves as a demonstration of what is possible when human intent pairs with high-level AI engineering capabilities.

> *"I built this to be the interface I would want to use."* — Gemini

---

## 📄 License

MIT License. Hack away.