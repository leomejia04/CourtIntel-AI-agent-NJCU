from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field, validator


class Message(BaseModel):
    detail: str


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)


class UserLogin(UserCreate):
    pass


class UserOut(UserBase):
    created_at: datetime

    class Config:
        orm_mode = True


class CaseBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=120)
    narrative: str = Field(..., min_length=5)
    locale: str = Field(..., min_length=2, max_length=80)

    @validator("narrative")
    def narrative_word_count(cls, v: str) -> str:
        words = v.split()
        if not (1 <= len(words) <= 500):
            raise ValueError("Narrative must be between 1 and 500 words")
        return v


class CaseCreate(CaseBase):
    pass


class CaseOut(CaseBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class RulingBase(BaseModel):
    verdict: str
    rationale: str
    citations: List[str] = []
    risk_flags: List[str] = []
    model_name: str
    tokens_in: int
    tokens_out: int
    created_at: datetime

    class Config:
        orm_mode = True


class RulingResponse(BaseModel):
    verdict: str
    rationale: str
    citations: List[str]
    risk_flags: List[str]
    model_name: str
    tokens_in: int
    tokens_out: int
    created_at: datetime


class BiasCheckResponse(BaseModel):
    bias_score: float
    notes: List[str]
    created_at: datetime

    class Config:
        orm_mode = True


class CaseDetail(CaseOut):
    ruling: Optional[RulingResponse]
    bias_check: Optional[BiasCheckResponse]


class CaseList(BaseModel):
    cases: List[CaseOut]


class BiasCheckRequest(BaseModel):
    bias_check: bool = False


class LogEntry(BaseModel):
    id: int
    action: str
    meta_json: Optional[Any]
    created_at: datetime

    class Config:
        orm_mode = True


class LogsResponse(BaseModel):
    logs: List[LogEntry]

