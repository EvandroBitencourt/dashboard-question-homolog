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
    quiz: {
        id: number;
        title: string;
        end_date?: string | null;
        status?: "active" | "test" | "disabled" | string | null;
    };
    questions: Question[];
    rules?: Rule[];
};

type QuestionOption = {
    is_open: string | number;
    id: number;
    label: string;
    value?: string | number | null;
};

type Question = {
    id: number;
    title: string;
    type:
    | "single_choice"
    | "multiple_choice"
    | "open"
    | "open_text"
    | string;
    required?: boolean;
    is_hidden?: number | boolean;
    options?: QuestionOption[];
};

type Quota = {
    id: number;
    quiz_id: number;
    question_id: number;
    question_option_id: number;
    limit: number;
    current_count: number;
    parent_quota_id?: number | null;
};

/* ========================================================================== */
/* ======================= HELPERS / MÁSCARAS =============================== */
/* ========================================================================== */

const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));

const CLIENT_BASE = "/_b";

function isQuizExpired(endDate?: string | null) {
    if (!endDate) return false;

    const [year, month, day] = String(endDate).split("T")[0].split("-").map(Number);

    const end = new Date(year, month - 1, day);
    end.setHours(23, 59, 59, 999);

    return new Date() > end;
}

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
    // Texto digitado quando a opção for aberta
    const [openText, setOpenText] = useState<string>("");
    const [quotas, setQuotas] = useState<Quota[]>([]);

    const total = data?.questions?.length ?? 0;
    const isFinal = idx === total;
    const question = !isFinal ? data?.questions?.[idx] ?? null : null;
    const quizExpired = isQuizExpired(data?.quiz?.end_date);

    const quizDisabled =
        data?.quiz?.status === "disabled";

    const progressPct =
        total > 0
            ? Math.round(((Math.min(idx, total - 1) + 1) / total) * 100)
            : 0;

    /* entrevista */
    const [interviewId, setInterviewId] = useState<number | null>(null);
    const startAtMsRef = useRef<number | null>(null);
    const startedRef = useRef(false);

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
    /* ============================= LOAD QUOTAS ============================= */
    /* ====================================================================== */

    useEffect(() => {
        async function loadQuotas() {
            if (!quizId) return;

            try {
                const res = await fetch(`${CLIENT_BASE}/api/quota-public/quiz/${quizId}`, {
                    cache: "no-store",
                });

                if (!res.ok) return;

                const json = await res.json();

                if (Array.isArray(json)) {
                    setQuotas(json);
                }
            } catch (e) {
                console.error("Erro ao carregar quotas:", e);
            }
        }

        loadQuotas();
    }, [quizId]);

    async function refreshQuotas() {
        if (!quizId) return;

        try {
            const res = await fetch(`${CLIENT_BASE}/api/quota-public/quiz/${quizId}`, {
                cache: "no-store",
            });

            if (!res.ok) return;

            const json = await res.json();

            if (Array.isArray(json)) {
                setQuotas(json);
            }
        } catch (e) {
            console.error("Erro ao atualizar quotas:", e);
        }
    }

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

            // Não inicia entrevista se o formulário estiver vencido ou desabilitado
            if (isQuizExpired(data.quiz.end_date) || data.quiz.status === "disabled") return;

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

        if (isQuizExpired(data.quiz.end_date)) {
            throw new Error("Formulário encerrado.");
        }

        if (data.quiz.status === "disabled") {
            throw new Error("Formulário desabilitado.");
        }

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
    /* ============================ HELPERS QUOTAS =========================== */
    /* ====================================================================== */

    function getQuota(questionId: number, optionId: number) {
        return quotas.find(
            (q) =>
                Number(q.question_id) === Number(questionId) &&
                Number(q.question_option_id) === Number(optionId)
        );
    }

    function isQuotaFull(questionId: number, optionId: number) {
        const quota = getQuota(questionId, optionId);

        if (!quota) return false;

        return (
            Number(quota.limit) > 0 &&
            Number(quota.current_count) >= Number(quota.limit)
        );
    }

    function renderQuotaBadge(questionId: number, optionId: number) {
        const quota = getQuota(questionId, optionId);

        if (!quota) return null;

        const full =
            Number(quota.limit) > 0 &&
            Number(quota.current_count) >= Number(quota.limit);

        return (
            <span
                className={`text-xs font-medium px-2 py-1 rounded-full ${full
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                    }`}
            >
                {quota.current_count}/{quota.limit}
            </span>
        );
    }

    function getErrorStatus(e: any) {
        return (
            e?.response?.status ||
            e?.status ||
            e?.statusCode ||
            e?.data?.status ||
            null
        );
    }

    async function handleQuotaError(e: any) {
        const status = getErrorStatus(e);
        const message = String(e?.message || "");

        if (status === 409 || message.includes("409") || message.toLowerCase().includes("cota")) {
            await refreshQuotas();

            Swal.fire({
                icon: "warning",
                title: "Cota atingida",
                text: "Essa opção não possui mais vagas disponíveis.",
            });

            return true;
        }

        return false;
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
        if (isQuotaFull(q.id, optionId)) {
            Swal.fire({
                icon: "warning",
                title: "Cota atingida",
                text: "Essa opção não possui mais vagas disponíveis.",
            });
            return;
        }

        const previousAnswers = { ...answers };
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

            await refreshQuotas();
        } catch (e: any) {
            const handled = await handleQuotaError(e);

            setAnswers(previousAnswers);
            saveLocal(idx, previousAnswers);

            if (handled) return;

            console.error(e);
            return;
        }

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
            ) ?? -1;

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
        if (isQuotaFull(q.id, opId)) {
            Swal.fire({
                icon: "warning",
                title: "Cota atingida",
                text: "Essa opção não possui mais vagas disponíveis.",
            });
            return;
        }

        const prev = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        let next: number[] = [];

        if (prev.includes(opId)) {
            next = prev.filter((v: number) => v !== opId);
        } else {
            next = [...prev, opId];
        }

        const previousAnswers = { ...answers };
        const updated = { ...answers, [q.id]: next };

        setAnswers(updated);
        saveLocal(idx, updated);

        try {
            const id = await ensureInterviewId();
            await apiCreateAnswer(id, {
                question_id: q.id,
                option_id: next as unknown as number,
                time_spent_ms: 0,
            });

            await refreshQuotas();
        } catch (e: any) {
            const handled = await handleQuotaError(e);

            setAnswers(previousAnswers);
            saveLocal(idx, previousAnswers);

            if (handled) return;

            console.error(e);
        }
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
        try {
            setSubmitting(true);

            const id = await ensureInterviewId();

            const endAt = Date.now();
            const startedAt = startAtMsRef.current ?? endAt;
            const diffMs = Math.max(0, endAt - startedAt);

            const payload = {
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

                {/* FORMULÁRIO EXPIRADO */}

                {!loading && data && quizExpired && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        <h2 className="text-2xl font-bold mb-2">
                            Formulário encerrado
                        </h2>

                        <p>
                            O prazo para responder este questionário já expirou.
                        </p>
                    </div>
                )}

                {/* FORMULÁRIO DESABILITADO */}

                {!loading && data && !quizExpired && quizDisabled && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
                        <h2 className="text-2xl font-bold mb-2">
                            Formulário desabilitado
                        </h2>

                        <p>
                            Este questionário não está disponível para respostas.
                        </p>
                    </div>
                )}

                {/* ============================================================= */}
                {/* ================== PERGUNTAS SEQUENCIAIS ==================== */}
                {/* ============================================================= */}

                {!loading && data && !quizExpired && !quizDisabled && question && !isFinal && (
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
                                    const isOpenOption =
                                        op.label?.toLowerCase().includes("aberta") ||
                                        op.label?.toLowerCase().includes("anotar") ||
                                        op.is_open === "1" ||
                                        op.is_open === 1;

                                    const checked = answers[question.id] === op.id;
                                    const quotaFull = isQuotaFull(question.id, op.id);

                                    return (
                                        <div
                                            key={op.id}
                                            className={`rounded-xl border px-4 py-4 ${quotaFull
                                                ? "opacity-50 bg-gray-100 cursor-not-allowed"
                                                : ""
                                                }`}
                                        >
                                            <label
                                                className={`flex items-center gap-3 ${quotaFull ? "cursor-not-allowed" : "cursor-pointer"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${question.id}`}
                                                    className="h-4 w-4"
                                                    checked={checked}
                                                    disabled={quotaFull}
                                                    onChange={() => {
                                                        if (quotaFull) return;

                                                        setAnswers((prev) => ({
                                                            ...prev,
                                                            [question.id]: op.id,
                                                        }));

                                                        setOpenText("");
                                                        saveLocal(idx, {
                                                            ...answers,
                                                            [question.id]: op.id,
                                                        });

                                                        // if (!isOpenOption) {
                                                        //     handleSelectSingle(question, op.id);
                                                        // }
                                                    }}
                                                />

                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-800">{op.label}</span>
                                                    {renderQuotaBadge(question.id, op.id)}
                                                </div>
                                            </label>

                                            {/* SE FOR OPÇÃO ABERTA E TÁ SELECIONADA, MOSTRA O INPUT */}
                                            {isOpenOption && checked && (
                                                <input
                                                    type="text"
                                                    className="mt-3 w-full rounded-md border px-3 py-2"
                                                    placeholder="Digite sua resposta"
                                                    value={openText}
                                                    onChange={(e) => {
                                                        setOpenText(e.target.value);
                                                    }}
                                                />
                                            )}
                                        </div>
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
                                    const quotaFull = isQuotaFull(question.id, op.id);

                                    return (
                                        <label
                                            key={op.id}
                                            className={`flex items-center gap-3 rounded-xl border px-4 py-4 hover:bg-gray-50 ${quotaFull
                                                ? "opacity-50 bg-gray-100 cursor-not-allowed"
                                                : "cursor-pointer"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4"
                                                checked={checked}
                                                disabled={quotaFull}
                                                onChange={() =>
                                                    handleSelectMultiple(question, op.id)
                                                }
                                            />

                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-800">{op.label}</span>
                                                {renderQuotaBadge(question.id, op.id)}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {/* OPEN TEXT */}
                        {(question.type === "open" || question.type === "open_text") && (
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

                            {/* <button
                                type="button"
                                className={`rounded-md px-5 py-2 font-medium transition ${(() => {
                                    const selected = answers[question.id];
                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) {
                                        return "bg-gray-300 text-gray-500 cursor-not-allowed";
                                    }

                                    if (isOpenOption) {
                                        return openText.trim().length === 0
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-[#e74e15] text-white hover:opacity-90";
                                    }

                                    return selected
                                        ? "bg-[#e74e15] text-white hover:opacity-90"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed";
                                })()}`}
                                disabled={(() => {
                                    const selected = answers[question.id];
                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) return true;
                                    if (isOpenOption) return openText.trim().length === 0;
                                    return !selected;
                                })()}
                                onClick={async () => {
                                    const selected = answers[question.id];
                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) {
                                        Swal.fire({
                                            icon: "warning",
                                            title: "Cota atingida",
                                            text: "Essa opção não possui mais vagas disponíveis.",
                                        });
                                        return;
                                    }

                                    try {
                                        const id = await ensureInterviewId();

                                        if (isOpenOption) {
                                            await apiCreateAnswer(id, {
                                                question_id: question.id,
                                                option_id: selected,
                                                value_text: openText,
                                                time_spent_ms: 0,
                                            });
                                        } else {
                                            await apiCreateAnswer(id, {
                                                question_id: question.id,
                                                option_id: selected,
                                                time_spent_ms: 0,
                                            });
                                        }

                                        await refreshQuotas();
                                        goNext();
                                    } catch (e: any) {
                                        const handled = await handleQuotaError(e);

                                        if (handled) return;

                                        console.error("Erro ao salvar resposta:", e);
                                    }
                                }}
                            >
                                Avançar
                            </button> */}

                            <button
                                type="button"
                                className={`rounded-md px-5 py-2 font-medium transition ${(() => {
                                    const selected = answers[question.id];
                                    const isOpenQuestion =
                                        question.type === "open" || question.type === "open_text";

                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) {
                                        return "bg-gray-300 text-gray-500 cursor-not-allowed";
                                    }

                                    if (isOpenQuestion) {
                                        return String(selected ?? "").trim().length === 0
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-[#e74e15] text-white hover:opacity-90";
                                    }

                                    if (isOpenOption) {
                                        return openText.trim().length === 0
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : "bg-[#e74e15] text-white hover:opacity-90";
                                    }

                                    return selected
                                        ? "bg-[#e74e15] text-white hover:opacity-90"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed";
                                })()}`}
                                disabled={(() => {
                                    const selected = answers[question.id];
                                    const isOpenQuestion =
                                        question.type === "open" || question.type === "open_text";

                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) return true;
                                    if (isOpenQuestion) return String(selected ?? "").trim().length === 0;
                                    if (isOpenOption) return openText.trim().length === 0;

                                    return !selected;
                                })()}
                                onClick={async () => {
                                    const selected = answers[question.id];
                                    const isOpenQuestion =
                                        question.type === "open" || question.type === "open_text";

                                    const op = (question.options ?? []).find((o) => o.id === selected);
                                    const isOpenOption =
                                        op?.label?.toLowerCase().includes("aberta") ||
                                        op?.label?.toLowerCase().includes("anotar") ||
                                        op?.is_open === "1" ||
                                        op?.is_open === 1;

                                    if (op && isQuotaFull(question.id, op.id)) {
                                        Swal.fire({
                                            icon: "warning",
                                            title: "Cota atingida",
                                            text: "Essa opção não possui mais vagas disponíveis.",
                                        });
                                        return;
                                    }

                                    try {
                                        const id = await ensureInterviewId();

                                        if (isOpenQuestion) {
                                            await apiCreateAnswer(id, {
                                                question_id: question.id,
                                                value_text: String(selected ?? ""),
                                                time_spent_ms: 0,
                                            });
                                        } else if (isOpenOption) {
                                            await apiCreateAnswer(id, {
                                                question_id: question.id,
                                                option_id: Number(selected),
                                                value_text: openText,
                                                time_spent_ms: 0,
                                            });
                                        } else {
                                            await apiCreateAnswer(id, {
                                                question_id: question.id,
                                                option_id: Number(selected),
                                                time_spent_ms: 0,
                                            });
                                        }

                                        await refreshQuotas();
                                        goNext();
                                    } catch (e: any) {
                                        const handled = await handleQuotaError(e);
                                        if (handled) return;

                                        console.error("Erro ao salvar resposta:", e);
                                    }
                                }}
                            >
                                Avançar
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================================= */}
                {/* ======================= ETAPA FINAL ========================= */}
                {/* ============================================================= */}

                {!loading && data && !quizExpired && !quizDisabled && isFinal && (
                    <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                            Etapa final
                        </p>

                        <h2 className="text-3xl font-semibold text-gray-900">
                            Finalizar formulário
                        </h2>

                        <p className="text-gray-700">
                            Clique em finalizar para concluir sua resposta.
                        </p>

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