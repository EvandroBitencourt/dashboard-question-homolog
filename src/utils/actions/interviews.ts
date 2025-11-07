// utils/actions/interviews-public.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
        cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
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
        body: JSON.stringify({ duration_ms: durationMs }),
    });
}
