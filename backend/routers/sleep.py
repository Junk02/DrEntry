from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import SleepEntry
from schemas import SleepEntryCreate
from auth import get_current_user

router = APIRouter()

@router.post("/sleep/add")
def add_sleep(entry: SleepEntryCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    new_entry = SleepEntry(
        user_id=user.id,
        date=entry.date,
        sleep_time=entry.sleep_time,
        wake_time=entry.wake_time,
        dream_text=entry.dream_text,
        tags=entry.tags,
        mood=entry.mood,
        realism=entry.realism,
        public=entry.public
    )

    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return {"message": "sleep entry added", "id": new_entry.id}

@router.get("/sleep/my")
def get_my_sleep_entries(user=Depends(get_current_user), db: Session = Depends(get_db)):
    entries = db.query(SleepEntry).filter(SleepEntry.user_id == user.id).all()

    return [
        {
            "id": entry.id,
            "date": entry.date,
            "sleep_time": entry.sleep_time,
            "wake_time": entry.wake_time,
            "dream_text": entry.dream_text,
            "tags": entry.tags,
            "mood": entry.mood,
            "realism": entry.realism,
            "created_at": entry.created_at
        }
        for entry in entries
    ]

@router.delete("/sleep/delete/{entry_id}")
def delete_sleep_entry(entry_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(SleepEntry).filter(SleepEntry.id == entry_id).first()

    if not entry:
        return {"error": "entry not found"}

    if entry.user_id != user.id:
        return {"error": "not allowed"}

    db.delete(entry)
    db.commit()

    return {"message": "deleted", "id": entry_id}


@router.put("/sleep/update/{entry_id}")
def update_sleep_entry(entry_id: int, entry: SleepEntryCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(SleepEntry).filter(SleepEntry.id == entry_id).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")

    if existing.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    existing.date = entry.date
    existing.sleep_time = entry.sleep_time
    existing.wake_time = entry.wake_time
    existing.dream_text = entry.dream_text
    existing.tags = entry.tags
    existing.mood = entry.mood
    existing.realism = entry.realism
    existing.public = entry.public

    db.add(existing)
    db.commit()
    db.refresh(existing)

    return {"message": "updated", "id": existing.id}


@router.get("/sleep/public")
def get_public_sleep_entries(db: Session = Depends(get_db)):
    entries = db.query(SleepEntry).filter(SleepEntry.public == True).all()

    return [
        {
            "id": entry.id,
            "date": entry.date,
            "sleep_time": entry.sleep_time,
            "wake_time": entry.wake_time,
            "dream_text": entry.dream_text,
            "tags": entry.tags,
            "mood": entry.mood,
            "realism": entry.realism,
            "author": entry.user.username if entry.user else None,
            "created_at": entry.created_at
        }
        for entry in entries
    ]

