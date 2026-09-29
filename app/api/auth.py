"""Cookie-based authentication for the analyst console."""

from __future__ import annotations

import base64
import hashlib
import hmac
import time

from fastapi import APIRouter, Cookie, HTTPException, Response

from app.config import settings
from app.schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["authentication"])

COOKIE_NAME = "fraud_command_session"


def _sign(value: str) -> str:
    secret = settings.auth_session_secret or settings.auth_password
    return hmac.new(secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256).hexdigest()


def _create_session(email: str) -> str:
    expires_at = int(time.time()) + settings.auth_session_hours * 60 * 60
    payload = f"{email}|{expires_at}"
    encoded = base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii").rstrip("=")
    return f"{encoded}.{_sign(encoded)}"


def read_session(token: str | None) -> str | None:
    if not token or "." not in token or not settings.auth_password:
        return None
    encoded, supplied_signature = token.rsplit(".", 1)
    if not hmac.compare_digest(supplied_signature, _sign(encoded)):
        return None
    try:
        padded = encoded + "=" * (-len(encoded) % 4)
        email, expires_at = base64.urlsafe_b64decode(padded).decode("utf-8").rsplit("|", 1)
        expires_at_value = int(expires_at)
    except (ValueError, UnicodeDecodeError):
        return None
    if expires_at_value <= int(time.time()):
        return None
    if not hmac.compare_digest(email.casefold(), settings.auth_email.casefold()):
        return None
    return email


@router.post("/login")
def login(req: LoginRequest, response: Response):
    if not settings.auth_email or not settings.auth_password:
        raise HTTPException(status_code=503, detail="Console login is not configured.")

    email_matches = hmac.compare_digest(req.email.strip().casefold(), settings.auth_email.casefold())
    password_matches = hmac.compare_digest(req.password, settings.auth_password)
    if not email_matches or not password_matches:
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")

    response.set_cookie(
        key=COOKIE_NAME,
        value=_create_session(settings.auth_email),
        max_age=settings.auth_session_hours * 60 * 60,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return {"authenticated": True, "email": settings.auth_email}


@router.get("/session")
def session(fraud_command_session: str | None = Cookie(default=None)):
    email = read_session(fraud_command_session)
    return {"authenticated": email is not None, "email": email}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"authenticated": False}
