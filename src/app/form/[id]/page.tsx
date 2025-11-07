import Link from "next/link";

type PageProps = {
    params: Promise<{ id: string }>; // compatível com Next 15
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

    // busca pública do quiz completo apenas para pegar título / data
    const API = process.env.NEXT_PUBLIC_API_URL!;
    let title = `Formulário #${id}`;
    let endDate: string | null = null;

    try {
        const res = await fetch(`${API}/api/quiz-public/${id}/full`, {
            cache: "no-store",
        });
        if (res.ok) {
            const json = (await res.json()) as QuizFullResponse;
            title = json?.quiz?.title ?? title;
            endDate = json?.quiz?.end_date ?? null;
        }
    } catch {
        // segue com fallback
    }

    return (
        <main className="min-h-screen bg-white">
            {/* faixa superior enxuta (não é o Header do dashboard) */}
            <div className="w-full bg-[#e74e15] text-white">
                <div className="mx-auto max-w-5xl px-6 py-4">
                    <h1 className="text-xl font-semibold">Formulário</h1>
                </div>
            </div>

            <section className="mx-auto max-w-5xl px-6 py-10">
                <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
                {endDate && (
                    <p className="mt-2 text-gray-600">Finaliza em: {formatDatePt(endDate)}</p>
                )}

                <div className="mt-8">
                    <Link
                        href={`/form/${id}/start`}
                        className="inline-block rounded-md bg-[#e74e15] px-6 py-3 text-white font-semibold hover:opacity-90 transition"
                    >
                        Começar
                    </Link>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                    Este link é público e não requer login.
                </p>
            </section>
        </main>
    );
}
