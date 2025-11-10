import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Tabs } from "../components/Tabs";

const humanizeLabel = (value: string): string =>
  value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

type Ruling = {
  verdict: string;
  rationale: string;
  plain_explanation?: string;
  citations: string[];
  risk_flags: string[];
  created_at: string;
};

type BiasCheck = {
  bias_score: number;
  notes: string[];
  created_at: string;
};

type CaseSummary = {
  id: number;
  title: string;
  narrative: string;
  locale: string;
  created_at: string;
};

type CaseDetail = CaseSummary & {
  ruling?: Ruling;
  bias_check?: BiasCheck;
};

type LogEntry = {
  id: number;
  action: string;
  meta_json: Record<string, unknown> | null;
  created_at: string;
};

type FormattedLogEntry = {
  primary: string;
  secondary?: string;
  fallbackMeta?: Record<string, unknown> | null;
};

interface DashboardProps {
  username: string;
  onLogout: () => Promise<void>;
}

const localeOptions = ["California", "New York", "Texas", "Illinois", "Florida"];

export const Dashboard: React.FC<DashboardProps> = ({ username, onLogout }) => {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [formState, setFormState] = useState({
    title: "",
    locale: localeOptions[0],
    narrative: "",
    biasCheck: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ruling" | "bias">("ruling");
  const [showPlain, setShowPlain] = useState(true);

  const fetchCases = useCallback(async () => {
    const response = await fetch("/api/cases", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Unable to load cases");
    }
    const data = await response.json();
    setCases(data.cases);
    if (data.cases.length > 0) {
      const id = data.cases[0].id;
      setSelectedCaseId((prev) => prev ?? id);
    }
  }, []);

  const fetchCaseDetail = useCallback(async (caseId: number) => {
    const response = await fetch(`/api/cases/${caseId}`, { credentials: "include" });
    if (!response.ok) {
      throw new Error("Unable to load case");
    }
    const data = await response.json();
    setSelectedCase(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const response = await fetch("/api/logs", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Unable to load logs");
    }
    const data = await response.json();
    setLogs(data.logs);
  }, []);

  useEffect(() => {
    fetchCases().catch((err) => setError(err.message));
    fetchLogs().catch(() => undefined);
  }, [fetchCases, fetchLogs]);

  useEffect(() => {
    if (selectedCaseId != null) {
      fetchCaseDetail(selectedCaseId).catch((err) => setError(err.message));
    } else {
      setSelectedCase(null);
    }
  }, [selectedCaseId, fetchCaseDetail]);

  const caseTitleById = useMemo(() => {
    const map = new Map<number, string>();
    cases.forEach((caseItem) => {
      map.set(caseItem.id, caseItem.title);
    });
    return map;
  }, [cases]);

  const formatLogEntry = useCallback(
    (log: LogEntry): FormattedLogEntry => {
      const meta = (log.meta_json ?? {}) as Record<string, unknown>;
      const caseId = typeof meta["caseId"] === "number" ? (meta["caseId"] as number) : undefined;
      const caseTitleFromMeta = typeof meta["title"] === "string" ? (meta["title"] as string) : undefined;
      const verdict = typeof meta["verdict"] === "string" ? (meta["verdict"] as string) : undefined;
      const biasScore = typeof meta["biasScore"] === "number" ? (meta["biasScore"] as number) : undefined;
      const caseLabel =
        caseTitleFromMeta ??
        (caseId != null ? caseTitleById.get(caseId) ?? `Case #${caseId}` : undefined);

      switch (log.action) {
        case "case_create":
          return {
            primary: caseLabel ? `Submitted new case "${caseLabel}"` : "Submitted a new case",
          };
        case "ruling_generated":
          return {
            primary: caseLabel ? `Generated ruling for ${caseLabel}` : "Generated a ruling",
            secondary: verdict ? `Outcome: ${humanizeLabel(verdict)}` : undefined,
          };
        case "bias_checked":
          return {
            primary: caseLabel ? `Ran bias review for ${caseLabel}` : "Ran bias review",
            secondary:
              typeof biasScore === "number"
                ? `Bias score: ${(biasScore * 100).toFixed(0)}%`
                : undefined,
          };
        case "login":
          return { primary: "Signed in" };
        default: {
          const hasMeta = log.meta_json && Object.keys(log.meta_json).length > 0;
          return {
            primary: humanizeLabel(log.action),
            fallbackMeta: hasMeta ? log.meta_json : undefined,
          };
        }
      }
    },
    [caseTitleById],
  );

  const handleCreateCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: formState.title,
          locale: formState.locale,
          narrative: formState.narrative,
        }),
      });
      if (!response.ok) {
        throw new Error("Could not create case");
      }
      const created = await response.json();
      await fetchCases();
      await fetchCaseDetail(created.id);
      setSelectedCaseId(created.id);
      setFormState((state) => ({ ...state, title: "", narrative: "" }));
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRuling = async (caseId: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/rule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bias_check: formState.biasCheck }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || "Unable to generate ruling");
      }
      const data = await response.json();
      setSelectedCase((prev) =>
        prev
          ? {
              ...prev,
              ruling: data.ruling,
              bias_check: data.bias_check ?? prev.bias_check,
            }
          : prev
      );
      await fetchCaseDetail(caseId);
      await fetchLogs();
      setActiveTab("ruling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const narrativeWordCount = useMemo(() => {
    return formState.narrative ? formState.narrative.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [formState.narrative]);

  const verdictToneClass = useMemo(() => {
    if (!selectedCase?.ruling) return "text-white";
    const verdictValue = selectedCase.ruling.verdict.toLowerCase();
    if (["innocent", "dismissed", "not guilty"].includes(verdictValue)) {
      return "text-emerald-300";
    }
    if (["guilty"].includes(verdictValue)) {
      return "text-rose-300";
    }
    if (["reduced", "settlement", "settled"].includes(verdictValue)) {
      return "text-blue-300";
    }
    return "text-amber-300";
  }, [selectedCase?.ruling]);

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">CourtIntel Courtroom Agent</h1>
            <p className="text-sm text-white/60">End-to-end demo for minor hearing support</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/70">Signed in as {username}</span>
            <Button variant="secondary" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </header>

        {error && <div className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-3 text-sm">{error}</div>}

        <div className="grid gap-6 md:grid-cols-2">
          <Card title="New Case Intake" actions={null} className="h-full">
            <form className="space-y-4" onSubmit={handleCreateCase}>
              <Input
                label="Case title"
                value={formState.title}
                onChange={(e) => setFormState((state) => ({ ...state, title: e.target.value }))}
                required
              />
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70 font-medium">Locale / Jurisdiction</span>
                <select
                  className="rounded-lg border border-accent/30 bg-brand px-3 py-2 shadow-inner focus-visible:ring-2 focus-visible:ring-accent"
                  value={formState.locale}
                  onChange={(e) => setFormState((state) => ({ ...state, locale: e.target.value }))}
                >
                  {localeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-white/70 font-medium">Narrative</span>
                <textarea
                  rows={6}
                  className="rounded-lg border border-accent/30 bg-brand px-3 py-2 shadow-inner focus-visible:ring-2 focus-visible:ring-accent resize-none"
                  placeholder="Describe what happened, including relevant details and context."
                  value={formState.narrative}
                  onChange={(e) => setFormState((state) => ({ ...state, narrative: e.target.value }))}
                  required
                />
                <span className="text-xs text-white/50">{narrativeWordCount} words (max 500)</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={formState.biasCheck}
                  onChange={(e) => setFormState((state) => ({ ...state, biasCheck: e.target.checked }))}
                />
                Run bias check automatically
              </label>
              <Button type="submit" fullWidth disabled={loading}>
                {loading ? "Submitting..." : "Submit Case"}
              </Button>
            </form>
          </Card>

          <Card title="Your Cases" className="h-full">
            <div className="space-y-3 overflow-y-auto max-h-[420px] pr-2">
              {cases.length === 0 && (
                <p className="text-sm text-white/60">No cases yet. Add your first case using the intake form.</p>
              )}
              {cases.map((caseItem) => (
                <button
                  key={caseItem.id}
                  onClick={() => setSelectedCaseId(caseItem.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedCaseId === caseItem.id
                      ? "border-accent bg-accent/10"
                      : "border-white/10 hover:border-accent/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{caseItem.title}</span>
                    <span className="text-xs text-white/50">
                      {new Date(caseItem.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/60 max-h-14 overflow-hidden">{caseItem.narrative}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {selectedCase && (
          <Card className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">{selectedCase.title}</h2>
                <p className="text-sm text-white/60">
                  Locale: {selectedCase.locale} • Filed {new Date(selectedCase.created_at).toLocaleString()}
                </p>
              </div>
              <Button
                onClick={() => handleGenerateRuling(selectedCase.id)}
                disabled={loading}
                className="md:w-auto w-full"
              >
                {loading ? "Requesting..." : "Generate ruling"}
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Case Narrative</h3>
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed border border-white/10 rounded-xl p-4">
                  {selectedCase.narrative}
                </p>
              </div>
              <div className="space-y-4">
                <Tabs
                  tabs={[
                    { id: "ruling", label: "Ruling" },
                    { id: "bias", label: "Bias check" },
                  ]}
                  active={activeTab}
                  onChange={(id) => setActiveTab(id)}
                />

                {activeTab === "ruling" && selectedCase.ruling ? (
                  <div className="space-y-3 border border-white/15 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="uppercase text-xs tracking-wide text-white/50">Verdict</span>
                      <span className={`text-base font-semibold ${verdictToneClass}`}>
                        {humanizeLabel(selectedCase.ruling.verdict)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">Explanation mode</span>
                      <button
                        className="text-xs text-accent underline"
                        onClick={() => setShowPlain((prev) => !prev)}
                      >
                        {showPlain ? "Show full reasoning" : "Show plain language"}
                      </button>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                      {showPlain && selectedCase.ruling.plain_explanation
                        ? selectedCase.ruling.plain_explanation
                        : selectedCase.ruling.rationale}
                    </p>
                    {selectedCase.ruling.citations?.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-white/50">Citations</span>
                        <ul className="mt-1 list-disc list-inside text-sm text-white/70">
                          {selectedCase.ruling.citations.map((citation) => (
                            <li key={citation}>{citation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedCase.ruling.risk_flags?.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold uppercase text-white/50">Risk flags</span>
                        <ul className="mt-1 list-disc list-inside text-sm text-amber-200/90">
                          {selectedCase.ruling.risk_flags.map((flag) => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === "bias" && selectedCase.bias_check ? (
                  <div className="space-y-3 border border-white/15 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50 uppercase tracking-wide">Bias score</span>
                      <span className="text-base font-semibold text-amber-200">
                        {(selectedCase.bias_check.bias_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    {selectedCase.bias_check.notes.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-white/80">
                        {selectedCase.bias_check.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    )}
                    <p className="text-xs text-white/50">
                      Reviewed {new Date(selectedCase.bias_check.created_at).toLocaleString()}
                    </p>
                  </div>
                ) : null}

                {activeTab === "bias" && !selectedCase.bias_check && (
                  <div className="border border-white/10 rounded-xl p-4 text-sm text-white/60">
                    No bias review has been run yet. Generate a ruling with the bias check option enabled to see
                    results.
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card title="Recent Activity" padding="md">
          {logs.length === 0 ? (
            <p className="text-sm text-white/60">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {logs.map((log) => {
                const formatted = formatLogEntry(log);
                return (
                  <li key={log.id} className="rounded-lg border border-white/10 px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="uppercase tracking-wide text-white/60">
                        {humanizeLabel(log.action)}
                      </span>
                      <span className="text-white/50">
                        {new Date(log.created_at).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/80">{formatted.primary}</p>
                    {formatted.secondary && (
                      <p className="text-xs text-white/60">{formatted.secondary}</p>
                    )}
                    {formatted.fallbackMeta && (
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-white/50">
                        {JSON.stringify(formatted.fallbackMeta, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

