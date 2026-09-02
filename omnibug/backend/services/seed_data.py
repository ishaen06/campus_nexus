import os
from datetime import datetime, timedelta
from bson import ObjectId
from security import get_password_hash
from database_mongo import get_mongo_db

def seed_database(force_reseed: bool = False):
    db = get_mongo_db()
    
    # Check if already seeded
    if not force_reseed and db.users.count_documents({}) > 0:
        print("Database already contains data. Skipping auto-seed.")
        return

    print("[OmniBug] Seeding database with realistic enterprise dataset...")
    
    # Clear collections if force_reseed
    if force_reseed:
        db.users.delete_many({})
        db.products.delete_many({})
        db.components.delete_many({})
        db.milestones.delete_many({})
        db.bugs.delete_many({})
        db.comments.delete_many({})
        db.activities.delete_many({})
        db.commits.delete_many({})
        db.counters.delete_many({})

    # 1. Seed Users
    now = datetime.utcnow()
    hashed_pwd = get_password_hash("password123")
    
    users_data = [
        {
            "_id": ObjectId("65e000000000000000000001"),
            "email": "admin@omnibug.io",
            "username": "admin",
            "full_name": "Dr. Aris Thorne",
            "role": "admin",
            "team": "Architecture & Release Operations",
            "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            "hashed_password": hashed_pwd,
            "created_at": now - timedelta(days=90)
        },
        {
            "_id": ObjectId("65e000000000000000000002"),
            "email": "alex.chen@omnibug.io",
            "username": "alexchen",
            "full_name": "Alex Chen",
            "role": "lead_dev",
            "team": "Core Engine & Performance",
            "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "hashed_password": hashed_pwd,
            "created_at": now - timedelta(days=80)
        },
        {
            "_id": ObjectId("65e000000000000000000003"),
            "email": "sarah.qa@omnibug.io",
            "username": "sarahjenkins",
            "full_name": "Sarah Jenkins",
            "role": "qa_engineer",
            "team": "Quality Assurance & Test Automation",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
            "hashed_password": hashed_pwd,
            "created_at": now - timedelta(days=75)
        },
        {
            "_id": ObjectId("65e000000000000000000004"),
            "email": "marcus.dev@omnibug.io",
            "username": "marcusvance",
            "full_name": "Marcus Vance",
            "role": "developer",
            "team": "Backend & Cloud Services",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "hashed_password": hashed_pwd,
            "created_at": now - timedelta(days=60)
        },
        {
            "_id": ObjectId("65e000000000000000000005"),
            "email": "elena.sec@omnibug.io",
            "username": "elenarostova",
            "full_name": "Elena Rostova",
            "role": "lead_dev",
            "team": "Application Security & Hardening",
            "avatar_url": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "hashed_password": hashed_pwd,
            "created_at": now - timedelta(days=50)
        }
    ]
    db.users.insert_many(users_data)
    
    u_admin = str(users_data[0]["_id"])
    u_alex = str(users_data[1]["_id"])
    u_sarah = str(users_data[2]["_id"])
    u_marcus = str(users_data[3]["_id"])
    u_elena = str(users_data[4]["_id"])

    # 2. Seed Products
    prod_gec_id = ObjectId("65e100000000000000000001")
    prod_nex_id = ObjectId("65e100000000000000000002")
    prod_pay_id = ObjectId("65e100000000000000000003")
    prod_vui_id = ObjectId("65e100000000000000000004")

    products_data = [
        {
            "_id": prod_gec_id,
            "name": "Gecko Render Core",
            "key_prefix": "GEC",
            "description": "High-performance browser layout, WebGL rendering pipeline, and DOM engine.",
            "lead_user_id": u_alex,
            "default_assignee_id": u_alex,
            "versions": ["2.3.4", "2.4.0-rc1", "2.4.0", "3.0.0-alpha"],
            "created_at": now - timedelta(days=90)
        },
        {
            "_id": prod_nex_id,
            "name": "Nexus Cloud Platform",
            "key_prefix": "NEX",
            "description": "Distributed microservices, auth gateway, Kafka streaming, and caching layer.",
            "lead_user_id": u_marcus,
            "default_assignee_id": u_marcus,
            "versions": ["3.0.0", "3.1.0-beta", "3.1.0"],
            "created_at": now - timedelta(days=80)
        },
        {
            "_id": prod_pay_id,
            "name": "PayFlow Financial Engine",
            "key_prefix": "PAY",
            "description": "PCI-DSS compliant transactional double-entry ledger, webhook reconciliation, and fraud prevention.",
            "lead_user_id": u_elena,
            "default_assignee_id": u_elena,
            "versions": ["1.7.2", "1.8.0", "1.9.0-rc"],
            "created_at": now - timedelta(days=70)
        },
        {
            "_id": prod_vui_id,
            "name": "ViteUI Component Kit",
            "key_prefix": "VUI",
            "description": "Modern enterprise design system, high-density data grids, and accessible React components.",
            "lead_user_id": u_sarah,
            "default_assignee_id": u_sarah,
            "versions": ["3.8.0", "4.0.0-alpha", "4.0.0"],
            "created_at": now - timedelta(days=60)
        }
    ]
    db.products.insert_many(products_data)

    # 3. Seed Components
    comp_gec_dom = ObjectId("65e200000000000000000001")
    comp_gec_webgl = ObjectId("65e200000000000000000002")
    comp_gec_layout = ObjectId("65e200000000000000000003")
    
    comp_nex_auth = ObjectId("65e200000000000000000004")
    comp_nex_rate = ObjectId("65e200000000000000000005")
    comp_nex_kafka = ObjectId("65e200000000000000000006")
    
    comp_pay_ledger = ObjectId("65e200000000000000000007")
    comp_pay_webhook = ObjectId("65e200000000000000000008")
    
    comp_vui_grid = ObjectId("65e200000000000000000009")
    comp_vui_modal = ObjectId("65e20000000000000000000a")

    components_data = [
        {"_id": comp_gec_dom, "product_id": str(prod_gec_id), "name": "DOM Parser & Tree Walker", "description": "HTML5 parser, shadow DOM encapsulation, and node mutation observers", "default_assignee_id": u_alex, "default_qa_contact_id": u_sarah},
        {"_id": comp_gec_webgl, "product_id": str(prod_gec_id), "name": "WebGL & GPU Compositor", "description": "Hardware-accelerated shader pipelines and texture caching", "default_assignee_id": u_alex, "default_qa_contact_id": u_sarah},
        {"_id": comp_gec_layout, "product_id": str(prod_gec_id), "name": "CSS Flex & Grid Engine", "description": "Subgrid calculation, intrinsic sizing, and reflow optimizer", "default_assignee_id": u_alex, "default_qa_contact_id": u_sarah},
        
        {"_id": comp_nex_auth, "product_id": str(prod_nex_id), "name": "OAuth2 & JWT Identity", "description": "Token issuance, refresh rotation, and RBAC policy enforcement", "default_assignee_id": u_elena, "default_qa_contact_id": u_sarah},
        {"_id": comp_nex_rate, "product_id": str(prod_nex_id), "name": "Distributed Rate Limiter", "description": "Redis sliding-window rate limit counters and DDoS protection", "default_assignee_id": u_marcus, "default_qa_contact_id": u_sarah},
        {"_id": comp_nex_kafka, "product_id": str(prod_nex_id), "name": "Kafka Event Broker", "description": "High-throughput asynchronous event ingestion and dead-letter queues", "default_assignee_id": u_marcus, "default_qa_contact_id": u_sarah},
        
        {"_id": comp_pay_ledger, "product_id": str(prod_pay_id), "name": "Double-Entry Ledger", "description": "Immutable balance updates, multi-currency conversion, and audit logs", "default_assignee_id": u_elena, "default_qa_contact_id": u_sarah},
        {"_id": comp_pay_webhook, "product_id": str(prod_pay_id), "name": "Stripe Webhook Ingestion", "description": "Signature verification, idempotency key tracking, and event routing", "default_assignee_id": u_marcus, "default_qa_contact_id": u_sarah},
        
        {"_id": comp_vui_grid, "product_id": str(prod_vui_id), "name": "DataGrid Virtual Table", "description": "Virtual scrolling for 100k+ rows, column grouping, and pivot tables", "default_assignee_id": u_marcus, "default_qa_contact_id": u_sarah},
        {"_id": comp_vui_modal, "product_id": str(prod_vui_id), "name": "Accessible Modals & Overlays", "description": "Focus trapping, ARIA-1.2 dialogs, and nested backdrop management", "default_assignee_id": u_sarah, "default_qa_contact_id": u_sarah}
    ]
    db.components.insert_many(components_data)

    # 4. Seed Milestones
    ms_gec_24 = ObjectId("65e300000000000000000001")
    ms_nex_31 = ObjectId("65e300000000000000000002")
    ms_pay_18 = ObjectId("65e300000000000000000003")
    ms_vui_40 = ObjectId("65e300000000000000000004")

    milestones_data = [
        {"_id": ms_gec_24, "product_id": str(prod_gec_id), "name": "v2.4.0 (Q1 Stable GA)", "description": "Major rendering performance release with WebGL 2.0 and subgrid support.", "target_date": "2026-03-31", "status": "active", "is_release_blocker": True},
        {"_id": ms_nex_31, "product_id": str(prod_nex_id), "name": "v3.1.0 Enterprise Release", "description": "Zero-trust auth architecture and high-throughput Kafka streaming.", "target_date": "2026-04-15", "status": "active", "is_release_blocker": False},
        {"_id": ms_pay_18, "product_id": str(prod_pay_id), "name": "v1.8.0 PCI Compliance Milestone", "description": "Cryptographic audit logging and hardened ledger idempotency.", "target_date": "2026-03-15", "status": "active", "is_release_blocker": True},
        {"_id": ms_vui_40, "product_id": str(prod_vui_id), "name": "v4.0.0 Accessibility & Speed", "description": "WCAG AAA compliance and 60fps virtualized data grid scrolling.", "target_date": "2026-05-01", "status": "active", "is_release_blocker": False}
    ]
    db.milestones.insert_many(milestones_data)

    # 5. Seed Bugs & Defects
    bugs_data = [
        # GEC-101 (Release Blocker)
        {
            "_id": ObjectId("65e400000000000000000001"),
            "key": "GEC-101",
            "title": "Segmentation fault during nested flexbox reflow in DOM tree walker",
            "description": "When an iframe inside a nested display:flex container triggers a dynamic font-face load, the layout tree traversal dereferences a null pointer in ReflowBlock().",
            "product_id": str(prod_gec_id),
            "component_id": str(comp_gec_layout),
            "milestone_id": str(ms_gec_24),
            "severity": "blocker",
            "priority": "p1_urgent",
            "status": "in_progress",
            "resolution": None,
            "version": "2.4.0-rc1",
            "reporter_id": u_sarah,
            "assignee_id": u_alex,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_admin, u_elena],
            "tags": ["crash", "reflow", "segfault", "release-blocker"],
            "is_security_vulnerability": False,
            "environment": {
                "os": "Linux x86_64 Ubuntu 24.04",
                "browser": "Gecko Core / Firefox Nightly",
                "version": "2.4.0-rc1",
                "hardware": "AMD Ryzen 9 7950X, 64GB RAM",
                "environment_type": "staging"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Navigate to test fixture /tests/layout/nested_flex_iframe.html", "expected": "Page renders without errors", "actual": "Blank canvas", "is_verified": True},
                {"step_number": 2, "action": "Trigger web font load via document.fonts.load('16px CustomFont')", "expected": "Sub-tree reflow completes smoothly", "actual": "Process receives SIGSEGV", "is_verified": True},
                {"step_number": 3, "action": "Inspect core dump with GDB", "expected": "Valid frame pointers", "actual": "Null frame in nsFlexContainerFrame::DoLayout", "is_verified": True}
            ],
            "stack_trace": """#0  0x00007ffff7a12bc4 in nsFlexContainerFrame::DoLayout (this=0x7fffb00124a0, aReflowInput=...) at /src/layout/generic/nsFlexContainerFrame.cpp:4821
#1  0x00007ffff7a134e1 in nsFlexContainerFrame::Reflow (this=0x7fffb00124a0, aPresContext=0x7fffb0000800, aDesiredSize=..., aReflowInput=..., aStatus=...) at /src/layout/generic/nsFlexContainerFrame.cpp:5102
#2  0x00007ffff798e100 in nsBlockReflowContext::ReflowBlock (this=0x7fffffffce80, aSpace=..., aApplyTopMargin=true, aPrevMargin=..., aMargin=..., aClearance=0, aReflowInput=...) at /src/layout/generic/nsBlockReflowContext.cpp:304
#3  0x00007ffff7891238 in PresShell::DoReflow (this=0x7fffb0004c00, aTarget=0x7fffb00124a0, aInterruptible=true) at /src/layout/base/PresShell.cpp:9430""",
            "root_cause_analysis": {
                "category": "code_defect",
                "description": "During asynchronous font swap, the child frame pointer becomes dangling after the parent flex item re-allocates its computed metrics.",
                "suggested_fix": "Cache frame weak references and re-verify parent existence prior to invoking DoLayout().",
                "suggested_diff": """--- a/src/layout/generic/nsFlexContainerFrame.cpp
+++ b/src/layout/generic/nsFlexContainerFrame.cpp
@@ -4819,6 +4819,9 @@ nsFlexContainerFrame::DoLayout(nsPresContext* aPresContext,
   for (nsIFrame* child : mFrames) {
+    if (!child || child->IsDestroyed()) {
+      continue;
+    }
     ReflowFlexItem(child, aReflowInput);
   }""",
                "confidence_score": 0.94
            },
            "blocks": ["GEC-105"],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 16.0,
            "spent_hours": 9.5,
            "remaining_hours": 6.5,
            "sla_due_hours": 24,
            "flags": {
                "needinfo": False,
                "needinfo_from": None,
                "review_requested": True,
                "qa_approved": False,
                "security_reviewed": True
            },
            "created_at": now - timedelta(days=2, hours=4),
            "updated_at": now - timedelta(hours=1),
            "resolved_at": None
        },

        # GEC-102 (Resolved / Fixed)
        {
            "_id": ObjectId("65e400000000000000000002"),
            "key": "GEC-102",
            "title": "WebGL 2.0 texture cache memory leak upon canvas resizing",
            "description": "Resizing the canvas element continuously without explicitly unbinding WebGLTexture leads to unbounded GPU VRAM growth until the renderer driver restarts.",
            "product_id": str(prod_gec_id),
            "component_id": str(comp_gec_webgl),
            "milestone_id": str(ms_gec_24),
            "severity": "critical",
            "priority": "p2_high",
            "status": "resolved",
            "resolution": "fixed",
            "version": "2.4.0-rc1",
            "reporter_id": u_alex,
            "assignee_id": u_alex,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_marcus],
            "tags": ["webgl", "memory-leak", "gpu", "vram"],
            "is_security_vulnerability": False,
            "environment": {
                "os": "macOS Sonoma 14.5 (Apple M3 Max)",
                "browser": "Gecko Core / Chrome WebGL",
                "version": "2.4.0-rc1",
                "hardware": "Apple Silicon 36GB Unified Memory",
                "environment_type": "production"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Open 3D model visualizer in /demo/webgl_cube.html", "expected": "Smooth 60fps render", "actual": "Render runs smoothly", "is_verified": True},
                {"step_number": 2, "action": "Trigger window resize event 100 times in loop", "expected": "Texture buffers garbage collected", "actual": "VRAM consumption rises from 120MB to 4.2GB", "is_verified": True}
            ],
            "stack_trace": """[GPU-Process Error] GL_OUT_OF_MEMORY in glGenTextures
at WebGLContext::AllocateTextureBuffer (WebGLContext.cpp:1140)
at CompositorMetal::UploadTextures (CompositorMetal.mm:420)""",
            "root_cause_analysis": {
                "category": "memory_leak",
                "description": "Previous frame texture handle was not marked for deletion before replacing with new resized framebuffer attachment.",
                "suggested_fix": "Call glDeleteTextures explicitly before recreating frame textures.",
                "confidence_score": 0.96
            },
            "blocks": [],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 8.0,
            "spent_hours": 7.0,
            "remaining_hours": 0.0,
            "sla_due_hours": 48,
            "flags": {"needinfo": False, "review_requested": False, "qa_approved": True, "security_reviewed": True},
            "created_at": now - timedelta(days=5),
            "updated_at": now - timedelta(days=1),
            "resolved_at": now - timedelta(days=1)
        },

        # NEX-101 (Security Vulnerability)
        {
            "_id": ObjectId("65e400000000000000000003"),
            "key": "NEX-101",
            "title": "OAuth2 refresh token replay vulnerability during concurrent token exchange",
            "description": "When two token exchange requests with identical refresh_token arrive within the same 50ms window, the distributed mutex fails to invalidate the second token before generating a new access token.",
            "product_id": str(prod_nex_id),
            "component_id": str(comp_nex_auth),
            "milestone_id": str(ms_nex_31),
            "severity": "blocker",
            "priority": "p1_urgent",
            "status": "in_review",
            "resolution": None,
            "version": "3.1.0-beta",
            "reporter_id": u_elena,
            "assignee_id": u_elena,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_admin, u_alex],
            "tags": ["security", "oauth2", "concurrency", "cve-candidate"],
            "is_security_vulnerability": True,
            "environment": {
                "os": "Debian GNU/Linux 12 (Bookworm)",
                "browser": "Headless API Client (cURL / k6)",
                "version": "3.1.0-beta",
                "hardware": "AWS c6i.4xlarge Kubernetes Node",
                "environment_type": "production"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Issue valid refresh token via /api/v1/auth/login", "expected": "Token stored in Redis with 30-day TTL", "actual": "Token issued", "is_verified": True},
                {"step_number": 2, "action": "Send 10 concurrent HTTP POST requests to /api/v1/auth/refresh with identical payload", "expected": "Exactly 1 request succeeds (200 OK); 9 requests return 401 Unauthorized", "actual": "3 requests return 200 OK with distinct valid JWT pairs", "is_verified": True}
            ],
            "stack_trace": """[SecurityAudit] Race condition detected in TokenRotationHandler.go:189
goroutine 441 [running]:
auth/token.(*Service).ExchangeRefreshToken(0xc0001a4000, 0xc0002b8000)
    /go/src/app/auth/token/service.go:189 +0x3a4
auth/api.(*Handler).RefreshToken(0xc0000a2100, 0xc00030e000)
    /go/src/app/auth/api/handler.go:88 +0x112""",
            "root_cause_analysis": {
                "category": "race_condition",
                "description": "Redis GET and SET were executed as separate non-atomic commands instead of an atomic Lua script / Redlock lease.",
                "suggested_fix": "Migrate refresh token verification and revocation to an atomic Redis Lua script.",
                "confidence_score": 0.98
            },
            "blocks": [],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 12.0,
            "spent_hours": 10.0,
            "remaining_hours": 2.0,
            "sla_due_hours": 12,
            "flags": {"needinfo": False, "review_requested": True, "qa_approved": False, "security_reviewed": True},
            "created_at": now - timedelta(days=1, hours=6),
            "updated_at": now - timedelta(minutes=45),
            "resolved_at": None
        },

        # NEX-102 (Kafka Message Deserialization Error)
        {
            "_id": ObjectId("65e400000000000000000004"),
            "key": "NEX-102",
            "title": "Kafka consumer panics on malformed protobuf event schema in billing stream",
            "description": "When upstream billing microservice publishes an event missing the mandatory idempotency_uuid header, the consumer worker panics and fails to commit consumer offset.",
            "product_id": str(prod_nex_id),
            "component_id": str(comp_nex_kafka),
            "milestone_id": str(ms_nex_31),
            "severity": "major",
            "priority": "p2_high",
            "status": "confirmed",
            "resolution": None,
            "version": "3.1.0-beta",
            "reporter_id": u_marcus,
            "assignee_id": u_marcus,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_alex],
            "tags": ["kafka", "protobuf", "deserialization", "panic"],
            "is_security_vulnerability": False,
            "environment": {
                "os": "Alpine Linux 3.19 (Containerized)",
                "browser": "N/A (Backend Service)",
                "version": "3.1.0-beta",
                "hardware": "Kubernetes Pod (2 vCPU, 4GB RAM)",
                "environment_type": "staging"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Publish test message to topic 'billing.events.v1' with null header", "expected": "Event routed to dead-letter queue", "actual": "Consumer container crashes with unhandled panic", "is_verified": True}
            ],
            "stack_trace": """panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: address access violation]
goroutine 18 [running]:
github.com/omnibug/nexus/events.(*KafkaConsumer).processMessage(0xc000210000, 0xc000450000)
    /app/events/consumer.go:142 +0x289
github.com/omnibug/nexus/events.(*KafkaConsumer).Start.func1()
    /app/events/consumer.go:76 +0x65""",
            "root_cause_analysis": {
                "category": "code_defect",
                "description": "Missing defensive nil check on msg.Headers['idempotency_uuid'] before calling .String().",
                "suggested_fix": "Add safe header extractor and route corrupt messages to dead-letter exchange.",
                "confidence_score": 0.95
            },
            "blocks": [],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 6.0,
            "spent_hours": 2.0,
            "remaining_hours": 4.0,
            "sla_due_hours": 48,
            "flags": {"needinfo": False, "review_requested": False, "qa_approved": False, "security_reviewed": False},
            "created_at": now - timedelta(days=3),
            "updated_at": now - timedelta(days=1),
            "resolved_at": None
        },

        # PAY-101 (Double-Entry Ledger Integrity)
        {
            "_id": ObjectId("65e400000000000000000005"),
            "key": "PAY-101",
            "title": "Floating-point rounding anomaly in multi-currency FX ledger reconciliation",
            "description": "Converting transactions from JPY to EUR with fractional cent calculations generates a 0.0001 imbalance across credit and debit balancing checks.",
            "product_id": str(prod_pay_id),
            "component_id": str(comp_pay_ledger),
            "milestone_id": str(ms_pay_18),
            "severity": "critical",
            "priority": "p1_urgent",
            "status": "in_progress",
            "resolution": None,
            "version": "1.8.0",
            "reporter_id": u_elena,
            "assignee_id": u_elena,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_admin],
            "tags": ["ledger", "financial", "rounding", "pci-dss"],
            "is_security_vulnerability": False,
            "environment": {
                "os": "Ubuntu 22.04 LTS",
                "browser": "N/A",
                "version": "1.8.0",
                "hardware": "Dedicated Financial HSM Node",
                "environment_type": "production"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Execute transfer of 1,000,000 JPY to EUR wallet at rate 0.00612345", "expected": "Credit == Debit sum to 12 decimal places", "actual": "Ledger assertion error: imbalance of 0.000012 EUR detected", "is_verified": True}
            ],
            "stack_trace": """LedgerImbalanceException: Total Debit (6123.4500000000) != Total Credit (6123.4500120000)
at LedgerEngine.reconcileEntries (LedgerEngine.py:312)
at TransactionCoordinator.commit (TransactionCoordinator.py:108)""",
            "root_cause_analysis": {
                "category": "code_defect",
                "description": "Standard Python 64-bit float was used in FX rate multiplier instead of exact decimal.Decimal with ROUND_HALF_EVEN mode.",
                "suggested_fix": "Enforce decimal.Decimal fixed-point arithmetic across all financial ledger operators.",
                "confidence_score": 0.99
            },
            "blocks": [],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 10.0,
            "spent_hours": 5.0,
            "remaining_hours": 5.0,
            "sla_due_hours": 24,
            "flags": {"needinfo": False, "review_requested": False, "qa_approved": False, "security_reviewed": True},
            "created_at": now - timedelta(days=2),
            "updated_at": now - timedelta(hours=3),
            "resolved_at": None
        },

        # VUI-101 (DataGrid Virtual Table Scroll Glitch)
        {
            "_id": ObjectId("65e400000000000000000006"),
            "key": "VUI-101",
            "title": "DataGrid scroll position jumps to row 0 when fast scrolling on Firefox/Gecko",
            "description": "When rapid trackpad inertia scrolling occurs over 50,000 virtual rows, the transform offset calculation receives an integer overflow, resetting scrollTop to 0.",
            "product_id": str(prod_vui_id),
            "component_id": str(comp_vui_grid),
            "milestone_id": str(ms_vui_40),
            "severity": "major",
            "priority": "p3_medium",
            "status": "unconfirmed",
            "resolution": None,
            "version": "4.0.0-alpha",
            "reporter_id": u_marcus,
            "assignee_id": u_sarah,
            "qa_contact_id": u_sarah,
            "cc_user_ids": [u_alex],
            "tags": ["datagrid", "scrolling", "virtualization", "ux"],
            "is_security_vulnerability": False,
            "environment": {
                "os": "Windows 11 Enterprise 23H2",
                "browser": "Firefox 125.0 (64-bit)",
                "version": "4.0.0-alpha",
                "hardware": "Dell XPS 15 (Precision Touchpad)",
                "environment_type": "local"
            },
            "reproduction_steps": [
                {"step_number": 1, "action": "Open /components/datagrid/benchmark_50k.html", "expected": "Table renders 50k rows", "actual": "Table loads smoothly", "is_verified": True},
                {"step_number": 2, "action": "Flick trackpad down aggressively for 3 consecutive swipes", "expected": "Table smoothly decelerates around row ~14,000", "actual": "Viewport abruptly flickers and snaps back to row 0", "is_verified": True}
            ],
            "stack_trace": """[VirtualGrid Warning] Non-finite translateY offset calculated: NaN
at VirtualScroller.updateVisibleRange (virtualScroller.ts:245)
at VirtualScroller.handleScroll (virtualScroller.ts:118)""",
            "root_cause_analysis": {
                "category": "code_defect",
                "description": "Division by zero when containerHeight is recomputed during rapid scroll frame drops.",
                "suggested_fix": "Clamp containerHeight with Math.max(1, height) and sanitize scrollTop calculations.",
                "confidence_score": 0.91
            },
            "blocks": [],
            "depends_on": [],
            "duplicate_of": None,
            "estimated_hours": 4.0,
            "spent_hours": 0.0,
            "remaining_hours": 4.0,
            "sla_due_hours": 72,
            "flags": {"needinfo": True, "needinfo_from": "marcusvance", "review_requested": False, "qa_approved": False, "security_reviewed": False},
            "created_at": now - timedelta(days=1),
            "updated_at": now - timedelta(days=1),
            "resolved_at": None
        }
    ]
    db.bugs.insert_many(bugs_data)

    # 6. Seed Comments
    comments_data = [
        {
            "_id": ObjectId("65e500000000000000000001"),
            "bug_id": str(bugs_data[0]["_id"]),
            "user_id": u_alex,
            "user_name": "Alex Chen",
            "user_avatar": users_data[1]["avatar_url"],
            "user_role": "lead_dev",
            "content": "I isolated the issue to `nsFlexContainerFrame.cpp:4821`. When font loading completes asynchronously, it invalidates the frame tree while layout is in flight. I've prepared a patch with defensive weak-pointer checks.",
            "reactions": {"🚀": [u_sarah, u_admin], "👍": [u_marcus]},
            "is_internal": False,
            "attachments": [],
            "created_at": now - timedelta(days=1, hours=2)
        },
        {
            "_id": ObjectId("65e500000000000000000002"),
            "bug_id": str(bugs_data[0]["_id"]),
            "user_id": u_sarah,
            "user_name": "Sarah Jenkins",
            "user_avatar": users_data[2]["avatar_url"],
            "user_role": "qa_engineer",
            "content": "@alexchen I ran the automated fuzzing suite against your draft branch. The crash no longer reproduces over 10,000 dynamic font swap iterations! Ready for formal PR review.",
            "reactions": {"🎉": [u_alex, u_admin]},
            "is_internal": False,
            "attachments": [],
            "created_at": now - timedelta(hours=4)
        },
        {
            "_id": ObjectId("65e500000000000000000003"),
            "bug_id": str(bugs_data[2]["_id"]),
            "user_id": u_elena,
            "user_name": "Elena Rostova",
            "user_avatar": users_data[4]["avatar_url"],
            "user_role": "lead_dev",
            "content": "⚠️ Marked as Security Vulnerability. The fix converts the refresh token check into an atomic Lua script executed directly in Redis with a 200ms lock lease.",
            "reactions": {"🔒": [u_admin, u_alex]},
            "is_internal": True,
            "attachments": [],
            "created_at": now - timedelta(hours=8)
        }
    ]
    db.comments.insert_many(comments_data)

    # 7. Seed Git Commits
    commits_data = [
        {
            "_id": ObjectId("65e600000000000000000001"),
            "bug_id": str(bugs_data[0]["_id"]),
            "commit_sha": "a8f3b29d4e12c67b89e01f23456789abcdef0123",
            "message": "fix(layout): guard against dangling frame references during async font reflow (fixes GEC-101)",
            "author": "Alex Chen <alex.chen@omnibug.io>",
            "branch": "fix/gec-101-flex-reflow-segfault",
            "repo_name": "gecko-render-core",
            "diff_snippet": """diff --git a/src/layout/generic/nsFlexContainerFrame.cpp b/src/layout/generic/nsFlexContainerFrame.cpp
index 8a34b12..9f42c33 100644
--- a/src/layout/generic/nsFlexContainerFrame.cpp
+++ b/src/layout/generic/nsFlexContainerFrame.cpp
@@ -4818,6 +4818,10 @@ nsFlexContainerFrame::DoLayout(nsPresContext* aPresContext,
   for (nsIFrame* child : mFrames) {
+    if (!child || child->IsDestroyed()) {
+      NS_WARNING("Child frame was destroyed prior to flex layout pass");
+      continue;
+    }
     ReflowFlexItem(child, aReflowInput);
   }""",
            "web_url": "https://github.com/omnibug/gecko-render-core/commit/a8f3b29",
            "created_at": now - timedelta(hours=2)
        },
        {
            "_id": ObjectId("65e600000000000000000002"),
            "bug_id": str(bugs_data[1]["_id"]),
            "commit_sha": "c3e4f5a6b7c8d9e01f23456789abcdef45678901",
            "message": "fix(webgl): explicitly release texture handles on canvas buffer reallocation (fixes GEC-102)",
            "author": "Alex Chen <alex.chen@omnibug.io>",
            "branch": "main",
            "repo_name": "gecko-render-core",
            "diff_snippet": """diff --git a/src/webgl/WebGLContext.cpp b/src/webgl/WebGLContext.cpp
index 4b12a88..7c33e10 100644
--- a/src/webgl/WebGLContext.cpp
+++ b/src/webgl/WebGLContext.cpp
@@ -1138,6 +1138,9 @@ void WebGLContext::AllocateTextureBuffer(uint32_t width, uint32_t height) {
   if (mActiveTexture) {
+    glDeleteTextures(1, &mActiveTexture);
+    mActiveTexture = 0;
   }
   glGenTextures(1, &mActiveTexture);""",
            "web_url": "https://github.com/omnibug/gecko-render-core/commit/c3e4f5a",
            "created_at": now - timedelta(days=1)
        }
    ]
    db.commits.insert_many(commits_data)

    # 8. Seed Activity Log
    activities_data = [
        {
            "_id": ObjectId("65e700000000000000000001"),
            "bug_id": str(bugs_data[0]["_id"]),
            "bug_key": "GEC-101",
            "user_id": u_sarah,
            "user_name": "Sarah Jenkins",
            "user_avatar": users_data[2]["avatar_url"],
            "action_type": "created",
            "field_name": "status",
            "old_value": None,
            "new_value": "unconfirmed",
            "timestamp": now - timedelta(days=2, hours=4)
        },
        {
            "_id": ObjectId("65e700000000000000000002"),
            "bug_id": str(bugs_data[0]["_id"]),
            "bug_key": "GEC-101",
            "user_id": u_admin,
            "user_name": "Dr. Aris Thorne",
            "user_avatar": users_data[0]["avatar_url"],
            "action_type": "updated_status",
            "field_name": "status",
            "old_value": "unconfirmed",
            "new_value": "in_progress",
            "timestamp": now - timedelta(days=1, hours=20)
        },
        {
            "_id": ObjectId("65e700000000000000000003"),
            "bug_id": str(bugs_data[0]["_id"]),
            "bug_key": "GEC-101",
            "user_id": u_alex,
            "user_name": "Alex Chen",
            "user_avatar": users_data[1]["avatar_url"],
            "action_type": "linked_commit",
            "field_name": "commit",
            "old_value": None,
            "new_value": "a8f3b29 (fix(layout): guard against dangling frame references)",
            "timestamp": now - timedelta(hours=2)
        }
    ]
    db.activities.insert_many(activities_data)

    # Initialize sequence counters
    db.counters.update_one({"_id": "bug_seq_GEC"}, {"$set": {"sequence_value": 103}}, upsert=True)
    db.counters.update_one({"_id": "bug_seq_NEX"}, {"$set": {"sequence_value": 103}}, upsert=True)
    db.counters.update_one({"_id": "bug_seq_PAY"}, {"$set": {"sequence_value": 102}}, upsert=True)
    db.counters.update_one({"_id": "bug_seq_VUI"}, {"$set": {"sequence_value": 102}}, upsert=True)

    print("[OmniBug] Successfully seeded database with realistic products, bugs, git commits, and audit logs!")
