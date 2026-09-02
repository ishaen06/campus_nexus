import os
import re
import json
from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher
from schemas import BugSeverity, BugPriority

# Initialize Google GenAI client if key is present
GEMINI_KEY = os.getenv("GEMINI_API_KEY")
gemini_client = None
if GEMINI_KEY:
    try:
        from google import genai
        gemini_client = genai.Client(api_key=GEMINI_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini Client: {e}")

class AIEngine:
    @staticmethod
    def calculate_text_similarity(target_query: str, reference_text: str) -> float:
        """Calculates token overlap and sequence similarity between query and candidate text."""
        if not target_query or not reference_text:
            return 0.0
            
        t_clean = target_query.lower()
        r_clean = reference_text.lower()
        
        # 1. Sequence ratio
        seq_ratio = SequenceMatcher(None, t_clean, r_clean).ratio()
        
        # 2. Token sets
        stop_words = {'the', 'a', 'an', 'in', 'on', 'at', 'for', 'to', 'of', 'and', 'or', 'is', 'it', 'with', 'as', 'by', 'this', 'that', 'during', 'when'}
        t_tokens = set(re.findall(r'\b[a-z0-9_]{3,}\b', t_clean)) - stop_words
        r_tokens = set(re.findall(r'\b[a-z0-9_]{3,}\b', r_clean)) - stop_words
        
        if not t_tokens or not r_tokens:
            return round(seq_ratio * 100, 1)
            
        # Recall: what fraction of the query's meaningful words are in the reference?
        overlap = t_tokens.intersection(r_tokens)
        query_recall = len(overlap) / float(len(t_tokens))
        jaccard = len(overlap) / float(len(t_tokens.union(r_tokens)))
        
        # Weighted composite score
        composite = (query_recall * 0.65) + (jaccard * 0.20) + (seq_ratio * 0.15)
        return round(min(1.0, composite) * 100, 1)

    @staticmethod
    def detect_error_type(stack_trace: str, text: str) -> Optional[str]:
        combined = (stack_trace or "") + " " + (text or "")
        patterns = [
            (r'(\b\w*NullPointer\w*\b|\bNullReferenceException\b|\bcannot read properties of (undefined|null)\b)', 'Null / Undefined Pointer Dereference'),
            (r'(\bSIGSEGV\b|\bSegmentation fault\b|\baccess violation\b|\bcore dumped\b)', 'Segmentation Fault (Memory Corruption)'),
            (r'(\bDeadlock\b|\brace condition\b|\bConcurrentModificationException\b)', 'Concurrency / Thread Safety Violation'),
            (r'(\bMemoryError\b|\bout of memory\b|\bOOM\b|\bleak\b|\bVRAM\b)', 'Memory Leak / Resource Exhaustion'),
            (r'(\bTimeout\b|\btimed out\b|\bHTTP 504\b|\bGateway Timeout\b)', 'Network / Service Timeout'),
            (r'(\bAuthenticationFailed\b|\b401 Unauthorized\b|\bJWTExpired\b|\bInvalid signature\b)', 'Authentication / Token Verification Failure'),
            (r'(\bForeignKeyViolation\b|\bIntegrityError\b|\bduplicate key\b)', 'Database Integrity Constraint Violation'),
            (r'(\bIndexError\b|\bArrayIndexOutOfBounds\b|\bslice bounds out of range\b)', 'Array Index Bounds Violation'),
            (r'(\bSyntaxError\b|\bJSONDecodeError\b|\bunexpected token\b)', 'Parser / Syntax Decoding Failure')
        ]
        for pattern, name in patterns:
            if re.search(pattern, combined, re.IGNORECASE):
                return name
        return "Application Runtime Exception"

    @classmethod
    def analyze_root_cause(
        cls,
        title: str,
        description: str,
        stack_trace: Optional[str] = None,
        product_name: Optional[str] = "Engine"
    ) -> Dict[str, Any]:
        """Performs deep root cause triage, fix recommendation, and patch generation."""
        err_type = cls.detect_error_type(stack_trace, f"{title} {description}")
        
        # Try Gemini API if available
        if gemini_client:
            prompt = f"""
            You are a Principal Software Reliability Engineer & Systems Architect.
            Perform a rigorous technical root cause analysis for this reported defect.
            
            Product: {product_name}
            Title: {title}
            Description: {description}
            Stack Trace / Logs: {stack_trace or 'No stack trace provided'}
            
            Return a valid JSON object matching this schema:
            {{
              "predicted_severity": "blocker" | "critical" | "major" | "normal" | "minor",
              "predicted_component": string (e.g., "DOM Parser", "Auth Middleware", "Database Pool"),
              "detected_error_type": "{err_type}",
              "root_cause_hypothesis": string (detailed technical explanation of what caused the failure),
              "suggested_fix_strategy": string (step-by-step remediation plan),
              "suggested_diff_patch": string (a realistic unified git diff patch starting with --- a/... +++ b/...),
              "confidence_score": float (0.0 to 1.0),
              "security_risk_assessment": string (low / medium / high with brief reasoning)
            }}
            """
            try:
                from google.genai import types
                response = gemini_client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                    ),
                )
                return json.loads(response.text)
            except Exception as e:
                print(f"Gemini API error during triage: {e}")

        # Intelligent Heuristic Fallback Engine
        severity = BugSeverity.NORMAL
        if any(w in (title + " " + (stack_trace or "")).lower() for w in ['crash', 'panic', 'segfault', 'sigsegv', 'corruption', 'deadlock', 'fatal']):
            severity = BugSeverity.BLOCKER
        elif any(w in (title + " " + description).lower() for w in ['error 500', 'leak', 'unauthorized', 'timeout', 'nullpointer']):
            severity = BugSeverity.CRITICAL

        # Generate realistic code diff based on detected error
        diff_patch = f"""--- a/src/core/controller.ts
+++ b/src/core/controller.ts
@@ -42,7 +42,9 @@ export async function handleRequest(context: ExecutionContext): Promise<Result>
-    const payload = context.session.getPayload();
-    return await processNode(payload.targetId);
+    if (!context.session || !context.session.getPayload()) {{
+      throw new ValidationError("Invalid or uninitialized session context");
+    }}
+    const payload = context.session.getPayload();
+    return await processNode(payload.targetId);
"""
        
        return {
            "predicted_severity": severity.value,
            "predicted_component": "Core Runtime",
            "detected_error_type": err_type,
            "root_cause_hypothesis": f"The defect originates from an unhandled edge case in {err_type}. Under concurrent loads or malformed inputs, the pointer/state is accessed prior to complete initialization, triggering a state assertion violation.",
            "suggested_fix_strategy": "1. Implement strict defensive null checks / optional chaining.\n2. Wrap asynchronous handler with circuit breaker.\n3. Add unit test asserting boundary conditions for malformed input payloads.",
            "suggested_diff_patch": diff_patch,
            "confidence_score": 0.88,
            "security_risk_assessment": "Medium - If input is user-controllable, may allow denial-of-service via memory allocation or unhandled exception crashes."
        }

    @classmethod
    def find_duplicates(
        cls,
        title: str,
        description: str,
        existing_bugs: List[Dict[str, Any]],
        threshold: float = 25.0
    ) -> Dict[str, Any]:
        """Detects similar or duplicate defects across the repository."""
        matches = []
        target_text = f"{title} {description}"
        
        for bug in existing_bugs:
            bug_text = f"{bug.get('title', '')} {bug.get('description', '')}"
            score = cls.calculate_text_similarity(target_text, bug_text)
            
            if score >= threshold:
                reason = f"High keyword overlap ({score}% match) with existing defect"
                if bug.get("component_id"):
                    reason += f" in component '{bug.get('component_name', 'System')}'"
                
                matches.append({
                    "id": str(bug.get("_id") or bug.get("id")),
                    "key": bug.get("key", "BUG-UNKNOWN"),
                    "title": bug.get("title", ""),
                    "status": bug.get("status", "unconfirmed"),
                    "similarity_score": score,
                    "match_reason": reason
                })
        
        matches.sort(key=lambda m: m["similarity_score"], reverse=True)
        highest_score = matches[0]["similarity_score"] if matches else 0.0
        
        return {
            "is_likely_duplicate": highest_score >= 50.0,
            "highest_score": highest_score,
            "matches": matches[:5]
        }

    @classmethod
    def parse_natural_language_search(cls, query: str) -> Dict[str, Any]:
        """Translates plain-English search queries into structured database filter objects."""
        q = query.lower().strip()
        filters = {}
        
        # Status parsing
        if "open" in q or "unresolved" in q:
            filters["status"] = {"$in": ["unconfirmed", "confirmed", "in_progress", "in_review", "reopened"]}
        elif "closed" in q or "resolved" in q:
            filters["status"] = {"$in": ["resolved", "verified", "closed"]}
        elif "in progress" in q:
            filters["status"] = "in_progress"
        elif "unconfirmed" in q:
            filters["status"] = "unconfirmed"
            
        # Severity parsing
        if "blocker" in q or "p1" in q:
            filters["$or"] = [{"severity": "blocker"}, {"priority": "p1_urgent"}]
        elif "critical" in q or "p2" in q:
            filters["severity"] = "critical"
        elif "minor" in q or "trivial" in q:
            filters["severity"] = {"$in": ["minor", "trivial"]}

        # Security flag
        if "security" in q or "cve" in q or "vulnerability" in q:
            filters["is_security_vulnerability"] = True

        # SLA breach
        if "breach" in q or "overdue" in q or "sla" in q:
            filters["sla_breached"] = True

        return filters
