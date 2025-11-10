import { api, resetDatabase } from "./helpers.js";

async function registerAndLogin(username: string) {
  await api().post("/api/auth/register").send({ username, password: "secret123" });
  const login = await api().post("/api/auth/login").send({ username, password: "secret123" });
  const cookie = login.headers["set-cookie"];
  if (!cookie) throw new Error("Missing auth cookie");
  return cookie;
}

describe("Case routes", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates and lists cases for the current user", async () => {
    const cookie = await registerAndLogin("caseowner");

    const create = await api()
      .post("/api/cases")
      .set("Cookie", cookie)
      .send({
        title: "Speeding ticket",
        narrative: "I sped due to an emergency but slowed immediately after.",
        locale: "New York",
      });

    expect(create.status).toBe(201);
    const caseId = create.body.id;
    expect(caseId).toBeDefined();

    const list = await api().get("/api/cases").set("Cookie", cookie);
    expect(list.status).toBe(200);
    expect(list.body.cases).toHaveLength(1);
    expect(list.body.cases[0].id).toBe(caseId);

    const detail = await api().get(`/api/cases/${caseId}`).set("Cookie", cookie);
    expect(detail.status).toBe(200);
    expect(detail.body.title).toBe("Speeding ticket");
  });

  it("enforces ownership", async () => {
    const aliceCookie = await registerAndLogin("alice");
    const bobCookie = await registerAndLogin("bob");

    const created = await api()
      .post("/api/cases")
      .set("Cookie", aliceCookie)
      .send({
        title: "Parking violation",
        narrative: "Meter was broken but still received a ticket.",
        locale: "Chicago",
      });

    const caseId = created.body.id;

    const forbidden = await api().get(`/api/cases/${caseId}`).set("Cookie", bobCookie);
    expect(forbidden.status).toBe(404);
  });
});

