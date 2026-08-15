from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    sleep_entries = relationship("SleepEntry", back_populates="user")


class SleepEntry(Base):
    __tablename__ = "sleep_entries"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="sleep_entries")

    date = Column(String)              # формат dd.mm.yyyy
    sleep_time = Column(String)        # формат HH:MM
    wake_time = Column(String)         # формат HH:MM

    dream_text = Column(Text)
    tags = Column(String)              # например: "nightmare, flying"

    mood = Column(Integer)             # -10 .. 10
    realism = Column(Integer)          # -10 .. 10

    public = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)


