from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/api/workflows", tags=["Workflows & Custom State Machines"])

WORKFLOW_STATES = [
    {
        "id": "unconfirmed",
        "name": "Unconfirmed",
        "color": "slate",
        "description": "Initial state for newly reported bugs awaiting triage and reproduction.",
        "allowed_transitions": ["confirmed", "in_progress", "resolved", "closed"]
    },
    {
        "id": "confirmed",
        "name": "Confirmed",
        "color": "blue",
        "description": "Reproduction steps verified by QA; accepted into engineering backlog.",
        "allowed_transitions": ["in_progress", "resolved", "closed"]
    },
    {
        "id": "in_progress",
        "name": "In Progress",
        "color": "amber",
        "description": "Assigned engineer is actively investigating or implementing fix.",
        "allowed_transitions": ["in_review", "resolved", "confirmed", "unconfirmed"]
    },
    {
        "id": "in_review",
        "name": "In Code Review",
        "color": "purple",
        "description": "Pull request submitted; awaiting peer review and automated CI pass.",
        "allowed_transitions": ["resolved", "in_progress"]
    },
    {
        "id": "resolved",
        "name": "Resolved",
        "color": "emerald",
        "description": "Code fix merged or defect addressed with resolution reason.",
        "allowed_transitions": ["verified", "reopened", "closed"]
    },
    {
        "id": "verified",
        "name": "Verified",
        "color": "teal",
        "description": "QA tester has validated fix in staging environment against reproduction test suite.",
        "allowed_transitions": ["closed", "reopened"]
    },
    {
        "id": "closed",
        "name": "Closed",
        "color": "gray",
        "description": "Defect lifecycle completed and verified in production release.",
        "allowed_transitions": ["reopened"]
    },
    {
        "id": "reopened",
        "name": "Reopened",
        "color": "rose",
        "description": "Defect re-occurred or fix failed regression tests.",
        "allowed_transitions": ["in_progress", "confirmed", "resolved"]
    }
]

SLA_POLICIES = [
    {"severity": "blocker", "max_response_hours": 2, "max_resolution_hours": 12, "escalation_role": "lead_dev"},
    {"severity": "critical", "max_response_hours": 4, "max_resolution_hours": 24, "escalation_role": "lead_dev"},
    {"severity": "major", "max_response_hours": 12, "max_resolution_hours": 48, "escalation_role": "developer"},
    {"severity": "normal", "max_response_hours": 24, "max_resolution_hours": 72, "escalation_role": "developer"},
    {"severity": "minor", "max_response_hours": 48, "max_resolution_hours": 120, "escalation_role": "developer"},
    {"severity": "trivial", "max_response_hours": 72, "max_resolution_hours": 240, "escalation_role": "developer"},
    {"severity": "enhancement", "max_response_hours": 120, "max_resolution_hours": 360, "escalation_role": "developer"}
]

@router.get("/states")
def get_workflow_states():
    return WORKFLOW_STATES

@router.get("/sla-policies")
def get_sla_policies():
    return SLA_POLICIES
