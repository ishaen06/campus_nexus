import os
import json
from google import genai
from google.genai import types

# Initialize client if API key is present
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

def calculate_compatibility(user1, user2) -> dict:
    if not client:
        # Mock response when no API key is provided
        return {"score": 85, "reasoning": "You both have similar academic interests and could collaborate well."}
        
    prompt = f"""
    Analyze the compatibility of these two engineering students for networking and collaboration.
    Student 1: Branch: {user1.branch}, Interests: {user1.interests}, Goals: {user1.goals}
    Student 2: Branch: {user2.branch}, Interests: {user2.interests}, Goals: {user2.goals}
    
    Return a JSON object with two fields:
    - "score": an integer from 0 to 100 representing compatibility.
    - "reasoning": a short, friendly 1-2 sentence explanation of why they match.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"AI Matchmaking error: {e}")
        return {"score": 75, "reasoning": "You both might learn from each other."}

def generate_icebreaker(user1, user2) -> str:
    if not client:
        return f"Hey {user2.full_name}, I saw we have some similar interests on EL! How are things?"
        
    prompt = f"""
    Generate a friendly, natural icebreaker message from Student 1 to Student 2. It should be based on their shared interests, goals, or personality traits.
    Student 1 Name: {user1.full_name}, Interests: {user1.interests}, Goals: {user1.goals}
    Student 2 Name: {user2.full_name}, Interests: {user2.interests}, Goals: {user2.goals}
    
    The message should be short (1-2 sentences), casual, and ready to be sent directly by Student 1. Do not use quotes around the message.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        return response.text.strip()
    except Exception as e:
        print(f"AI Icebreaker error: {e}")
        return f"Hey {user2.full_name}, great to connect on EL! What are you working on lately?"

def analyze_message_content(text: str) -> dict:
    if not client:
        # Simple mock detection for development
        lower_text = text.lower()
        if "die" in lower_text or "kill" in lower_text or "fuck" in lower_text:
            return {"status": "severe", "message": "Severe policy violation detected."}
        if "spam" in lower_text or len(text) > 500:
            return {"status": "warning", "message": "Please avoid spamming."}
        return {"status": "safe", "message": ""}
        
    prompt = f"""
    Analyze the following chat message sent on a college social networking platform.
    Identify if it contains severe profanity, hate speech, threats, harassment, or severe sexual content.
    Also identify if it looks like blatant spam or meaningless random characters.
    
    Message: "{text}"
    
    Return a JSON object with two fields:
    - "status": string, one of "safe", "warning", "severe"
      - "severe": for threats, hate speech, severe harassment, extreme profanity
      - "warning": for spam, repeated nonsensical text, minor guideline violations
      - "safe": for normal, acceptable conversation
    - "message": string, a brief explanation if not safe (e.g., "Your message contains severe profanity and violates guidelines.") Leave empty if safe.
    """
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"AI Moderation error: {e}")
        return {"status": "safe", "message": ""}
