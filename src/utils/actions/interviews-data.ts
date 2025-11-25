// utils/actions/interviews-data.ts
const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// mesmo esquema que você já usa nos outros arquivos
async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token");

    if (!res.ok) {
        throw new Error("Token não encontrado");
    }

    const data = await res.json();

    return {
        Authorization: `Bearer ${data.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
    };
}

/* ============================================================
   LISTA DE ENTREVISTAS (ADMIN)
   ============================================================ */

export type AdminInterviewListItem = {
    id: number;
    quiz_id: number;
    respondent_name: string | null;
    respondent_email: string | null;
    respondent_phone: string | null;
    started_at: string | null;
    finished_at: string | null;
    duration_ms: number | null;
    source?: string | null;
    interviewer_name?: string | null;
    summary?: string | null; // <- resumo das respostas (montado no backend)
    created_at: string;
};

export async function listInterviewsByQuiz(
    quizId: number
): Promise<AdminInterviewListItem[]> {
    if (!quizId) return [];

    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/interviews/quiz/${quizId}`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!res.ok) {
        console.error("Erro HTTP listInterviewsByQuiz:", res.status, res.statusText);
        throw new Error("Erro ao listar entrevistas");
    }

    const json = await res.json().catch(() => null);

    if (!json) return [];

    // Backend: { items: [...] }
    if (Array.isArray(json.items)) return json.items;

    // fallback se um dia mudar
    if (Array.isArray(json.interviews)) return json.interviews;
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json)) return json;

    return [];
}

export async function deleteInterview(id: number): Promise<void> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/interviews/${id}`, {
        method: "DELETE",
        headers,
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
            error?.message || `Erro ao excluir entrevista (HTTP ${res.status})`
        );
    }
}

/* ============================================================
   RESPOSTAS DA ENTREVISTA – LISTAR E ATUALIZAR (ADMIN)
   ============================================================ */

export type InterviewAnswer = {
    id: number;
    interview_id: number;
    question_id: number;
    option_id: number | null;
    value_text: string | null;
    value_number: number | null;
    value_bool: boolean | null;
    value_json: any | null;
    created_at: string;
    updated_at: string | null;

    // campos extras opcionais que o backend pode mandar
    question_title?: string | null;
    question_variable?: string | null;
    option_label?: string | null;
};

// 🔎 Buscar respostas de uma entrevista
export async function listInterviewAnswers(
    interviewId: number
): Promise<InterviewAnswer[] | null> {
    if (!interviewId) return null;

    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(
            `${BASE_API_URL}/interviews/${interviewId}/answers`,
            {
                method: "GET",
                headers,
                cache: "no-store",
            }
        );

        if (!res.ok) {
            console.error(
                "Erro HTTP listInterviewAnswers:",
                res.status,
                res.statusText
            );
            throw new Error("Erro ao listar respostas da entrevista");
        }

        const json = await res.json().catch(() => null);
        if (!json) return null;

        if (Array.isArray(json.items)) return json.items;
        if (Array.isArray(json.answers)) return json.answers;
        if (Array.isArray(json.data)) return json.data;
        if (Array.isArray(json)) return json;

        return null;
    } catch (error) {
        console.error("Erro ao buscar respostas da entrevista:", error);
        return null;
    }
}

// 💾 Atualizar respostas (rota protegida /interviews/:id/answers-admin)
export async function updateInterviewAnswers(
    interviewId: number,
    answers: {
        question_id: number;
        option_id?: number | null;
        value_text?: string | null;
        value_number?: number | null;
        value_bool?: boolean | null;
        value_json?: any | null;
    }[]
) {
    const headers = await getServerAuthHeaders();

    const res = await fetch(
        `${BASE_API_URL}/interviews/${interviewId}/answers-admin`,
        {
            method: "PUT",
            headers,
            body: JSON.stringify({ answers }),
        }
    );

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
            errorData?.message ||
            `Erro ao atualizar respostas da entrevista (HTTP ${res.status})`
        );
    }

    return res.json();
}
