from __future__ import annotations


def _login(client, username: str):
    client.post("/api/auth/register", json={"username": username, "password": "secret123"})
    resp = client.post("/api/auth/login", json={"username": username, "password": "secret123"})
    return resp.cookies


def test_ruling_and_bias_flow(app_client):
    cookies = _login(app_client, "judge")
    case_resp = app_client.post(
        "/api/cases",
        json={
            "title": "Stop sign",
            "narrative": "I stopped but the officer said I rolled through the stop sign.",
            "locale": "California",
        },
        cookies=cookies,
    )
    case_id = case_resp.json()["id"]

    rule_resp = app_client.post(f"/api/cases/{case_id}/rule", json={"bias_check": True}, cookies=cookies)
    assert rule_resp.status_code == 201
    payload = rule_resp.json()
    assert "ruling" in payload
    assert "bias_check" in payload
    assert payload["ruling"]["plain_explanation"]

    detail_resp = app_client.get(f"/api/cases/{case_id}", cookies=cookies)
    detail = detail_resp.json()
    assert detail["ruling"]["verdict"] == "reduced"
    assert detail["bias_check"]["bias_score"] == 0.2

    logs_resp = app_client.get("/api/logs", cookies=cookies)
    logs = logs_resp.json()["logs"]
    actions = [entry["action"] for entry in logs]
    assert "ruling_generated" in actions
    assert "bias_checked" in actions

