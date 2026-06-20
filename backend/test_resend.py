import urllib.request
import urllib.error
import json

API_KEY = "re_Ci8BQGYw_M6HrZCWJLKyCovdcRmPR2iTS"
TO_EMAIL = "ishaen.vihaan@gmail.com"  # Resend owner email - always works

# NOTE: Resend FREE TIER can only send to the owner's email (ishaen.vihaan@gmail.com)
# To send to ANY email (like registering users), you MUST:
# Option A: Verify a custom domain in Resend dashboard
# Option B: Add the recipient email in Resend 'Contacts' (not available on all plans)
# The test below will tell us if this is the limitation.

url = "https://api.resend.com/emails"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "User-Agent": "CampusNexus/1.0"
}

payload = {
    "from": "Campus Nexus <onboarding@resend.dev>",
    "to": [TO_EMAIL],
    "subject": "OTP Test - CampusNexus",
    "text": "This is a test OTP email. Your OTP is: 999888",
    "html": "<h1>CampusNexus OTP Test</h1><p>Your OTP is: <b>999888</b></p>"
}

print(f"[TEST] Sending to: {TO_EMAIL}")
print(f"[TEST] From: {payload['from']}")
print(f"[TEST] API Key prefix: {API_KEY[:8]}...")

try:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as response:
        body = response.read().decode("utf-8")
        print(f"\n[TEST] SUCCESS! HTTP {response.getcode()}")
        print(f"[TEST] Response: {body}")
        print(f"\nEMAIL SENT SUCCESSFULLY! Check {TO_EMAIL}")
except urllib.error.HTTPError as e:
    error_body = e.read().decode("utf-8")
    print(f"\n[TEST] FAILED - HTTP ERROR {e.code}: {e.reason}")
    print(f"[TEST] Error details: {error_body}")
    if e.code == 422:
        print("\n⚠️  422 means the 'from' address is invalid or API key has domain restrictions.")
    elif e.code == 401:
        print("\n⚠️  401 means the API key is wrong or revoked.")
    elif e.code == 403:
        print("\n⚠️  403 means Cloudflare blocked the request.")
except Exception as e:
    print(f"\n[TEST] FAILED - ERROR: {type(e).__name__}: {e}")
