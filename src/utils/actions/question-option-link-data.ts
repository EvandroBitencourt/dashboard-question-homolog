// src/utils/actions/question-option-link-data.ts

export type OptionLink = {
    id?: number;
    quiz_id: number;
    source_question_id: number;
    source_option_id: number;
    target_question_id: number;
    target_option_id: number;
};

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const BASE_URL = `${BASE_API_URL}/question-option-link`;

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

/** Lista vínculos existentes
 *  GET /api/question-option-link?quiz_id=&source_question_id=&source_option_id[&target_question_id]
 */
export async function listOptionLinks(params: {
    quiz_id: number;
    source_question_id: number;
    source_option_id: number;
    target_question_id?: number;
}): Promise<OptionLink[]> {
    const headers = await getServerAuthHeaders();

    const qs = new URLSearchParams();
    qs.set("quiz_id", String(params.quiz_id));
    qs.set("source_question_id", String(params.source_question_id));
    qs.set("source_option_id", String(params.source_option_id));
    if (params.target_question_id) {
        qs.set("target_question_id", String(params.target_question_id));
    }

    const res = await fetch(`${BASE_URL}?${qs.toString()}`, {
        headers,
        cache: "no-cache",
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as OptionLink[];
}

/** Cria 1 vínculo
 *  POST /api/question-option-link
 */
export async function createOptionLink(payload: OptionLink) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(BASE_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as OptionLink;
}

/** Remove 1 vínculo (DELETE com body)
 *  DELETE /api/question-option-link
 */
export async function deleteOptionLink(payload: OptionLink) {
    const headers = await getServerAuthHeaders();
    const res = await fetch(BASE_URL, {
        method: "DELETE",
        headers,
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
}

/** Salva em lote:
 *  - cria todos de `toCreate`
 *  - deleta todos de `toDelete`
 *  (mantém o mesmo padrão do resto das actions)
 */
export async function saveOptionLinks(payload: {
    toCreate: OptionLink[];
    toDelete: OptionLink[];
}) {
    const { toCreate = [], toDelete = [] } = payload || {};

    // roda em paralelo e relata sucesso/erros individualmente
    const createResults = await Promise.allSettled(toCreate.map(createOptionLink));
    const deleteResults = await Promise.allSettled(toDelete.map(deleteOptionLink));

    const created = createResults
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean);
    const deleted = deleteResults
        .map((r) => (r.status === "fulfilled" ? r.value : null))
        .filter(Boolean);

    const createErrors = createResults.filter((r) => r.status === "rejected");
    const deleteErrors = deleteResults.filter((r) => r.status === "rejected");

    return {
        ok: createErrors.length === 0 && deleteErrors.length === 0,
        created,
        deleted,
        createErrors,
        deleteErrors,
    };
}
