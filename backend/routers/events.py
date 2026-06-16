from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database_mongo import get_mongo_db, get_next_sequence_value
from schemas import EventCreate, EventResponse
from routers.users import get_current_user

router = APIRouter()

@router.post("/", response_model=EventResponse)
def create_event(event_data: EventCreate, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    if event_data.community_id:
        comm = db.communities.find_one({"id": event_data.community_id})
        if not comm:
            raise HTTPException(status_code=404, detail="Community not found")
            
    new_event_id = get_next_sequence_value("events")
    new_event = {
        "id": new_event_id,
        "title": event_data.title,
        "description": event_data.description,
        "date": event_data.date,
        "time": event_data.time,
        "location": event_data.location,
        "community_id": event_data.community_id,
        "created_by": current_user["id"],
        "rsvps": []
    }
    db.events.insert_one(new_event)
    new_event.pop("_id", None)
    return new_event

@router.get("/", response_model=List[EventResponse])
def get_events(community_id: int = None, db = Depends(get_mongo_db)):
    query_filter = {}
    if community_id is not None:
        query_filter["community_id"] = community_id
    # Sort by date asc
    events = list(db.events.find(query_filter).sort("date", 1))
    for e in events:
        e.pop("_id", None)
    return events

@router.post("/{event_id}/rsvp", response_model=EventResponse)
def toggle_rsvp(event_id: int, current_user = Depends(get_current_user), db = Depends(get_mongo_db)):
    event = db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    current_rsvps = list(event.get("rsvps") or [])
    user_id = current_user["id"]
    if user_id in current_rsvps:
        current_rsvps.remove(user_id)
    else:
        current_rsvps.append(user_id)
        
    db.events.update_one({"id": event_id}, {"$set": {"rsvps": current_rsvps}})
    event["rsvps"] = current_rsvps
    event.pop("_id", None)
    return event
