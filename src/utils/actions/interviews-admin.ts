// utils/actions/interviews-admin.ts

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// 🔐 Mesmo esquema do seu arquivo de quizzes
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

// Tipo básico de uma entrevista para listagem
export type InterviewSummary = {
    id: number;
    quiz_id: number;
    started_at: string | null;
    finished_at: string | null;
    duration_ms?: number | null;
    respondent_name?: string | null;
    respondent_phone?: string | null;
    respondent_email?: string | null;
};

type ListInterviewsRes = {
    interviews: InterviewSummary[];
};

// ▶️ Lista todas as entrevistas de um questionário
export async function listInterviewsByQuiz(
    quizId: number
): Promise<InterviewSummary[] | null> {
    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(`${BASE_API_URL}/interviews/quiz/${quizId}`, {
            method: "GET",
            headers,
            next: { revalidate: 0 }, // sem cache
        });

        if (!res.ok) {
            console.error("Erro ao listar entrevistas:", res.status);
            return null;
        }

        const json = (await res.json()) as ListInterviewsRes;
        return json?.interviews ?? [];
    } catch (error) {
        console.error("Erro ao buscar entrevistas:", error);
        return null;
    }
}

// 🗑️ Excluir uma entrevista + respostas
export async function deleteInterview(id: number): Promise<boolean> {
    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(`${BASE_API_URL}/interviews/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(
                `Erro da API: ${res.status} - ${err.message || res.statusText}`
            );
        }

        return true;
    } catch (error) {
        console.error("Erro ao deletar entrevista:", error);
        throw error;
    }
}
