from __future__ import annotations


def _auth_headers(client, username: str):
    client.post("/api/auth/register", json={"username": username, "password": "secret123"})
    resp = client.post("/api/auth/login", json={"username": username, "password": "secret123"})
    assert resp.status_code == 200
    return resp.cookies


def test_case_creation_and_listing(app_client):
    cookies = _auth_headers(app_client, "alice")

    create_resp = app_client.post(
        "/api/cases",
        json={
            "title": "Speeding ticket",
            "narrative": "I was driving slightly over the limit due to an emergency.",
            "locale": "New York",
        },
        cookies=cookies,
    )
    assert create_resp.status_code == 201
    case_id = create_resp.json()["id"]

    list_resp = app_client.get("/api/cases", cookies=cookies)
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert len(data["cases"]) == 1
    assert data["cases"][0]["id"] == case_id

    detail_resp = app_client.get(f"/api/cases/{case_id}", cookies=cookies)
    assert detail_resp.status_code == 200
    assert detail_resp.json()["title"] == "Speeding ticket"


def test_case_ownership(app_client):
    alice_cookies = _auth_headers(app_client, "alice")
    bob_cookies = _auth_headers(app_client, "bob")

    create_resp = app_client.post(
        "/api/cases",
        json={
            "title": "Parking violation",
            "narrative": "The meter was broken when I parked.",
            "locale": "Chicago",
        },
        cookies=alice_cookies,
    )
    case_id = create_resp.json()["id"]

    other_resp = app_client.get(f"/api/cases/{case_id}", cookies=bob_cookies)
    assert other_resp.status_code == 404

