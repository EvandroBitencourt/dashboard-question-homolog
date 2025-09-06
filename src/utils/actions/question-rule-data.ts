import type { QuestionRule } from "../types/question-rule";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const BASE_URL = `${BASE_API_URL}/question-rule`;

async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token", { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error("Token não encontrado");
    return {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

export async function listQuestionRules(params?: { quizId?: number; questionId?: number }) {
    const headers = await getServerAuthHeaders();
    const q: string[] = [];
    if (params?.quizId) q.push(`quiz_id=${encodeURIComponent(params.quizId)}`);
    if (params?.questionId) q.push(`question_id=${encodeURIComponent(params.questionId)}`);
    const url = `${BASE_URL}${q.length ? `?${q.join("&")}` : ""}`;

    const res = await fetch(url, { headers, cache: "no-cache" });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as QuestionRule[];
}

export async function createQuestionRule(payload: QuestionRule) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as QuestionRule;
}

export async function deleteQuestionRule(id: number) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(`${BASE_URL}/${id}`, { method: "DELETE", headers });
    if (!res.ok) throw new Error(await res.text());
    return true;
}
