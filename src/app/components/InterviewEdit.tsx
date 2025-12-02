"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Swal from "sweetalert2";

import { useQuiz } from "@/context/QuizContext";
import {
    listInterviewAnswers,
    updateInterviewAnswers,
} from "@/utils/actions/interviews-data";

/* ---------- Tipagens ---------- */
type QuestionOption = {
    id: number | string;
    label: string;
    value?: string | number | boolean | null;
};

type Question = {
    id: number;
    title: string;
    type: string; // "single_choice", "open_text", etc.
    options?: QuestionOption[];
};

type QuizFull = {
    quiz: { id: number; title: string };
    questions: Question[];
};

type Props = {
    interviewId: number;
};

/* ---------- Utils ---------- */
function normalize(s: unknown) {
    return String(s ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/** Tenta encontrar o option_id a partir de value_text/number/bool */
function guessOptionId(
    q: Question,
    payload: { value_text?: any; value_number?: any; value_bool?: any }
) {
    if (!q?.options?.length) return null;

    const txt = payload?.value_text ?? null;
    const num = payload?.value_number ?? null;
    const boo = payload?.value_bool ?? null;

    // 1) casar por texto no label
    if (txt != null && txt !== "") {
        const norm = normalize(txt);

        // igual por label
        const byLabel = q.options.find((op) => normalize(op.label) === norm);
        if (byLabel) return byLabel.id;

        // igual por value textual
        const byValueText = q.options.find(
            (op) => op.value != null && typeof op.value !== "object" && normalize(op.value) === norm
        );
        if (byValueText) return byValueText.id;

        // contém (tolerância)
        const contains = q.options.find(
            (op) =>
                normalize(op.label).includes(norm) ||
                (op.value != null &&
                    typeof op.value !== "object" &&
                    normalize(op.value).includes(norm))
        );
        if (contains) return contains.id;
    }

    // 2) casar por número
    if (num != null) {
        const byValueNum = q.options.find(
            (op) => op.value != null && Number(op.value) === Number(num)
        );
        if (byValueNum) return byValueNum.id;
    }

    // 3) casar por boolean (Sim/Não ou true/false)
    if (boo != null) {
        const normBool = boo === true || boo === 1 || boo === "1";
        // procurar por value booleano
        const byValueBool = q.options.find(
            (op) => typeof op.value === "boolean" && op.value === normBool
        );
        if (byValueBool) return byValueBool.id;

        // procurar por label “sim/nao”
        const labelHit = q.options.find((op) => {
            const l = normalize(op.label);
            return (
                (normBool && (l === "sim" || l === "masculino" || l === "true")) ||
                (!normBool &&
                    (l === "nao" || l === "não" || l === "feminino" || l === "false"))
            );
        });
        if (labelHit) return labelHit.id;
    }

    return null;
}

const InterviewEdit = ({ interviewId }: Props) => {
    const router = useRouter();
    const { selectedQuizId, selectedQuizTitle } = useQuiz();

    const [quizData, setQuizData] = useState<QuizFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // respostas locais: question_id -> { option_id?, value_text? }
    const [answers, setAnswers] = useState<
        Record<number, { option_id?: number | null; value_text?: string | null }>
    >({});

    function goBack() {
        router.push("/dashboard/interviews");
    }

    /* ---------- Carrega estrutura + respostas ---------- */
    useEffect(() => {
        async function load() {
            if (!selectedQuizId) {
                await Swal.fire("Atenção", "Nenhum questionário selecionado.", "warning");
                return;
            }

            try {
                setLoading(true);

                const API = process.env.NEXT_PUBLIC_API_URL!;
                const [quizRes, ansData] = await Promise.all([
                    fetch(`${API}/api/quiz-public/${selectedQuizId}/full`, {
                        cache: "no-store",
                    }),
                    listInterviewAnswers(interviewId),
                ]);

                if (!quizRes.ok) throw new Error("Erro ao carregar questionário");
                const quizJson = (await quizRes.json()) as QuizFull;
                setQuizData(quizJson);

                const questionsById = new Map<number, Question>();
                (quizJson.questions ?? []).forEach((q) => questionsById.set(q.id, q));

                const map: Record<
                    number,
                    { option_id?: number | null; value_text?: string | null }
                > = {};

                (ansData ?? []).forEach((a: any) => {
                    const qId = Number(a.question_id);
                    const q = questionsById.get(qId);

                    let optionId: number | null =
                        a.option_id !== null && a.option_id !== undefined
                            ? Number(a.option_id)
                            : null;

                    // Se não há option_id, tenta deduzir por texto/número/bool
                    if ((!optionId || Number.isNaN(optionId)) && q) {
                        const guessed = guessOptionId(q, {
                            value_text: a.value_text,
                            value_number: a.value_number,
                            value_bool: a.value_bool,
                        });
                        if (guessed != null) optionId = Number(guessed);
                    }

                    map[qId] = {
                        option_id: optionId ?? null,
                        value_text:
                            a.value_text !== undefined && a.value_text !== null
                                ? String(a.value_text)
                                : null,
                    };
                });

                setAnswers(map);
            } catch (e: any) {
                console.error(e);
                await Swal.fire(
                    "Erro",
                    e?.message || "Não foi possível carregar os dados da entrevista.",
                    "error"
                );
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [interviewId, selectedQuizId]);

    const questions = quizData?.questions ?? [];

    /* ---------- Handlers ---------- */
    function handleChangeSingle(questionId: number, optionId: number | string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: { ...prev[questionId], option_id: Number(optionId), value_text: null },
        }));
    }

    async function handleSave() {
        try {
            setSaving(true);

            const payload = Object.entries(answers).map(
                ([question_id, val]: [string, any]) => ({
                    question_id: Number(question_id),
                    option_id:
                        val.option_id !== undefined && val.option_id !== null
                            ? Number(val.option_id)
                            : null,
                    value_text:
                        val.value_text !== undefined ? (val.value_text ?? null) : null,
                })
            );

            await updateInterviewAnswers(interviewId, payload);

            await Swal.fire("Salvo", "Respostas atualizadas com sucesso.", "success");

            // após salvar, volta para a listagem de coletas
            router.push("/dashboard/interviews");
        } catch (e: any) {
            console.error(e);
            await Swal.fire(
                "Erro",
                e?.message || "Não foi possível salvar as respostas.",
                "error"
            );
        } finally {
            setSaving(false);
        }
    }

    /* ---------- Render ---------- */
    if (loading) {
        return (
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Carregando entrevista...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (!quizData) {
        return (
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Dados não encontrados</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    return (
        <section>
            <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 border-b pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            onClick={goBack}
                            disabled={saving}
                            className="h-8 px-3 text-sm border border-[#d9441e] text-[#d9441e] bg-white hover:bg-[#d9441e] hover:text-white"
                            variant="outline"
                        >
                            Voltar
                        </Button>

                        <CardTitle className="text-lg text-[#e85228] font-bold">
                            Editar respostas da entrevista #{interviewId}
                        </CardTitle>
                    </div>

                    <p className="text-sm text-gray-600">
                        Questionário:{" "}
                        <span className="font-semibold">
                            {selectedQuizTitle || quizData.quiz.title}
                        </span>
                    </p>
                </CardHeader>

                <CardContent className="p-4 space-y-6">
                    {questions.map((q, idx) => {
                        const current = answers[q.id];
                        const selectedOptionId =
                            current?.option_id != null ? Number(current.option_id) : null;

                        return (
                            <div
                                key={q.id}
                                className="border rounded-md px-4 py-3 bg-white shadow-sm"
                            >
                                <p className="text-xs text-gray-500 mb-1">
                                    Q{idx + 1} - ID {q.id}
                                </p>
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    {q.title}
                                </h3>

                                {q.type === "single_choice" && (
                                    <div className="space-y-2">
                                        {(q.options ?? []).map((op) => (
                                            <div key={String(op.id)}>
                                                <label
                                                    className={`flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 hover:bg-orange-50 ${Number(selectedOptionId) === Number(op.id) ? "bg-orange-50" : ""
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        className="h-4 w-4"
                                                        checked={Number(selectedOptionId) === Number(op.id)}
                                                        onChange={() =>
                                                            setAnswers((prev) => ({
                                                                ...prev,
                                                                [q.id]: {
                                                                    ...prev[q.id],
                                                                    option_id: Number(op.id),
                                                                },
                                                            }))
                                                        }
                                                    />

                                                    <span className="text-sm text-gray-800">{op.label}</span>
                                                </label>

                                                {/* SE A OPÇÃO FOR ABERTA, MOSTRA O INPUT */}
                                                {Number(selectedOptionId) === Number(op.id) && op.label.toLowerCase().includes("anotar") && (
                                                    <input
                                                        type="text"
                                                        className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                                                        placeholder="Digite a resposta"
                                                        value={answers[q.id]?.value_text ?? ""}
                                                        onChange={(e) =>
                                                            setAnswers((prev) => ({
                                                                ...prev,
                                                                [q.id]: {
                                                                    ...prev[q.id],
                                                                    value_text: e.target.value,
                                                                },
                                                            }))
                                                        }
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}


                                {q.type === "open_text" && (
                                    <textarea
                                        className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
                                        rows={2}
                                        value={current?.value_text ?? ""}
                                        onChange={(e) =>
                                            setAnswers((prev) => ({
                                                ...prev,
                                                [q.id]: {
                                                    ...prev[q.id],
                                                    value_text: e.target.value,
                                                },
                                            }))
                                        }
                                    />
                                )}
                            </div>
                        );
                    })}

                    <div className="border-t pt-4 mt-2 flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={goBack}
                            disabled={saving}
                            className="border border-[#d9441e] text-[#d9441e] hover:bg-[#d9441e] hover:text-white"
                        >
                            Voltar
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#e85228] hover:bg-[#d9441e]"
                        >
                            {saving ? "Salvando..." : "Salvar alterações"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </section>
    );
};

export default InterviewEdit;
