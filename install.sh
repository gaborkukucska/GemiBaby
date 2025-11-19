
#!/bin/bash

echo "💎 GemiBaby Installer & Environment Setup"
echo "======================================"

# 1. Check & Install Ollama
if ! command -v ollama &> /dev/null; then
    echo "⚠️  Ollama not found. Installing..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "✅ Ollama detected."
fi

# 2. Start Server in background if not running
if ! pgrep -x "ollama" > /dev/null; then
    echo "🚀 Starting Ollama server..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 5 # Give it time to spin up
fi

# 3. Model Provisioning
echo "🧠 Checking Model Inventory..."

pull_if_missing() {
    if ! ollama list | grep -q "$1"; then
        echo "⬇️  Downloading $2 model ($1)..."
        ollama pull "$1"
    else
        echo "✅ $2 model ($1) ready."
    fi
}

# User Preferences (Env Vars)
GENERAL_MODEL=${GEMIBABY_GENERAL:-"llama3"}
CODER_MODEL=${GEMIBABY_CODER:-"deepseek-coder"}
VISION_MODEL=${GEMIBABY_VISION:-"llava"}

echo "⚙️  Target Configuration:"
echo "   - General: $GENERAL_MODEL"
echo "   - Coder:   $CODER_MODEL"
echo "   - Vision:  $VISION_MODEL"

pull_if_missing "$GENERAL_MODEL" "General Chat"
pull_if_missing "$CODER_MODEL" "Coding Specialist"
pull_if_missing "$VISION_MODEL" "Computer Vision"

echo ""
echo "📦 Installing App Dependencies..."
npm install

echo ""
echo "💎 GemiBaby Environment Ready!"
echo "   To start: npm run dev"
