from pydantic import BaseModel, Field
from typing import Optional
import re

USERNAME_REGEX = r"^[A-Za-z0-9_]+$"
PASSWORD_REGEX = r"^[A-Za-z0-9_]{8,}$"

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    password: str

    @classmethod
    def validate_username(cls, v):
        if not re.match(USERNAME_REGEX, v):
            raise ValueError("Username can contain only letters, digits and underscores")
        return v

    @classmethod
    def validate_password(cls, v):
        if not re.match(PASSWORD_REGEX, v):
            raise ValueError("Password must be at least 8 characters and contain only letters, digits and underscores")
        return v

    def model_validate(self):
        self.validate_username(self.username)
        self.validate_password(self.password)
        return self

class UserLogin(BaseModel):
    username: str
    password: str


class SleepEntryCreate(BaseModel):
    date: str
    sleep_time: str
    wake_time: str
    dream_text: str
    tags: Optional[str] = ""
    mood: int = Field(..., ge=-10, le=10)
    realism: int = Field(..., ge=-10, le=10)
    public: bool = False