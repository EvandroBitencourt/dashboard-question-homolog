const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// 🔐 Mesmo esquema do seu arquivo de quizzes / entrevistas
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

// ===============================
// TIPAGEM COMPLETA DO DASHBOARD
// ===============================
export type DashboardSummary = {
    quiz_id: number;
    quiz_title?: string;
    max_sample: number;
    total_completed: number;
    avg_duration_minutes: number;
    daily_average: number;
    completion_percent: number;

    quotas: {
        id: number;
        quiz_id: number;
        question_id: number;
        option_id: number;
        option_label: string;
        limit: number;
        count: number;
        sort_order: number;
    }[];

    daily_collections: {
        day: string;
        total: number;
    }[];

    team_stats: {
        interviewer_name: string | null;
        total: number;
        avg_seconds: number;
        avg_minutes: number;
        per_day: number;
        last_date: string | null;
    }[];
};

// ▶️ Busca o resumo do painel para o quiz selecionado
export async function getDashboardSummary(
    quizId: number
): Promise<DashboardSummary | null> {
    if (!quizId) {
        throw new Error("Quiz ID inválido para dashboard.");
    }

    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(
            `${BASE_API_URL}/dashboard/quiz-summary/${quizId}`, // ✔️ ROTA CORRETA
            {
                method: "GET",
                headers,
                next: { revalidate: 0 }, // sem cache
            }
        );

        if (!res.ok) {
            console.error("Erro ao carregar resumo do dashboard:", res.status);
            return null;
        }

        const json = (await res.json()) as DashboardSummary;
        return json;
    } catch (error) {
        console.error("Erro ao buscar resumo do dashboard:", error);
        return null;
    }
}
