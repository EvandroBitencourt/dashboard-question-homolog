import Link from "next/link";

type PageProps = {
    params: Promise<{ id: string }>; // Next 15
};

type QuizFullResponse = {
    quiz: { id: number; title: string; end_date?: string | null };
    questions: any[];
};

function formatDatePt(iso?: string | null) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (!Number.isFinite(d.getTime())) {
            const [y, m, day] = iso.split("-").map(Number);
            const safe = new Date(y, (m ?? 1) - 1, day ?? 1);
            return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(safe);
        }
        return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(d);
    } catch {
        return "";
    }
}

export default async function FormCoverPage({ params }: PageProps) {
    const { id } = await params;

    // Normaliza a base (remove barras no final)
    const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
    const API_OK = Boolean(API_BASE);
    let title = `Formulário #${id}`;
    let endDate: string | null = null;

    const DEBUG = true;
    if (DEBUG) console.log("[COVER] render", { id, API_BASE, API_OK });

    let fetchError: { url: string; status?: number; text?: string; message?: string } | null = null;

    if (!API_OK) {
        fetchError = { url: "<sem URL>", message: "Env NEXT_PUBLIC_API_URL não definida no front." };
    } else {
        const url = `${API_BASE}/api/quiz-public/${id}/full`;
        try {
            DEBUG && console.time("[COVER] fetch quiz-full");
            const res = await fetch(url, { cache: "no-store", headers: { "X-Debug": "cover" } });
            DEBUG && console.timeEnd("[COVER] fetch quiz-full");
            DEBUG && console.log("[COVER] GET", url, "status:", res.status);

            if (res.ok) {
                const json = (await res.json()) as QuizFullResponse;
                title = json?.quiz?.title ?? title;
                endDate = json?.quiz?.end_date ?? null;
                DEBUG && console.log("[COVER] quiz-full:", { title, endDate, qlen: json?.questions?.length });
            } else {
                const txt = await res.text().catch(() => "");
                fetchError = { url, status: res.status, text: txt || "(sem corpo)" };
            }
        } catch (e: any) {
            fetchError = { url, message: e?.message || String(e) };
            DEBUG && console.error("[COVER] fetch error:", e);
        }
    }

    return (
        <main className="min-h-screen bg-white">
            <div className="w-full bg-[#e74e15] text-white">
                <div className="mx-auto max-w-5xl px-6 py-4">
                    <h1 className="text-xl font-semibold">Formulário</h1>
                </div>
            </div>

            <section className="mx-auto max-w-5xl px-6 py-10">
                {!!fetchError && (
                    <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                        <p className="font-semibold mb-1">DEBUG (CAPA): falha ao carregar quiz</p>
                        <pre className="whitespace-pre-wrap text-xs">
                            {`API_BASE: ${API_BASE || "<vazio>"}
URL: ${fetchError.url}
Status: ${fetchError.status ?? "-"}
Erro: ${fetchError.text ?? fetchError.message ?? "-"}
`}
                        </pre>
                    </div>
                )}

                <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
                {endDate && <p className="mt-2 text-gray-600">Finaliza em: {formatDatePt(endDate)}</p>}

                <div className="mt-8">
                    <Link
                        href={`/form/${id}/start`}
                        className="inline-block rounded-md bg-[#e74e15] px-6 py-3 text-white font-semibold hover:opacity-90 transition"
                    >
                        Começar
                    </Link>
                </div>

                <p className="mt-6 text-sm text-gray-500">Este link é público e não requer login.</p>
            </section>
        </main>
    );
}
