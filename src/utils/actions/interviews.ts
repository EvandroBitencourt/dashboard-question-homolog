// utils/actions/interviews.ts
// 👉 Este arquivo é usado no CLIENTE (form público). Para evitar mixed content/CORS,
// roteamos tudo pelo rewrite do Next: "/_b" → process.env.NEXT_PUBLIC_API_URL.

const CLIENT_BASE = "/_b"; // sempre via proxy
const DEBUG = true;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${CLIENT_BASE}${path}`.replace(/(?<!:)\/{2,}/g, "/");
    DEBUG && console.log("[interviews.ts] fetch:", url, init?.method || "GET");
    const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
        cache: "no-store",
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        DEBUG && console.warn("[interviews.ts] HTTP FAIL:", res.status, txt);
        throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json() as Promise<T>;
}

export type StartInterviewReq = {
    quiz_id: number;
    source: "desktop";
    consent_email?: 0 | 1 | boolean;
    respondent_name?: string | null;
    respondent_phone?: string | null;
};

export type StartInterviewRes = { interview: { id: number } };

export function startInterview(body: StartInterviewReq) {
    return api<StartInterviewRes>("/api/interviews/start", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export type CreateAnswerReq = {
    question_id: number;
    option_id?: number;
    value_text?: string | null;
    value_number?: number | null;
    value_bool?: boolean | null;
    value_json?: unknown;
    time_spent_ms?: number;
};

export type CreateAnswerRes = { answer: { id: number } };

export function createAnswer(interviewId: number, body: CreateAnswerReq) {
    return api<CreateAnswerRes>(`/api/interviews/${interviewId}/answers`, {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export function deleteLastAnswer(interviewId: number) {
    return api<{ deleted_answer_id: number }>(
        `/api/interviews/${interviewId}/answers/last`,
        { method: "DELETE" }
    );
}

export function finalizeInterview(interviewId: number, durationMs: number) {
    return api<{ ok: true }>(`/api/interviews/${interviewId}/finalize`, {
        method: "POST",
        body: JSON.stringify({
            interview_id: interviewId,
            duration_ms: durationMs,
        }),
    });
}

/** Verifica no servidor se a entrevista existe (evita ID antigo do localStorage). */
export async function checkInterviewExists(interviewId: number): Promise<boolean> {
    try {
        const url = `${CLIENT_BASE}/api/interviews/${interviewId}/answers`;
        DEBUG && console.log("[interviews.ts] HEAD/GET exists:", url);
        const res = await fetch(url, { method: "GET", cache: "no-store" });
        return res.ok;
    } catch {
        return false;
    }
}
