import urllib.request
import urllib.error
import json

API_KEY  = "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"
TO_EMAIL = "ishaen.vihaan@gmail.com"

url = "https://api.brevo.com/v3/smtp/email"
headers = {
    "accept":       "application/json",
    "api-key":      API_KEY,
    "content-type": "application/json",
}
payload = {
    "sender":      {"name": "Campus Nexus", "email": "nexus2026.otp@gmail.com"},
    "to":          [{"email": TO_EMAIL}],
    "subject":     "CampusNexus OTP Test",
    "textContent": "Your test OTP is: 123456",
    "htmlContent": "<h2>Campus Nexus</h2><p>Your OTP is: <b>123456</b></p>"
}

print(f"[TEST] Sending to: {TO_EMAIL}")
try:
    data = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode("utf-8")
        print(f"[TEST] SUCCESS HTTP {response.getcode()}: {body}")
except urllib.error.HTTPError as e:
    print(f"[TEST] FAILED HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"[TEST] ERROR: {type(e).__name__}: {e}")
