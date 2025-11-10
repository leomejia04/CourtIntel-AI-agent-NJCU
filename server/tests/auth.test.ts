import { api, resetDatabase } from "./helpers.js";

describe("Auth routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("registers, logs in, returns current user, and logs out", async () => {
    const register = await api().post("/api/auth/register").send({
      username: "alice",
      password: "secret123",
    });

    expect(register.status).toBe(201);
    expect(register.body.username).toBe("alice");

    const login = await api().post("/api/auth/login").send({
      username: "alice",
      password: "secret123",
    });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"];
    expect(cookie).toBeDefined();

    const me = await api().get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.username).toBe("alice");

    const logout = await api().post("/api/auth/logout").set("Cookie", cookie);
    expect(logout.status).toBe(204);

    const meAfter = await api().get("/api/auth/me");
    expect(meAfter.status).toBe(401);
  });
});

