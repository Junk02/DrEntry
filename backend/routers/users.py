from fastapi import APIRouter, Depends, HTTPException
from auth import verify_password, create_access_token
from sqlalchemy.orm import Session
from schemas import UserLogin

from database import get_db
from models import User
from schemas import UserCreate
from auth import hash_password

router = APIRouter()

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed = hash_password(user.password)

    new_user = User(
        username=user.username,
        password_hash=hashed
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id)
    return {"message": "registered", "user_id": new_user.id, "access_token": token}

@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid username or password")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid username or password")

    token = create_access_token(user.id)

    return {"access_token": token}
