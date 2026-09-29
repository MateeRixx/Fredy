"""Alert queue + analyst workflow endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.api.deps import get_state
from app.core.alert_system import AlertStatus, AlertSystem
from app.schemas import UpdateAlertRequest

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts(
    limit: int = 200,
    status: str | None = None,
    risk: str | None = None,
):
    state = get_state()
    with state.lock():
        if state.alert_system is None:
            return {"alerts": [], "total": 0, "open": 0, "confirmed": 0, "false_positive": 0}
        asys = state.alert_system
        alerts = list(asys._alerts)  # noqa: SLF001
        if status:
            alerts = [a for a in alerts if a.status.value == status]
        if risk:
            alerts = [a for a in alerts if a.risk_level.value == risk]
        alerts.sort(key=lambda a: a.hybrid_score, reverse=True)
        return {
            "alerts": [a.to_dict() for a in alerts[:limit]],
            "total": len(alerts),
            **_alert_counts(asys),
        }


@router.post("/{alert_id}/update")
def update_alert(alert_id: str, req: UpdateAlertRequest):
    state = get_state()
    with state.lock():
        if state.alert_system is None:
            raise HTTPException(status_code=400, detail="No alert system initialized.")
        try:
            status = AlertStatus(req.status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {req.status}")
        updated = state.alert_system.update_alert(alert_id, status, notes=req.notes or "")
        if updated is None:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")
        return updated.to_dict()


def _alert_counts(asys: AlertSystem) -> dict:
    counts = {s.value: 0 for s in AlertStatus}
    for a in asys._alerts:  # noqa: SLF001
        counts[a.status.value] = counts.get(a.status.value, 0) + 1
    return {
        "open": counts["open"] + counts["investigating"],
        "investigating": counts["investigating"],
        "confirmed": counts["confirmed_fraud"],
        "false_positive": counts["false_positive"],
        "dismissed": counts["dismissed"],
        "false_positive_rate": asys.get_false_positive_rate(),
    }
