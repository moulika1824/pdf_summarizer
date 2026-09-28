from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import shutil

from ask_question import ask_pdf
from build_database import build_real_database

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


app = Flask(__name__)

# Enable CORS for frontend requests
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    }
)

UPLOAD_FOLDER = os.path.abspath("./uploads")
IMAGE_FOLDER = os.path.abspath("./extracted_images")
DATABASE_FOLDER = os.path.abspath("./chroma_db")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(IMAGE_FOLDER, exist_ok=True)


# -----------------------------------------
# TEST BACKEND CONNECTION
# -----------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "success",
        "message": "PDF Assistant backend is running!"
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "success",
        "message": "Backend is connected."
    })


# -----------------------------------------
# PDF UPLOAD ROUTE
# -----------------------------------------

@app.route("/api/upload", methods=["POST", "OPTIONS"])
def upload_file():

    if request.method == "OPTIONS":
        return "", 204

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a valid PDF file"}), 400

    try:
        print("Receiving PDF:", file.filename)

        filepath = os.path.join(UPLOAD_FOLDER, "current_doc.pdf")
        file.save(filepath)

        # Clear old ChromaDB collection
        if os.path.exists(DATABASE_FOLDER):
            try:
                print("Clearing old vector database...")

                embeddings = HuggingFaceEmbeddings(
                    model_name="all-MiniLM-L6-v2"
                )

                old_db = Chroma(
                    persist_directory=DATABASE_FOLDER,
                    embedding_function=embeddings
                )

                old_db.delete_collection()

            except Exception as e:
                print("Database cleanup warning:", e)

        # Clear previously extracted images
        if os.path.exists(IMAGE_FOLDER):
            try:
                shutil.rmtree(IMAGE_FOLDER)
            except PermissionError as e:
                print("Image folder cleanup warning:", e)

        os.makedirs(IMAGE_FOLDER, exist_ok=True)

        # Build the vector database
        print("Building the vector database...")

        build_real_database(filepath)

        print("PDF processing completed successfully!")

        return jsonify({
            "message": "File processed successfully! The AI is ready for your questions."
        }), 200

    except Exception as e:
        print("UPLOAD ERROR:", repr(e))

        return jsonify({
            "error": str(e)
        }), 500


# -----------------------------------------
# ASK QUESTION ROUTE
# -----------------------------------------

@app.route("/api/ask", methods=["POST", "OPTIONS"])
def handle_question():

    # Handle browser preflight request
    if request.method == "OPTIONS":
        return "", 204

    try:
        data = request.get_json(silent=True) or {}

        user_question = data.get("question", "").strip()

        if not user_question:
            return jsonify({
                "error": "Please enter a question."
            }), 400

        print("Question received:", user_question)

        # Get answer from the AI
        result = ask_pdf(user_question)

        print("Answer generated successfully!")

        return jsonify(result), 200

    except Exception as e:
        print("QUESTION ERROR:", repr(e))

        return jsonify({
            "error": str(e)
        }), 500


# -----------------------------------------
# SERVE EXTRACTED IMAGES
# -----------------------------------------

@app.route("/api/images/<path:filename>", methods=["GET"])
def serve_image(filename):

    image_path = os.path.join(IMAGE_FOLDER, filename)

    if os.path.isfile(image_path):
        return send_from_directory(IMAGE_FOLDER, filename)

    return jsonify({
        "error": "Image not found"
    }), 404


# -----------------------------------------
# RUN FLASK SERVER
# -----------------------------------------

if __name__ == "__main__":

    print("Starting PDF Assistant backend...")

    print("Registered routes:")
    print(app.url_map)

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )