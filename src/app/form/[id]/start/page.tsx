// app/form/[id]/start/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

import {
    startInterview as apiStartInterview,
    createAnswer as apiCreateAnswer,
    checkInterviewExists,
} from "@/utils/actions/interviews";

/* ========================================================================== */
/* ================================ TYPES =================================== */
/* ========================================================================== */

type RuleCondition = {
    id: number;
    condition_question_id: number;
    operator: string;
    option_id?: number | null;
    compare_value?: string | number | null;
    is_number?: number | boolean;
};

type Rule = {
    id: number;
    source_question_id: number;
    target_question_id: number | null;
    type: "skip" | "show" | "refuse";
    logic: "AND" | "OR";
    is_active: number | boolean;
    conditions: RuleCondition[];
};

type QuizFull = {
    quiz: { id: number; title: string };
    questions: Question[];
    rules?: Rule[];
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
    is_hidden?: number | boolean;
    options?: QuestionOption[];
};

/* ========================================================================== */
/* ======================= HELPERS / MÁSCARAS =============================== */
/* ========================================================================== */

const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

const maskPhoneBR = (v: string) => {
    const d = onlyDigits(v).slice(0, 11);

    if (d.length <= 10) {
        return d.replace(
            /^(\d{0,2})(\d{0,4})(\d{0,4}).*/,
            (__, a, b, c) =>
                a && b && c
                    ? `(${a}) ${b}-${c}`
                    : a && b
                        ? `(${a}) ${b}`
                        : a
                            ? `(${a}`
                            : ""
        );
    }

    return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
};

const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

const CLIENT_BASE = "/_b";

/* ========================================================================== */
/* ============================= DEBUG MODE ================================= */
/* ========================================================================== */

const DEBUG = true;
const dlog = (...a: any[]) => DEBUG && console.log("[FORM]", ...a);
const dwarn = (...a: any[]) => DEBUG && console.warn("[FORM]", ...a);

/* ========================================================================== */
/* =========================== COMPONENTE PRINCIPAL ========================= */
/* ========================================================================== */

