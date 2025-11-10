import { jest } from "@jest/globals";
await jest.unstable_mockModule("../src/services/openaiClient.js", () => ({
  generateRuling: jest.fn().mockResolvedValue({
    verdict: "reduced",
    rationale:
      "The driver cooperated, has a clean record, and explained the emergency. Applicable guidelines allow reduction. A reduced fine maintains accountability while recognizing mitigating factors. No aggravating details surfaced.",
    citations: ["Demo Statute 1.2"],
    riskFlags: ["Standardize fine reductions"],
    modelName: "mock-model",
    tokensIn: 123,
    tokensOut: 456,
    rawJson: {
      verdict: "reduced",
      rationale: "Mock rationale JSON.",
      citations: ["Demo Statute 1.2"],
      risk_flags: ["Standardize fine reductions"],
    },
  }),
  runBiasCheck: jest.fn().mockResolvedValue({
    biasScore: 0.15,
    notes: ["Language remains neutral", "No sensitive attributes referenced"],
  }),
}));
const { api, resetDatabase } = await import("./helpers.js");
const { generateRuling, runBiasCheck } = await import("../src/services/openaiClient.js");

async function loginUser() {
  await api().post("/api/auth/register").send({ username: "judge", password: "secret123" });
  const login = await api().post("/api/auth/login").send({ username: "judge", password: "secret123" });
  const cookie = login.headers["set-cookie"];
  if (!cookie) throw new Error("Missing cookie");
  return cookie;
}

describe("Ruling generation", () => {
  beforeEach(async () => {
    await resetDatabase();
    jest.clearAllMocks();
  });

  it("generates rulings and bias checks", async () => {
    const cookie = await loginUser();

    const created = await api()
      .post("/api/cases")
      .set("Cookie", cookie)
      .send({
        title: "Stop sign",
        narrative: "I stopped fully but the officer observed differently.",
        locale: "California",
      });

    const caseId = created.body.id;

    const rulingResponse = await api()
      .post(`/api/cases/${caseId}/rule`)
      .set("Cookie", cookie)
      .send({ bias_check: true });

    expect(rulingResponse.status).toBe(201);
    expect(generateRuling).toHaveBeenCalled();
    expect(runBiasCheck).toHaveBeenCalled();

    const payload = rulingResponse.body;
    expect(payload.ruling.verdict).toBe("reduced");
    expect(payload.bias_check.bias_score).toBeCloseTo(0.15);

    const detail = await api().get(`/api/cases/${caseId}`).set("Cookie", cookie);
    expect(detail.body.ruling.verdict).toBe("reduced");
    expect(detail.body.bias_check.notes).toHaveLength(2);

    const logs = await api().get("/api/logs").set("Cookie", cookie);
    const actions = logs.body.logs.map((entry: { action: string }) => entry.action);
    expect(actions).toContain("ruling_generated");
    expect(actions).toContain("bias_checked");
  });
});

