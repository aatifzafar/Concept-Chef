import os
import json
import uuid
import io
from flask import Flask, render_template, request, jsonify, send_file

# Google Gemini
import google.generativeai as genai

# YouTube transcripts
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# PDFs
from PyPDF2 import PdfReader

# -------------------------------------------------------------
# Configuration
# -------------------------------------------------------------
# ⚠️ REPLACE WITH YOUR REAL KEY
GENAI_API_KEY = "AIzaSyDHXw5eczuOBsnOAax7NvZoJaNrVjNp1MM"

try:
    genai.configure(api_key=GENAI_API_KEY)
except Exception:
    pass

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- In-memory cache for Chatbot Context ---
# Structure: { session_id: { "text": "...", "transcript_data": [...], "meta": {...} } }
CONTENT_CACHE = {}

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------

def extract_video_id(url: str) -> str:
    if not url or not isinstance(url, str):
        raise ValueError("Invalid YouTube URL.")
    url = url.strip()
    if "youtu.be/" in url:
        try: return url.split("youtu.be/")[1].split("?")[0].split("/")[0]
        except: pass
    if "youtube.com" in url or "m.youtube.com" in url:
        if "v=" in url:
            try: return url.split("v=")[1].split("&")[0]
            except: pass
        if "/embed/" in url:
            try: return url.split("/embed/")[1].split("?")[0].split("/")[0]
            except: pass
    import re
    match = re.search(r"([a-zA-Z0-9_-]{11})", url)
    if match: return match.group(1)
    raise ValueError("Could not extract a valid YouTube video ID.")

def get_transcript_data(video_id: str):
    """
    Returns a list of dictionaries: [{'text': '...', 'start': 0.0, 'duration': 1.0}, ...]
    """
    try:
        api = YouTubeTranscriptApi()
        # Fetch raw data to keep timestamps
        transcript_list = api.fetch(video_id, languages=("en", "en-US", "en-GB", "en-CA", "en-IN", "hi"))
        return transcript_list.to_raw_data()
    except Exception as e:
        raise ValueError(f"Failed to fetch transcript: {str(e)}")

def extract_pdf_text(filepath: str) -> str:
    if not os.path.exists(filepath): raise ValueError("Uploaded file not found.")
    try:
        reader = PdfReader(filepath)
        text = "\n".join([(page.extract_text() or "").strip() for page in reader.pages])
        if not text: raise ValueError("Unable to extract text from the PDF.")
        return text
    except Exception as e:
        raise ValueError(f"Failed to read PDF: {str(e)}")

# -------------------------------------------------------------
# AI Logic
# -------------------------------------------------------------

def get_gemini_model(json_mode=True):
    try:
        # Configuration for JSON mode
        config = {"response_mime_type": "application/json"} if json_mode else {}
        
        system_inst = (
            "You are Concept-Chef. Output STRICT JSON only." if json_mode else 
            "You are Concept-Chef, a helpful tutor. Answer questions based ONLY on the context provided."
        )

        # FIXED MODEL NAME: Using 'gemini-1.5-flash-001' which is the specific version ID
        # If this still fails, run: pip install --upgrade google-generativeai
        return genai.GenerativeModel(
            model_name="gemini-flash-latest", 
            generation_config=config, 
            system_instruction=system_inst
        )
    except Exception:
        return None

def build_prompt(raw_text: str, persona: str, q_count: int, difficulty: str) -> str:
    schema = """
    Output STRICT JSON only. Keys:
    {
      "summary": ["Bullet 1", "Bullet 2", "Bullet 3"],
      "analogy_title": "Creative Title",
      "analogy_content": "Metaphorical explanation...",
      "mind_map": "graph TD; A[Main Concept] --> B(Sub-concept 1); ...", 
      "quiz": [
        { "question": "...", "options": ["..."], "answer_index": 0, "feedback": "..." }
      ]
    }
    """
    # Limit text length to prevent token overflow on initial load
    return (
        f"Persona: {persona}\n"
        f"Task: Simplify content, create an analogy, generate a quiz, and create a Mermaid.js flowchart syntax.\n"
        f"Quiz Settings: Generate exactly {q_count} questions. Difficulty level: {difficulty}.\n"
        f"Mind Map Settings: Create a 'graph TD' flowchart. Keep labels concise (max 4-5 words).\n"
        f"Content:\n{raw_text[:25000]}\n\n"
        f"{schema}"
    )

def parse_gemini_json(text: str):
    if not text: raise ValueError("Empty response from AI.")
    try: return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find('{'), text.rfind('}')
        if start != -1 and end != -1: return json.loads(text[start:end+1])
        raise

# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    try:
        source_type = request.form.get('source_type', '').strip().lower()
        style = request.form.get('style', '').strip()
        q_count = request.form.get('q_count', '5')
        difficulty = request.form.get('difficulty', 'Mix')
        
        # Validate question count
        try:
            q_count = int(q_count)
            if q_count < 1 or q_count > 100:
                return jsonify({"status": "error", "message": "Questions must be between 1 and 100."}), 400
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Invalid question count."}), 400

        raw_text_full = ""
        transcript_data = None # List of dicts for YouTube
        video_id = None

        if source_type == 'youtube':
            url = request.form.get('url', '').strip()
            video_id = extract_video_id(url)
            transcript_data = get_transcript_data(video_id)
            # Create a plain string for the main summary generation
            raw_text_full = " ".join([item['text'] for item in transcript_data])
        elif source_type == 'pdf':
            if 'file' not in request.files: return jsonify({"status": "error", "message": "PDF file is required."}), 400
            f = request.files['file']
            if not f or f.filename == '': return jsonify({"status": "error", "message": "Invalid PDF."}), 400
            save_path = os.path.join(UPLOAD_DIR, os.path.basename(f.filename))
            f.save(save_path)
            raw_text_full = extract_pdf_text(save_path)
        else:
             return jsonify({"status": "error", "message": "Invalid source type."}), 400

        # --- CACHE CONTEXT ---
        session_id = str(uuid.uuid4())
        CONTENT_CACHE[session_id] = {
            "text": raw_text_full,
            "transcript_data": transcript_data, # Only exists for YouTube
            "meta": {
                "source": source_type,
                "video_id": video_id,
                "style": style
            }
        }

        # --- CALL AI ---
        model = get_gemini_model(json_mode=True)
        if not model: raise ValueError("Gemini model not initialized.")
        
        prompt = build_prompt(raw_text_full, style, q_count, difficulty)
        resp = model.generate_content(prompt)
        ai_text = getattr(resp, 'text', None) or resp.candidates[0].content.parts[0].text
        data = parse_gemini_json(ai_text)

        return jsonify({
            "status": "success",
            "data": data,
            "video_id": video_id,
            "session_id": session_id
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    session_id = data.get('session_id')
    user_msg = data.get('message')

    if not session_id or session_id not in CONTENT_CACHE:
        return jsonify({"reply": "Session expired."})

    cache = CONTENT_CACHE[session_id]
    
    # Prepare Context
    # If we have transcript data with timestamps, we format it so Gemini can see the time.
    if cache.get('transcript_data'):
        # Format: [120] This is what was said at 2 minutes.
        # We group text slightly to save tokens if needed, but for now 1:1 mapping.
        context_str = ""
        for item in cache['transcript_data']:
            start_sec = int(item['start'])
            text = item['text']
            context_str += f"[{start_sec}] {text} "
        
        # Limit context size roughly
        context_str = context_str[:40000] 
        
        instructions = (
            "Instructions: You are a tutor. Answer the user question based on the transcript provided.\n"
            "IMPORTANT: When referring to specific parts of the video, YOU MUST CITE THE TIMESTAMP in the format [seconds].\n"
            "Example: 'The concept is explained at [120] and later at [450].'\n"
            "Do not use HH:MM:SS, just total seconds in brackets."
        )
    else:
        # PDF / Plain text context
        context_str = cache['text'][:30000]
        instructions = "Instructions: Answer briefly based on the provided text."

    try:
        model = get_gemini_model(json_mode=False)
        chat_prompt = f"{instructions}\n\nContext:\n{context_str}\n\nUser Question: {user_msg}"
        resp = model.generate_content(chat_prompt)
        return jsonify({"reply": resp.text})
    except Exception as e:
        return jsonify({"reply": "Sorry, I encountered an error."})

@app.route('/export', methods=['GET'])
def export_notes():
    session_id = request.args.get('session_id')
    if not session_id or session_id not in CONTENT_CACHE:
        return "Session expired", 404

    cache = CONTENT_CACHE[session_id]
    meta = cache['meta']
    
    # Generate Markdown Content
    md_content = f"# Concept Chef Notes\n\n"
    md_content += f"**Source:** {meta['source'].upper()}\n"
    md_content += f"**Persona:** {meta['style']}\n"
    if meta['video_id']:
        md_content += f"**Video Link:** https://youtu.be/{meta['video_id']}\n"
    
    md_content += "\n---\n## Full Transcript / Content\n\n"
    md_content += cache['text']
    
    # Create file object
    mem_file = io.BytesIO()
    mem_file.write(md_content.encode('utf-8'))
    mem_file.seek(0)
    
    return send_file(
        mem_file,
        as_attachment=True,
        download_name=f"concept_chef_notes_{session_id[:8]}.md",
        mimetype="text/markdown"
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)