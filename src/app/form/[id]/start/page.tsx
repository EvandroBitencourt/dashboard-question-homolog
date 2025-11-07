// app/form/[id]/start/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

/** --- Tipagens básicas do payload público --- */
type QuizFull = {
    quiz: { id: number; title: string };
    questions: Array<Question>;
};

type QuestionOption = {
    id: number;
    label: string;
    value?: string | number | null;
};

type Question = {
    id: number;
    title: string;
    type: "single_choice" | "multiple_choice" | "open_text" | string;
    required?: boolean;
    options?: QuestionOption[];
};

/** --- Helpers --- */
function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

export default function FormStartPage() {
    const params = useParams<{ id: string }>();
    const quizId = params?.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<QuizFull | null>(null);

    // índice da "etapa": 0..(total-1) = perguntas, total = tela final (identificação)
    const [idx, setIdx] = useState(0);

    // respostas em memória (e localStorage)
    const storageKey = useMemo(
        () => (quizId ? `form_answers_${quizId}` : ""),
        [quizId]
    );
    const [answers, setAnswers] = useState<Record<number, any>>({}); // { [questionId]: optionId | value }

    const totalQuestions = data?.questions?.length ?? 0;
    const isFinalStep = idx === totalQuestions; // tela de identificação
    const question = useMemo(
        () => (isFinalStep ? null : data?.questions?.[idx]),
        [data, idx, isFinalStep]
    );
    const progressPct =
        totalQuestions > 0
            ? Math.round(((Math.min(idx, totalQuestions - 1) + 1) / totalQuestions) * 100)
            : 0;

    /** Controle de entrevista */
    const [interviewId, setInterviewId] = useState<number | null>(null);
    const startAtMsRef = useRef<number | null>(null);

    /** Campos da tela final (identificação) */
    const [nameFinal, setNameFinal] = useState("");
    const [phoneFinal, setPhoneFinal] = useState("");
    const [emailFinal, setEmailFinal] = useState("");

    /** Carrega formulário */
    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            try {
                const API = process.env.NEXT_PUBLIC_API_URL!;
                const res = await fetch(`${API}/api/quiz-public/${quizId}/full`, {
                    cache: "no-store",
                });
                if (res.ok) {
                    const json = (await res.json()) as QuizFull;
                    if (mounted) setData(json);
                }
            } catch {
                // mantém silencioso por enquanto
            } finally {
                if (mounted) setLoading(false);
            }
        }

        if (quizId) load();
        return () => {
            mounted = false;
        };
    }, [quizId]);

    /** Inicia a entrevista assim que o formulário (quiz) carregar */
    useEffect(() => {
        async function startInterview() {
            if (!data?.quiz?.id || interviewId) return;
            try {
                const API = process.env.NEXT_PUBLIC_API_URL!;
                const res = await fetch(`${API}/api/interviews/start`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        quiz_id: Number(data.quiz.id),
                        source: "desktop",
                    }),
                });
                if (res.ok) {
                    const json = await res.json();
                    const id = Number(json?.interview?.id);
                    if (id) {
                        setInterviewId(id);
                        startAtMsRef.current = Date.now();
                    }
                }
            } catch {
                /* ignore */
            }
        }
        startInterview();
    }, [data, interviewId]);

    /** Restaura respostas locais (caso tenha) */
    useEffect(() => {
        if (!storageKey) return;
        try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
                const parsed = JSON.parse(raw) as {
                    answers?: Record<number, any>;
                    idx?: number;
                };
                setAnswers(parsed.answers ?? {});
                if (typeof parsed.idx === "number") {
                    // evita restaurar para além da última pergunta; a tela final é recalculada
                    const safeIdx = clamp(parsed.idx, 0, Math.max(0, totalQuestions));
                    setIdx(safeIdx);
                }
            }
        } catch {
            /* ignore */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageKey, totalQuestions]);

    /** Persiste no localStorage sempre que respostas/idx mudarem */
    useEffect(() => {
        if (!storageKey) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify({ answers, idx }));
        } catch {
            /* ignore */
        }
    }, [answers, idx, storageKey]);

    /** Ações de navegação */
    const goPrev = () =>
        setIdx((i) => clamp(i - 1, 0, Math.max(0, totalQuestions)));
    const goNext = () =>
        setIdx((i) => clamp(i + 1, 0, Math.max(0, totalQuestions)));

    /** Selecionar alternativa (auto-avança p/ single_choice) */
    const handleSelectSingle = async (q: Question, optionId: number) => {
        setAnswers((prev) => ({ ...prev, [q.id]: optionId }));

        // dispara persistência da resposta
        if (interviewId) {
            try {
                const API = process.env.NEXT_PUBLIC_API_URL!;
                await fetch(`${API}/api/interviews/${interviewId}/answers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        question_id: q.id,
                        option_id: optionId,
                        time_spent_ms: 0,
                    }),
                });
            } catch {
                /* mantém offline */
            }
        }

        // pequeno delay para feedback visual do radio antes de avançar
        setTimeout(() => {
            // se era a última pergunta, vamos para a tela final (identificação)
            if (idx === totalQuestions - 1) {
                setIdx(totalQuestions); // tela final
                return;
            }
            goNext();
        }, 120);
    };

    /** Finalizar (enviar identificação + duration) */
    const [submitting, setSubmitting] = useState(false);
    const handleFinalize = async () => {
        if (!interviewId) return; // botão ficará desabilitado nesse caso
        setSubmitting(true);
        try {
            const API = process.env.NEXT_PUBLIC_API_URL!;
            const duration_ms =
                startAtMsRef.current != null
                    ? Math.max(0, Date.now() - startAtMsRef.current)
                    : undefined;

            const res = await fetch(`${API}/api/interviews/${interviewId}/finalize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    duration_ms,
                    respondent_name: nameFinal?.trim() || null,
                    respondent_phone: phoneFinal?.trim() || null,
                    respondent_email: emailFinal?.trim() || null,
                }),
            });

            if (res.ok) {
                // ✅ mensagem de sucesso (apenas botão OK)
                await Swal.fire({
                    title: "Pesquisa realizada com sucesso",
                    text: "Obrigado",
                    icon: "success",
                    confirmButtonText: "OK",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                });

                // limpar progresso local e voltar pra capa do formulário
                if (storageKey) localStorage.removeItem(storageKey);
                router.push(`/form/${quizId}`);
            } else {
                const err = await res.json().catch(() => ({}));
                await Swal.fire({
                    title: "Erro ao finalizar",
                    text:
                        err?.message ||
                        "Não foi possível concluir sua resposta. Tente novamente.",
                    icon: "error",
                    confirmButtonText: "OK",
                });
            }
        } catch (e) {
            await Swal.fire({
                title: "Erro de rede",
                text: "Falha de conexão. Tente novamente.",
                icon: "error",
                confirmButtonText: "OK",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-white">
            {/* Barra superior do "player" */}
            <div className="w-full bg-[#e74e15] text-white">
                <div className="mx-auto max-w-5xl px-6 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <span className="font-semibold">Formulário</span>
                        <div className="h-2 w-44 rounded bg-white/30 overflow-hidden">
                            <div
                                className="h-full bg-white transition-all"
                                style={{ width: `${progressPct}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <section className="mx-auto max-w-5xl px-6 py-8">
                {loading && <p className="text-gray-600">Carregando…</p>}

                {!loading && !data && (
                    <p className="text-red-600">Não foi possível carregar o formulário.</p>
                )}

                {/* Perguntas */}
                {!loading && data && question && !isFinalStep && (
                    <div className="space-y-6">
                        {/* contador */}
                        <p className="text-sm text-gray-500">
                            {idx + 1} de {totalQuestions}
                        </p>

                        {/* enunciado */}
                        <h2 className="text-3xl font-semibold text-gray-900">
                            {question.title}
                        </h2>

                        {/* tipos (neste passo: single_choice com auto-avanço) */}
                        {question.type === "single_choice" && (
                            <div className="space-y-3">
                                {(question.options ?? []).map((op) => {
                                    const checked = answers[question.id] === op.id;
                                    return (
                                        <label
                                            key={op.id}
                                            className="flex items-center gap-3 rounded-xl border px-4 py-4 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                name={`q-${question.id}`}
                                                type="radio"
                                                className="h-4 w-4"
                                                checked={checked}
                                                onChange={() => handleSelectSingle(question, op.id)}
                                            />
                                            <span className="text-gray-800">{op.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* rodapé de navegação */}
                        <div className="pt-4 flex items-center gap-10">
                            <button
                                type="button"
                                onClick={goPrev}
                                disabled={idx === 0}
                                className={`rounded-md px-5 py-2 font-medium transition ${idx === 0
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-800"
                                    }`}
                            >
                                Voltar
                            </button>

                            {/* Avançar manual (mantido desabilitado porque o auto-avanço cuida) */}
                            <button
                                type="button"
                                disabled
                                className="rounded-md bg-gray-300 px-5 py-2 text-gray-700 cursor-not-allowed"
                                title="Ao selecionar uma opção, avançamos automaticamente"
                            >
                                Avançar
                            </button>

                            {/* Última pergunta → instrução */}
                            {idx === totalQuestions - 1 && (
                                <span className="text-sm text-gray-500">
                                    Ao escolher uma opção, você irá para a etapa final.
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Etapa final: Identificação */}
                {!loading && data && isFinalStep && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">Etapa final</p>
                        <h2 className="text-3xl font-semibold text-gray-900">
                            Identificação
                        </h2>
                        <p className="text-gray-600">
                            Informe seus dados para concluir o envio.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-700">Nome completo</label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    value={nameFinal}
                                    onChange={(e) => setNameFinal(e.target.value)}
                                    placeholder="Seu nome"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-700">
                                    Telefone (WhatsApp)
                                </label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    value={phoneFinal}
                                    onChange={(e) => setPhoneFinal(e.target.value)}
                                    placeholder="(DDD) 9...."
                                />
                            </div>

                            <div className="md:col-span-2 flex flex-col gap-2">
                                <label className="text-sm text-gray-700">
                                    E-mail <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    value={emailFinal}
                                    onChange={(e) => setEmailFinal(e.target.value)}
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                        </div>

                        {/* rodapé final */}
                        <div className="pt-4 flex items-center gap-10">
                            <button
                                type="button"
                                onClick={goPrev}
                                className="rounded-md px-5 py-2 font-medium bg-gray-100 hover:bg-gray-200 text-gray-800"
                            >
                                Voltar
                            </button>

                            <button
                                type="button"
                                onClick={handleFinalize}
                                disabled={!interviewId || submitting}
                                className={`rounded-md px-6 py-2 font-semibold text-white transition ${!interviewId || submitting
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-[#e74e15] hover:opacity-90"
                                    }`}
                                title={
                                    !interviewId
                                        ? "Entrevista ainda não foi iniciada."
                                        : "Finalizar envio"
                                }
                            >
                                {submitting ? "Enviando..." : "Finalizar"}
                            </button>
                        </div>

                        {!interviewId && (
                            <p className="text-sm text-red-600">
                                Entrevista ainda não foi iniciada. Tente novamente.
                            </p>
                        )}
                    </div>
                )}
            </section>
        </main>
    );
}
