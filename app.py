from flask import Flask, request, jsonify
from flask_cors import CORS
import requests, os
from dotenv import load_dotenv
from textblob import TextBlob

load_dotenv()
app = Flask(__name__)

# ✅ Enable CORS: allow your frontend domain or '*' for testing
CORS(app, origins=["https://feelgoodbot.vercel.app", "http://localhost:3000"])

API_KEY = os.getenv("OPENROUTER_API_KEY")

@app.route("/", methods=["GET"])
def home():
    return "✅ Flask is running!"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])

    if not API_KEY:
        return jsonify({"error": "API key not set"}), 500

    # Grab the last user message
    user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    lower_msg = user_msg.lower()
    polarity = TextBlob(user_msg).sentiment.polarity

    # Mood logic
    if "broken" in lower_msg or "hopeless" in lower_msg:
        mood = "😭"
    elif any(w in lower_msg for w in ["sad", "depressed", "worthless", "lonely", "tired"]):
        mood = "🔴"
    elif any(w in lower_msg for w in ["angry", "frustrated", "mad"]):
        mood = "😠"
    elif any(w in lower_msg for w in ["confused", "lost", "unsure"]):
        mood = "😐"
    elif any(w in lower_msg for w in ["happy", "great", "awesome", "joyful", "fantastic"]):
        mood = "🟢"
    elif any(w in lower_msg for w in ["confident", "strong", "powerful"]):
        mood = "😎"
    elif polarity < -0.5:
        mood = "🔴"
    elif polarity < 0:
        mood = "😐"
    elif polarity < 0.5:
        mood = "🟡"
    else:
        mood = "🟢"

    system_prompt = {
        "role": "system",
        "content": (
            "You are a kind and empathetic AI wellness assistant. "
            "Always be supportive, gentle, and understanding in your replies."
            + (" Be extra comforting and encouraging — the user seems upset." if mood in ["😭", "🔴", "😠"] else "")
        )
    }

    full_messages = [system_prompt] + [m for m in messages if m["role"] != "system"]

    try:
        res = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openai/gpt-3.5-turbo",
                "messages": full_messages
            }
        )
        res.raise_for_status()
        reply = res.json()["choices"][0]["message"]["content"]
        return jsonify({"reply": reply, "mood": mood})
    except Exception as e:
        print("❌ Error in chat API call:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("🚀 Starting Flask App...")
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
