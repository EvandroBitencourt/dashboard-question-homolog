const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

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

type ExportPayload = {
    date_field?: "finished_at" | "created_at" | "started_at";
    date_start?: string | null;
    date_end?: string | null;
    export_as?: "value" | "variable";
};

export async function exportQuestionnaire(quizId: number, payload: ExportPayload) {
    if (!quizId) {
        throw new Error("Questionário inválido.");
    }

    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/export/questionnaire/${quizId}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.messages?.error || error?.message || "Erro ao exportar dados.");
    }

    const blob = await res.blob();

    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] || `export_quiz_${quizId}.xlsx`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}