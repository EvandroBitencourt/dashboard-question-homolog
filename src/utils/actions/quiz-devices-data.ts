// utils/actions/quiz-devices-data.ts
const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token", { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("Token não encontrado");
    const data = await res.json();
    return {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

function buildBaseUrl(quizId: number | string) {
    return `${BASE_API_URL}/questionnaire/${quizId}/devices`;
}

export async function listAttachedPins(quizId: number) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(buildBaseUrl(quizId), { method: "GET", headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Erro ao listar PINs vinculados (quiz ${quizId}).`);
    return await res.json(); // array [{id,name}]
}

export async function listAvailablePins(quizId: number, term?: string) {
    const headers = await getServerAuthHeaders();
    const qs = term ? `?term=${encodeURIComponent(term)}` : "";
    const res = await fetch(`${buildBaseUrl(quizId)}/available${qs}`, { method: "GET", headers, cache: "no-store" });
    if (!res.ok) throw new Error(`Erro ao listar PINs disponíveis (quiz ${quizId}).`);
    return await res.json(); // array [{id,name}]
}

export async function attachPinToQuiz(quizId: number, payload: { pin_id: number }) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(buildBaseUrl(quizId), { method: "POST", headers, body: JSON.stringify(payload), cache: "no-store" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Erro ao vincular PIN: ${res.status} - ${err.message || res.statusText}`);
    }
    return true;
}

export async function detachPinFromQuiz(quizId: number, pinId: number) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(`${buildBaseUrl(quizId)}/${pinId}`, { method: "DELETE", headers, cache: "no-store" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Erro ao desvincular PIN: ${res.status} - ${err.message || res.statusText}`);
    }
    return true;
}
