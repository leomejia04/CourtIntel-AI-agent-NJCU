from __future__ import annotations


def test_auth_flow(app_client):
    register_resp = app_client.post(
        "/api/auth/register", json={"username": "alice", "password": "secret123"}
    )
    assert register_resp.status_code == 201

    login_resp = app_client.post("/api/auth/login", json={"username": "alice", "password": "secret123"})
    assert login_resp.status_code == 200
    assert "courtintel_session" in login_resp.cookies

    me_resp = app_client.get("/api/auth/me", cookies=login_resp.cookies)
    assert me_resp.status_code == 200
    assert me_resp.json()["username"] == "alice"

    logout_resp = app_client.post("/api/auth/logout", cookies=login_resp.cookies)
    assert logout_resp.status_code == 204