export default function FormStartPage() {
    const params = useParams<{ id: string }>();
    const quizId = params?.id;
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<QuizFull | null>(null);
    const [errorBox, setErrorBox] = useState<string | null>(null);

    /* fluxo */
    const [idx, setIdx] = useState(0);
    const answersKey = useMemo(
        () => (quizId ? `form_answers_${quizId}` : ""),
        [quizId]
    );
    const interviewKey = useMemo(
        () => (quizId ? `form_interview_${quizId}` : ""),
        [quizId]
    );

    const [answers, setAnswers] = useState<Record<number, any>>({});
    const total = data?.questions?.length ?? 0;
    const isFinal = idx === total;
    const question = !isFinal ? data?.questions?.[idx] ?? null : null;

    const progressPct =
        total > 0
            ? Math.round(((Math.min(idx, total - 1) + 1) / total) * 100)
            : 0;

    /* entrevista */
    const [interviewId, setInterviewId] = useState<number | null>(null);
    const startAtMsRef = useRef<number | null>(null);
    const startedRef = useRef(false);

    /* identificação final */
    const [nameFinal, setNameFinal] = useState("");
    const [phoneFinal, setPhoneFinal] = useState("");
    const [emailFinal, setEmailFinal] = useState("");

    /* ====================================================================== */
    /* ============================== LOAD QUIZ ============================== */
    /* ====================================================================== */

    useEffect(() => {
        let mounted = true;

        async function load() {
            if (!quizId) return;

            setLoading(true);
            setErrorBox(null);

            const url = `${CLIENT_BASE}/api/quiz-public/${quizId}/full`;

            try {
                console.time("[FORM] fetch quiz-full");

                const res = await fetch(url, {
                    cache: "no-store",
                    headers: { "X-Debug": "form-start" },
                });

                console.timeEnd("[FORM] fetch quiz-full");

                if (!res.ok) {
                    const txt = await res.text().catch(() => "");
                    const msg = `Falha ao carregar quiz. HTTP ${res.status} — ${txt}`;
                    if (mounted) setErrorBox(`URL: ${url}\n${msg}`);
                    return;
                }

                const json = (await res.json()) as QuizFull;

                dlog("quiz-full ok:", {
                    questions: json?.questions?.length,
                    rules: json?.rules?.length,
                });

                if (mounted) setData(json);
            } catch (e: any) {
                const msg = `Erro ao carregar quiz: ${e?.message}`;
                if (mounted) setErrorBox(`URL: ${url}\n${msg}`);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [quizId]);

    /* ====================================================================== */
    /* ====================== RESTAURA PROGRESSO LOCAL ====================== */
    /* ====================================================================== */

    useEffect(() => {
        if (!answersKey || !interviewKey) return;

        try {
            const idStr = localStorage.getItem(interviewKey);
            if (idStr) {
                const id = Number(idStr);
                if (Number.isFinite(id) && id > 0) {
                    setInterviewId(id);
                    if (!startAtMsRef.current) startAtMsRef.current = Date.now();
                }
            }

            const raw = localStorage.getItem(answersKey);
            if (raw) {
                const parsed = JSON.parse(raw) as {
                    answers?: Record<number, any>;
                    idx?: number;
                };
                setAnswers(parsed.answers ?? {});
                if (typeof parsed.idx === "number") {
                    setIdx(clamp(parsed.idx, 0, Math.max(0, total)));
                }
            }
        } catch (e) {
            dwarn("restore error:", e);
        }
    }, [answersKey, interviewKey, total]);

    /* ====================================================================== */
    /* ======================== START DA ENTREVISTA ========================= */
    /* ====================================================================== */

    useEffect(() => {
        async function tryStart() {
            if (!data?.quiz?.id) return;

            if (interviewId) return;

            const stored = interviewKey ? localStorage.getItem(interviewKey) : null;
            if (stored) {
                const id = Number(stored);
                if (Number.isFinite(id) && id > 0) {
                    setInterviewId(id);
                    if (!startAtMsRef.current) startAtMsRef.current = Date.now();
                    return;
                }
            }

            if (startedRef.current) return;
            startedRef.current = true;

            try {
                const r = await apiStartInterview({
                    quiz_id: Number(data.quiz.id),
                    source: "desktop",
                });

                const id =
                    Number((r as any)?.interview?.id) ||
                    Number((r as any)?.id) ||
                    Number((r as any)?.data?.id);

                if (id) {
                    setInterviewId(id);
                    localStorage.setItem(interviewKey, String(id));
                    startAtMsRef.current = Date.now();
                }
            } catch (e) {
                dwarn("startInterview error:", e);
            }
        }

        tryStart();
    }, [data?.quiz?.id, interviewId, interviewKey]);

    /* ====================================================================== */
    /* ======================== ensureInterviewId() ========================= */
    /* ====================================================================== */

    async function ensureInterviewId(): Promise<number> {
        if (interviewId) {
            try {
                const exists = await checkInterviewExists(interviewId);
                if (exists) {
                    return interviewId;
                }

                setInterviewId(null);
                if (interviewKey) localStorage.removeItem(interviewKey);
            } catch (e) {
                return interviewId;
            }
        }

        if (!data?.quiz?.id) throw new Error("Quiz inválido");

        const stored = interviewKey ? localStorage.getItem(interviewKey) : null;
        if (stored) {
            const oldId = Number(stored);
            if (Number.isFinite(oldId) && oldId > 0) {
                try {
                    const stillExists = await checkInterviewExists(oldId);
                    if (stillExists) {
                        setInterviewId(oldId);
                        if (!startAtMsRef.current) startAtMsRef.current = Date.now();
                        return oldId;
                    }
                    localStorage.removeItem(interviewKey);
                } catch (e) {
                    setInterviewId(oldId);
                    if (!startAtMsRef.current) startAtMsRef.current = Date.now();
                    return oldId;
                }
            }
        }

        const r = await apiStartInterview({
            quiz_id: Number(data.quiz.id),
            source: "desktop",
        });

        const newId =
            Number((r as any)?.interview?.id) ||
            Number((r as any)?.id) ||
            Number((r as any)?.data?.id);

        if (!newId) throw new Error("Falha ao iniciar entrevista");

        setInterviewId(newId);
        startAtMsRef.current = Date.now();
        if (interviewKey) localStorage.setItem(interviewKey, String(newId));
        return newId;
    }

    /* ====================================================================== */
    /* ============================== SISTEMA DE REGRAS ====================== */
    /* ====================================================================== */

    function evaluateCondition(
        cond: RuleCondition,
        currentAnswers: Record<number, any>
    ): boolean {
        const ans = currentAnswers[cond.condition_question_id];

        switch (cond.operator) {
            case "selected":
                return ans === cond.option_id;

            case "not_selected":
                return ans !== cond.option_id;

            case "eq":
                return String(ans ?? "") === String(cond.compare_value ?? "");

            case "neq":
                return String(ans ?? "") !== String(cond.compare_value ?? "");

            case "gt":
                return Number(ans) > Number(cond.compare_value);

            case "lt":
                return Number(ans) < Number(cond.compare_value);

            default:
                return false;
        }
    }

    function ruleMatches(rule: Rule, currentAnswers: Record<number, any>): boolean {
        if (!rule.conditions || rule.conditions.length === 0) return true;

        if (rule.logic === "AND") {
            return rule.conditions.every((cond) =>
                evaluateCondition(cond, currentAnswers)
            );
        }

        return rule.conditions.some((cond) =>
            evaluateCondition(cond, currentAnswers)
        );
    }

    function applyRules(
        questionId: number,
        _optionId: number,
        currentAnswers: Record<number, any>
    ) {
        if (!data?.rules) return { jumpTo: null, refuse: false };

        let jumpTo: number | null = null;
        let refuse = false;

        for (const rule of data.rules) {
            if (Number(rule.source_question_id) !== Number(questionId)) continue;
            if (!rule.is_active) continue;

            const ok = ruleMatches(rule, currentAnswers);
            if (!ok) continue;

            if (rule.type === "refuse") {
                refuse = true;
            }

            if ((rule.type === "skip" || rule.type === "show") && rule.target_question_id) {
                jumpTo = Number(rule.target_question_id);
            }
        }

        return { jumpTo, refuse };
    }

    /* ====================================================================== */
    /* ======================= SALVA PROGRESSO LOCAL ======================== */
    /* ====================================================================== */

    function saveLocal(updatedIdx: number, updatedAnswers: Record<number, any>) {
        if (!answersKey) return;
        try {
            localStorage.setItem(
                answersKey,
                JSON.stringify({
                    idx: updatedIdx,
                    answers: updatedAnswers,
                })
            );
        } catch (e) {
            console.warn("local save error:", e);
        }
    }

    /* ====================================================================== */
    /* ======================= SELEÇÃO SINGLE CHOICE ======================== */
    /* ====================================================================== */

    const handleSelectSingle = async (q: Question, optionId: number) => {
        const updatedAnswers = { ...answers, [q.id]: optionId };
        setAnswers(updatedAnswers);
        saveLocal(idx, updatedAnswers);

        try {
            const id = await ensureInterviewId();
            await apiCreateAnswer(id, {
                question_id: q.id,
                option_id: optionId,
                time_spent_ms: 0,
            });
        } catch (e) { }

        const { jumpTo, refuse } = applyRules(q.id, optionId, updatedAnswers);

        if (refuse) {
            await Swal.fire({
                icon: "warning",
                title: "Entrevista encerrada",
                text: "A coleta foi finalizada conforme as regras.",
                confirmButtonText: "OK",
            });

            if (answersKey) localStorage.removeItem(answersKey);
            if (interviewKey) localStorage.removeItem(interviewKey);

            router.push(`/form/${quizId}`);
            return;
        }

        if (jumpTo != null) {
            const idxTarget = data?.questions.findIndex(
                (qq) => Number(qq.id) === Number(jumpTo)
            ) ?? -1; // garante número

            if (idxTarget >= 0) {
                setTimeout(() => {
                    setIdx(idxTarget as number);
                    saveLocal(idxTarget as number, updatedAnswers);
                }, 120);
                return;
            }
        }

        setTimeout(() => {
            if (idx === total - 1) {
                setIdx(total);
                saveLocal(total, updatedAnswers);
            } else {
                goNext();
            }
        }, 120);
    };

    /* ====================================================================== */
    /* ====================== SELEÇÃO MULTIPLE CHOICE ======================= */
    /* ====================================================================== */

    const handleSelectMultiple = async (q: Question, opId: number) => {
        const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        let next: number[] = [];

        if (prev.includes(opId)) {
            next = prev.filter((v: number) => v !== opId);
        } else {
            next = [...prev, opId];
        }

        const updated = { ...answers, [q.id]: next };
        setAnswers(updated);
        saveLocal(idx, updated);

        try {
            const id = await ensureInterviewId();
            await apiCreateAnswer(id, {
                question_id: q.id,
                option_id: next as unknown as number, // garante para TS
                time_spent_ms: 0,
            });

        } catch (e) { }
    };

    /* ====================================================================== */
    /* ======================== CONTROLES DE FLUXO ========================== */
    /* ====================================================================== */

    function goPrev() {
        const newIdx = Math.max(0, idx - 1);
        setIdx(newIdx);
        saveLocal(newIdx, answers);
    }

    function goNext() {
        const newIdx = Math.min(total, idx + 1);
        setIdx(newIdx);
        saveLocal(newIdx, answers);
    }
    /* ====================================================================== */
    /* ============================== FINALIZAÇÃO ============================ */
    /* ====================================================================== */

    const [submitting, setSubmitting] = useState(false);

    async function handleFinalize() {
        if (!emailFinal || !emailFinal.includes("@")) {
            Swal.fire({
                icon: "warning",
                title: "E-mail obrigatório",
                text: "Informe um e-mail válido para prosseguir.",
            });
            return;
        }

        try {
            setSubmitting(true);

            const id = await ensureInterviewId();

            const endAt = Date.now();
            const startedAt = startAtMsRef.current ?? endAt;
            const diffMs = Math.max(0, endAt - startedAt);

            const payload = {
                respondent_name: nameFinal || null,
                respondent_phone: phoneFinal || null,
                respondent_email: emailFinal,
                duration_ms: diffMs,
            };

            console.time("[FORM] finalize interview");
            const url = `${CLIENT_BASE}/api/interviews/${id}/finalize`;
            const res = await fetch(url, {
                method: "POST",
                cache: "no-store",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
            console.timeEnd("[FORM] finalize interview");

            if (!res.ok) {
                const tx = await res.text().catch(() => "");
                Swal.fire({
                    icon: "error",
                    title: "Falha ao finalizar",
                    html: `HTTP ${res.status}<br>${tx}`,
                });
                setSubmitting(false);
                return;
            }

            /** limpa local */
            if (interviewKey) localStorage.removeItem(interviewKey);
            if (answersKey) localStorage.removeItem(answersKey);

            await Swal.fire({
                icon: "success",
                title: "Obrigado!",
                text: "Sua resposta foi registrada com sucesso.",
            });

            router.push(`/form/${quizId}`);
        } catch (e: any) {
            Swal.fire({
                icon: "error",
                title: "Erro",
                text: e?.message || "Erro ao finalizar.",
            });
        } finally {
            setSubmitting(false);
        }
    }

    /* ====================================================================== */
    /* ====================== RENDERIZAÇÃO PRINCIPAL ======================== */
    /* ====================================================================== */

    return (
        <main className="min-h-screen bg-white">
            {/* TOPO */}
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

            {/* CONTEÚDO */}
            <section className="mx-auto max-w-5xl px-6 py-8">

                {/* ERRO DEBUG */}
                {errorBox && (
                    <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                        <p className="font-semibold mb-1">
                            DEBUG (FORM): Não foi possível carregar o formulário.
                        </p>

                        <pre className="whitespace-pre-wrap text-xs">
                            {`CLIENT_BASE: ${CLIENT_BASE}
TARGET_API: ${process.env.NEXT_PUBLIC_API_URL || "<vazio>"}
${errorBox}
`}
                        </pre>

                        <p className="text-xs mt-2">
                            Verifique <code>NEXT_PUBLIC_API_URL</code> e o rewrite de
                            <code> /_b </code> no <code>next.config.mjs</code>.
                        </p>
                    </div>
                )}

                {loading && (
                    <p className="text-gray-600 text-lg">
                        Carregando formulário…
                    </p>
                )}

                {!loading && !data && !errorBox && (
                    <p className="text-red-600 text-sm">Falha ao carregar dados.</p>
                )}

                {/* ============================================================= */}
                {/* ================== PERGUNTAS SEQUENCIAIS ==================== */}
                {/* ============================================================= */}

                {!loading && data && question && !isFinal && (
                    <div className="space-y-6">

                        <p className="text-sm text-gray-500">
                            {idx + 1} de {total}
                        </p>

                        <h2 className="text-3xl font-semibold text-gray-900">
                            {question.title}
                        </h2>

                        {/* SINGLE CHOICE */}
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
                                                onChange={() =>
                                                    handleSelectSingle(question, op.id)
                                                }
                                            />
                                            <span className="text-gray-800">{op.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* MULTIPLE CHOICE */}
                        {question.type === "multiple_choice" && (
                            <div className="space-y-3">
                                {(question.options ?? []).map((op) => {
                                    const arr: number[] =
                                        Array.isArray(answers[question.id])
                                            ? answers[question.id]
                                            : [];
                                    const checked = arr.includes(op.id);

                                    return (
                                        <label
                                            key={op.id}
                                            className="flex items-center gap-3 rounded-xl border px-4 py-4 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={checked}
                                                onChange={() =>
                                                    handleSelectMultiple(question, op.id)
                                                }
                                            />
                                            <span className="text-gray-800">{op.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* OPEN TEXT */}
                        {question.type === "open_text" && (
                            <textarea
                                className="w-full rounded-lg border p-3"
                                rows={5}
                                placeholder="Digite sua resposta"
                                value={answers[question.id] ?? ""}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    const updated = { ...answers, [question.id]: v };
                                    setAnswers(updated);
                                    saveLocal(idx, updated);
                                }}
                            />
                        )}

                        {/* BOTÕES NAVEGAÇÃO */}
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

                            <button
                                type="button"
                                disabled
                                className="rounded-md bg-gray-300 px-5 py-2 text-gray-700 cursor-not-allowed"
                            >
                                Avançar
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================================= */}
                {/* ======================= ETAPA FINAL ========================= */}
                {/* ============================================================= */}

                {!loading && data && isFinal && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                            Etapa final
                        </p>

                        <h2 className="text-3xl font-semibold text-gray-900">
                            Identificação
                        </h2>

                        <p className="text-gray-700">
                            Informe seus dados para concluir.
                        </p>
                        {/* CAMPOS DE IDENTIFICAÇÃO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Nome */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-700">
                                    Nome completo
                                </label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    placeholder="Seu nome"
                                    value={nameFinal}
                                    onChange={(e) => setNameFinal(e.target.value)}
                                />
                            </div>

                            {/* Telefone */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-700">
                                    Telefone (WhatsApp)
                                </label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    placeholder="(00) 00000-0000"
                                    value={phoneFinal}
                                    onChange={(e) =>
                                        setPhoneFinal(maskPhoneBR(e.target.value))
                                    }
                                />
                            </div>

                            {/* Email */}
                            <div className="md:col-span-2 flex flex-col gap-2">
                                <label className="text-sm text-gray-700">
                                    E-mail <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="rounded-md border px-3 py-2"
                                    placeholder="email@exemplo.com"
                                    value={emailFinal}
                                    onChange={(e) =>
                                        setEmailFinal(e.target.value.trim())
                                    }
                                />
                            </div>
                        </div>

                        {/* BOTÕES */}
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
                                disabled={submitting}
                                className={`rounded-md px-6 py-2 font-semibold text-white transition ${submitting
                                    ? "bg-gray-300 cursor-not-allowed"
                                    : "bg-[#e74e15] hover:opacity-90"
                                    }`}
                            >
                                {submitting ? "Enviando..." : "Finalizar"}
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </main>
    );
}


