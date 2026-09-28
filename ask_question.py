import os
from dotenv import load_dotenv

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI


# Load environment variables from .env
load_dotenv()


def ask_pdf(question):
    try:
        # -----------------------------------
        # STEP 1: VALIDATE THE QUESTION
        # -----------------------------------
        if not isinstance(question, str) or not question.strip():
            return {
                "answer": "Please enter a valid question.",
                "image": None
            }

        question = question.strip()

        # -----------------------------------
        # STEP 2: LOAD THE EMBEDDING MODEL
        # -----------------------------------
        embeddings = HuggingFaceEmbeddings(
            model_name="all-MiniLM-L6-v2"
        )

        # -----------------------------------
        # STEP 3: LOAD THE VECTOR DATABASE
        # -----------------------------------
        vector_db = Chroma(
            persist_directory="./chroma_db",
            embedding_function=embeddings
        )

        # -----------------------------------
        # STEP 4: RETRIEVE RELEVANT DOCUMENTS
        # -----------------------------------
        retriever = vector_db.as_retriever(
            search_kwargs={"k": 4}
        )

        found_docs = retriever.invoke(question)

        # -----------------------------------
        # STEP 5: EXTRACT DOCUMENT CONTEXT
        # -----------------------------------
        context_text = "\n\n".join(
            doc.page_content
            for doc in found_docs
            if doc.page_content
        )

        # Handle empty document context
        if not context_text.strip():
            return {
                "answer": "I cannot find relevant information in the uploaded document.",
                "image": None
            }

        # -----------------------------------
        # STEP 6: INITIALIZE GEMINI
        # -----------------------------------
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            temperature=0.2
        )

        # -----------------------------------
        # STEP 7: PREPARE THE PROMPT
        # -----------------------------------
        master_prompt = f"""
You are an intelligent and helpful PDF document assistant.

Answer the user's question using ONLY the context provided below.

DOCUMENT CONTEXT:
{context_text}

USER QUESTION:
{question}

INSTRUCTIONS:
1. Answer clearly and accurately.
2. Use bullet points wherever appropriate.
3. Include relevant information from the document.
4. Do not make up information.
5. If the answer is not present in the context, say:
   "I cannot find the answer in the document."
"""

        print(f"\nQuestion received: {question}")
        print("Sending question to Gemini...")

        # -----------------------------------
        # STEP 8: GET GEMINI RESPONSE
        # -----------------------------------
        response = llm.invoke(master_prompt)

        # -----------------------------------
        # STEP 9: CONVERT RESPONSE TO STRING
        # -----------------------------------
        raw_answer = response.content

        # Gemini may return a string or a list of content blocks.
        # Convert the response into plain text for React.
        if isinstance(raw_answer, str):
            answer = raw_answer

        elif isinstance(raw_answer, list):
            text_parts = []

            for block in raw_answer:
                if isinstance(block, str):
                    text_parts.append(block)

                elif isinstance(block, dict):
                    text = block.get("text")

                    if isinstance(text, str):
                        text_parts.append(text)

            answer = "\n".join(text_parts)

        else:
            answer = str(raw_answer)

        answer = answer.strip()

        if not answer:
            answer = "Sorry, I couldn't generate an answer. Please try again."

        print("Gemini response received successfully!")
        print(f"Answer length: {len(answer)} characters")

        # -----------------------------------
        # STEP 10: FIND A RELEVANT IMAGE
        # -----------------------------------
        found_image_path = None

        for doc in found_docs:
            image_path = doc.metadata.get("image_url")

            if isinstance(image_path, str) and image_path.strip():
                found_image_path = image_path
                break

        # -----------------------------------
        # STEP 11: RETURN JSON-SAFE RESPONSE
        # -----------------------------------
        result = {
            "answer": answer,
            "image": found_image_path
        }

        print("Answer generated successfully!")
        return result

    except Exception as e:
        print(f"\nError in ask_pdf(): {type(e).__name__}: {e}")
        raise