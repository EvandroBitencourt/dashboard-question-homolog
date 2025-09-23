"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash, RotateCw, X } from "lucide-react";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  listQuestionsByQuiz,
  createQuestion,
  getQuestionWithOptions,
  updateQuestion,
  deleteQuestion,
} from "@/utils/actions/question-data";

import { useQuiz } from "@/context/QuizContext";
import type { QuestionProps, QuestionWithOptions } from "@/utils/types/question";
import { FaSpinner } from "react-icons/fa";
import { createQuestionOption } from "@/utils/actions/question-option-data";
import SingleChoiceForm from "@/app/components/SingleChoiceForm";
import MultipleChoiceForm from "@/app/components/MultipleChoiceForm";
import QuestionActions from "./QuestionActions";

// actions de regra
import {
  listQuestionRules,
  deleteQuestionRule,
} from "@/utils/actions/question-rule-data";

import type {
  QuestionRule,
  QuestionRuleCondition as RuleCondition,
} from "@/utils/types/question-rule";

/* ===================================================================== */
/* util                                                                  */
/* ===================================================================== */

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "Escolha Única",
  multiple_choice: "Escolha Múltipla",
  open: "Aberta",
  signature: "Assinatura",
  photo: "Foto",
  matrix: "Matriz",
  scale: "Escala",
} as const;

const BOOLEAN_FIELDS = [
  "is_required",
  "is_hidden",
  "is_readonly",
  "shuffle_options",
] as const;

function generateFallbackUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function convertBooleansFromBackend(question: QuestionProps): QuestionProps {
  const converted = { ...question };
  BOOLEAN_FIELDS.forEach((key) => {
    if (key in converted) {
      const value = converted[key as keyof QuestionProps];
      // @ts-ignore
      if (value === 1 || value === "1" || value === true) {
        converted[key] = true;
      } else if (
        value === 0 ||
        value === "0" ||
        value === false ||
        value === null ||
        value === undefined
      ) {
        converted[key] = false;
      } else {
        converted[key] = Boolean(value);
      }
    }
  });
  return converted;
}

const opLabel = (op: RuleCondition["operator"]) => {
  switch (op) {
    case "selected":
      return "selecionado";
    case "not_selected":
      return "não selecionado";
    case "eq":
      return "igual a";
    case "neq":
      return "diferente de";
    case "gt":
      return "maior que";
    case "gte":
      return "maior ou igual a";
    case "lt":
      return "menor que";
    case "lte":
      return "menor ou igual a";
    case "contains":
      return "contém";
    case "not_contains":
      return "não contém";
    default:
      return op;
  }
};

const qLabel = (q?: QuestionProps) => (q ? (q.variable ? q.variable : `Q${q.id}`) : "-");

/* ===================================================================== */
/* BLOCO 1: Regras desta questão (source = questão atual)                */
/* ===================================================================== */

function RulesOfThisQuestion({
  quizId,
  currentQuestion,
  currentOptions,
  questions,
  onChanged,
}: {
  quizId: number;
  currentQuestion: QuestionWithOptions["question"];
  currentOptions: QuestionWithOptions["options"];
  questions: QuestionProps[];
  onChanged?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<QuestionRule[]>([]);

  const optionById = useMemo(() => {
    const map = new Map<number, string>();
    (currentOptions ?? []).forEach((o: any) => {
      if (o?.id) map.set(o.id, o.label || o.value || `Opção ${o.id}`);
    });
    return map;
  }, [currentOptions]);

  const load = useCallback(async () => {
    if (!quizId || !currentQuestion?.id) return;
    setLoading(true);
    try {
      const list = await listQuestionRules({
        quizId: Number(quizId),
        questionId: Number(currentQuestion.id), // source_question_id
      });
      setRules(list || []);
    } finally {
      setLoading(false);
    }
  }, [quizId, currentQuestion?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (ruleId: number) => {
    const ask = await Swal.fire({
      icon: "warning",
      title: "Excluir regra?",
      text: "Esta ação não poderá ser desfeita.",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });
    if (!ask.isConfirmed) return;
    try {
      await deleteQuestionRule(ruleId);
      await load();
      onChanged?.();
      Swal.fire({ icon: "success", title: "Regra removida!", timer: 1200, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: "error", title: "Falha ao remover", text: e?.message || "Tente novamente." });
    }
  };

  return (
    <div className="border rounded p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-lg">Regras desta questão</h4>
        <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1">
          <RotateCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaSpinner className="animate-spin" />
          Carregando regras...
        </div>
      ) : rules.length === 0 ? (
        <div className="text-gray-500 italic">Nenhuma regra cadastrada para esta questão.</div>
      ) : (
        <div className="space-y-2">
          {rules.map((r, idx) => {
            const tgt = questions.find((q) => q.id === r.target_question_id);
            const cond = r.conditions?.[0];
            let condTexto = "";
            if (cond) {
              if (cond.operator === "selected" || cond.operator === "not_selected") {
                const optName = cond.option_id ? optionById.get(cond.option_id) || `Opção ${cond.option_id}` : "(opção)";
                condTexto = `${optName} ${opLabel(cond.operator)}`;
              } else if (cond.is_number) {
                condTexto = `${opLabel(cond.operator)} ${cond.compare_value}`;
              } else {
                condTexto = `${opLabel(cond.operator)} ${cond.compare_value ?? ""}`.trim();
              }
            }
            return (
              <div key={r.id} className="flex items-center justify-between border rounded px-3 py-2">
                <div className="text-sm">
                  <span className="font-semibold mr-2">{`J${idx + 1}`}</span>
                  <span>
                    Se <b>{qLabel(currentQuestion as any)}</b> tem <b>{condTexto || "(condição)"}</b> então{" "}
                    <b>{r.type === "skip" ? "pule para" : "vá para"}</b> <b>{qLabel(tgt)}</b>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id as number)}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-50"
                  title="Excluir regra"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================================================================== */
/* BLOCO 2: “Antes de Qx” (regras anteriores que pulam a questão atual)  */
/* ===================================================================== */

function BeforeThisQuestionBlock({
  quizId,
  currentQuestion,
  questions,
}: {
  quizId: number;
  currentQuestion: QuestionWithOptions["question"];
  questions: QuestionProps[];
}) {
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<
    { targetId: number; parts: string[] }[]
  >([]);

  // índice das questões por id (ordem visual da lista)
  const indexById = useMemo(() => {
    const m = new Map<number, number>();
    questions.forEach((q, i) => m.set(q.id, i));
    return m;
  }, [questions]);

  const load = useCallback(async () => {
    if (!quizId || !currentQuestion?.id) return;
    setLoading(true);
    try {
      // pega TODAS as regras do quiz
      const all = await listQuestionRules({ quizId: Number(quizId) });
      const curIdx = indexById.get(currentQuestion.id);
      if (curIdx === undefined) return;

      // filtra regras que “passam por cima” da questão atual
      const passing = (all || []).filter((r) => {
        const s = indexById.get(r.source_question_id);
        const t = indexById.get(r.target_question_id ?? 0);
        return s !== undefined && t !== undefined && s < curIdx && t > curIdx; // source antes, target depois
      });

      if (passing.length === 0) {
        setLines([]);
        return;
      }

      // precisamos do rótulo das opções da QUESTÃO DE ORIGEM
      // agrupa por source e busca opções de cada uma
      const uniqueSources = [...new Set(passing.map((r) => r.source_question_id))];
      const optMapByQuestion = new Map<number, Map<number, string>>();

      // busca opções das sources (em paralelo)
      await Promise.all(
        uniqueSources.map(async (sid) => {
          const q = await getQuestionWithOptions(sid);
          const map = new Map<number, string>();
          (q?.options ?? []).forEach((o: any) => {
            if (o?.id) map.set(o.id, o.label || o.value || `Opção ${o.id}`);
          });
          optMapByQuestion.set(sid, map);
        })
      );

      // agora montamos linhas agrupadas por TARGET (como no modelo, R1… pular para Q13)
      const byTarget = new Map<number, string[]>();

      for (const r of passing) {
        const cond = r.conditions?.[0];
        const srcQ = questions.find((q) => q.id === r.source_question_id);
        if (!cond || !srcQ) continue;

        let condText = "";
        if (cond.operator === "selected" || cond.operator === "not_selected") {
          const omap = optMapByQuestion.get(r.source_question_id);
          const optName = cond.option_id ? omap?.get(cond.option_id) || `Opção ${cond.option_id}` : "(opção)";
          condText = `${optName} ${opLabel(cond.operator)}`;
        } else if (cond.is_number) {
          condText = `${opLabel(cond.operator)} ${cond.compare_value}`;
        } else {
          condText = `${opLabel(cond.operator)} ${cond.compare_value ?? ""}`.trim();
        }

        const part = `se ${qLabel(srcQ)} tem ${condText}`;
        const arr = byTarget.get(r.target_question_id ?? 0) ?? [];
        arr.push(part);
        byTarget.set(r.target_question_id ?? 0, arr);
      }

      const prepared: { targetId: number; parts: string[] }[] = [];
      byTarget.forEach((parts, targetId) => prepared.push({ targetId, parts }));
      setLines(prepared);
    } finally {
      setLoading(false);
    }
  }, [quizId, currentQuestion?.id, indexById, questions]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="border rounded p-4 mb-6 text-sm text-gray-600 flex items-center gap-2">
        <FaSpinner className="animate-spin" /> Carregando regras que pulam esta questão...
      </div>
    );
  }

  if (lines.length === 0) return null;

  return (
    <div className="border rounded p-4 mb-6">
      {lines.map((line, i) => {
        const target = questions.find((q) => q.id === line.targetId);
        return (
          <div key={i} className="text-sm border rounded px-3 py-2 mb-2">
            <span className="font-semibold mr-2">{`R${i + 1}`}</span>
            <span>
              <b>Antes de {qLabel(currentQuestion as any)}</b>,{" "}
              {line.parts.map((p, idx) => (
                <span key={idx}>
                  {idx === 0 ? p : <> <b>Ou</b> {p}</>}{" "}
                </span>
              ))}
              , <b>pular</b> para <b>{qLabel(target)}</b>
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ===================================================================== */
/* PÁGINA                                                                 */
/* ===================================================================== */

export default function Question() {
  const { selectedQuizId } = useQuiz();
  const [openDialog, setOpenDialog] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionProps["type"] | "">("");
  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [selectedQuestionFull, setSelectedQuestionFull] = useState<QuestionWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [localTitle, setLocalTitle] = useState("");
  const [localVariable, setLocalVariable] = useState("");

  useEffect(() => {
    setLocalTitle(selectedQuestionFull?.question.title || "");
    setLocalVariable(selectedQuestionFull?.question.variable || "");
  }, [selectedQuestionFull?.question.title, selectedQuestionFull?.question.variable]);

  const questionTypeOptions = useMemo(
    () =>
      Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
        value: value as QuestionProps["type"],
        label,
      })),
    []
  );

  const refreshQuestions = useCallback(async () => {
    if (!selectedQuizId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listQuestionsByQuiz(selectedQuizId);
      const converted = (res || []).map(convertBooleansFromBackend);
      setQuestions(converted);
    } finally {
      setLoading(false);
    }
  }, [selectedQuizId]);

  useEffect(() => {
    refreshQuestions();
  }, [refreshQuestions]);

  // >>>>>>> atualiza a lista quando copiar/criar/excluir fora deste componente
  useEffect(() => {
    const handler = () => refreshQuestions();
    window.addEventListener("questions:changed", handler as any);
    return () => window.removeEventListener("questions:changed", handler as any);
  }, [refreshQuestions]);
  // <<<<<<<

  useEffect(() => {
    if (!selectedQuestionId) {
      setSelectedQuestionFull(null);
      return;
    }
    getQuestionWithOptions(selectedQuestionId)
      .then((data) => {
        if (data) {
          const convertedQuestion = convertBooleansFromBackend(data.question);
          setSelectedQuestionFull({ ...data, question: convertedQuestion });
        }
      })
      .catch(() => setSelectedQuestionFull(null));
  }, [selectedQuestionId]);

  const handleCreateQuestion = useCallback(async () => {
    if (!selectedQuizId || !questionType) return;
    try {
      const newQuestion = await createQuestion({
        quiz_id: selectedQuizId,
        type: questionType as QuestionProps["type"],
        title: "",
        variable: "",
        uuid: self.crypto?.randomUUID?.() || generateFallbackUUID(),
        is_required: false,
        is_hidden: false,
        is_readonly: false,
        shuffle_options: false,
      });

      await createQuestionOption({
        question_id: newQuestion.id,
        label: "",
        value: "",
        is_open: false,
        is_exclusive: false,
        is_nsnr: false,
        sort_order: 0,
      });

      const convertedQuestion = convertBooleansFromBackend(newQuestion);
      setQuestions((prev) => [...prev, convertedQuestion]);
      setOpenDialog(false);
      setQuestionType("");
      setSelectedQuestionId(newQuestion.id);

      window.dispatchEvent(new Event("questions:changed"));
    } catch { /* noop */ }
  }, [selectedQuizId, questionType]);

  const handleUpdateQuestion = useCallback(
    async (fields: Partial<QuestionProps>) => {
      if (!selectedQuestionFull || updateLoading) return;
      setUpdateLoading(true);
      try {
        const updated = await updateQuestion(selectedQuestionFull.question.id, fields);
        if (updated) {
          setSelectedQuestionFull((prev) => {
            if (!prev) return prev;
            const updatedQuestion = { ...prev.question };
            Object.entries(fields).forEach(([key, value]) => {
              if (BOOLEAN_FIELDS.includes(key as any)) {
                // @ts-ignore
                updatedQuestion[key] = Boolean(value);
              } else {
                // @ts-ignore
                updatedQuestion[key] = value;
              }
            });
            return { ...prev, question: updatedQuestion };
          });

          if (fields.title !== undefined) {
            setQuestions((prev) =>
              prev.map((q) => (q.id === selectedQuestionFull.question.id ? { ...q, title: fields.title ?? "" } : q))
            );
          }
        }
      } finally {
        setUpdateLoading(false);
      }
    },
    [selectedQuestionFull, updateLoading]
  );

  const handleStaticDelete = async () => {
    if (!selectedQuestionFull) return;
    const result = await Swal.fire({
      title: "Deseja excluir esta questão?",
      text: "Essa ação não poderá ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteQuestion(selectedQuestionFull.question.id);
        setQuestions((prev) => prev.filter((q) => q.id !== selectedQuestionFull.question.id));
        setSelectedQuestionId(null);
        setSelectedQuestionFull(null);
        Swal.fire("Excluído!", "A questão foi removida com sucesso.", "success");
        window.dispatchEvent(new Event("questions:changed"));
      } catch {
        Swal.fire("Erro", "Não foi possível excluir a questão.", "error");
      }
    }
  };

  // debounce do título (corrigido)
  const [titleUpdateTimeout, setTitleUpdateTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setSelectedQuestionFull((prev) =>
        prev ? { ...prev, question: { ...prev.question, title: newTitle } } : prev
      );

      if (titleUpdateTimeout) clearTimeout(titleUpdateTimeout);

      const timeout = setTimeout(() => {
        handleUpdateQuestion({ title: newTitle });
      }, 500);

      setTitleUpdateTimeout(timeout);
    },
    [handleUpdateQuestion, titleUpdateTimeout]
  );

  useEffect(() => {
    return () => {
      if (titleUpdateTimeout) {
        clearTimeout(titleUpdateTimeout);
      }
    };
  }, [titleUpdateTimeout]);

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="flex md:flex-row flex-col h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <aside className="md:w-1/3 w-full md:border-r border-b bg-white md:p-4 p-3 md:h-auto h-[48vh] flex flex-col">
          <div className="flex items-center justify-between md:mb-4 mb-3 sticky top-0 z-10 bg-white pb-2">
            <h2 className="font-bold text-lg">QUESTÕES</h2>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" className="gap-1">
                  <Plus className="w-4 h-4" /> Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[95vw] max-w-none">
                <DialogHeader>
                  <DialogTitle>Selecionar tipo de questão</DialogTitle>
                </DialogHeader>
                <Select value={questionType} onValueChange={(v) => setQuestionType(v as QuestionProps["type"])}>
                  <SelectTrigger><SelectValue placeholder="Tipo de questão" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setOpenDialog(false); setQuestionType(""); }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateQuestion} disabled={!questionType}>Selecionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin text-3xl text-gray-500"><FaSpinner /></div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma pergunta encontrada.</p>
              ) : (
                questions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`p-3 border rounded mb-2 cursor-pointer transition-colors ${selectedQuestionId === q.id ? "bg-orange-100 border-orange-500" : "bg-white hover:bg-slate-100"
                      }`}
                    onClick={() => setSelectedQuestionId(q.id)}
                  >
                    <p className="font-medium">{`Q${index + 1}`}</p>
                    <p className="text-sm text-gray-500 truncate">{q.title || "Sem título"}</p>
                    <p className="text-xs text-gray-400 mt-1">{QUESTION_TYPE_LABELS[q.type]}</p>
                  </div>
                ))
              )}
            </ScrollArea>
          )}
        </aside>

        {/* Detalhes */}
        <section className="flex-1 md:p-6 p-4 overflow-y-auto md:h-auto h-[52vh]">
          {selectedQuestionFull && (
            <>
              {/* ações (copiar, pular, etc) */}
              <QuestionActions currentQuestionId={selectedQuestionFull.question.id} />

              {/* BLOCO 2: “Antes de Qx” */}
              {selectedQuizId && (
                <BeforeThisQuestionBlock
                  quizId={Number(selectedQuizId)}
                  currentQuestion={selectedQuestionFull.question}
                  questions={questions}
                />
              )}

              {/* BLOCO 1: regras desta questão */}
              {selectedQuizId && (
                <RulesOfThisQuestion
                  quizId={Number(selectedQuizId)}
                  currentQuestion={selectedQuestionFull.question}
                  currentOptions={selectedQuestionFull.options}
                  questions={questions}
                />
              )}
            </>
          )}

          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-xl">Detalhes da Questão</h3>
            <button onClick={handleStaticDelete} className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-red-100 transition">
              <Trash className="w-6 h-6 text-red-600" />
            </button>
          </div>

          {selectedQuestionFull ? (
            <div className="space-y-6">
              <div className="space-y-4 border rounded p-4">
                <h4 className="font-medium text-lg mb-3">Configurações</h4>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Título da Questão</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={() => {
                      if (localTitle !== selectedQuestionFull?.question.title) {
                        handleUpdateQuestion({ title: localTitle });
                      }
                    }}
                    placeholder="Digite o título da questão"
                    disabled={updateLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Variável</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={localVariable}
                    onChange={(e) => setLocalVariable(e.target.value)}
                    onBlur={() => {
                      if (localVariable !== selectedQuestionFull?.question.variable) {
                        handleUpdateQuestion({ variable: localVariable });
                      }
                    }}
                    placeholder="Digite a variável"
                    disabled={updateLoading}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <SwitchField
                    label="Questão obrigatória"
                    value={selectedQuestionFull.question.is_required}
                    onChange={(val) => handleUpdateQuestion({ is_required: val })}
                    disabled={updateLoading}
                  />
                  <SwitchField
                    label="Questão oculta"
                    value={selectedQuestionFull.question.is_hidden}
                    onChange={(val) => handleUpdateQuestion({ is_hidden: val })}
                    disabled={updateLoading}
                  />
                  <SwitchField
                    label="Somente leitura"
                    value={selectedQuestionFull.question.is_readonly}
                    onChange={(val) => handleUpdateQuestion({ is_readonly: val })}
                    disabled={updateLoading}
                  />
                  {(selectedQuestionFull.question.type === "single_choice" ||
                    selectedQuestionFull.question.type === "multiple_choice") && (
                      <SwitchField
                        label="Embaralhar opções"
                        value={selectedQuestionFull.question.shuffle_options}
                        onChange={(val) => handleUpdateQuestion({ shuffle_options: val })}
                        disabled={updateLoading}
                      />
                    )}
                </div>

                {updateLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <FaSpinner className="animate-spin" />
                    Salvando alterações...
                  </div>
                )}
              </div>

              {selectedQuestionFull.question.type === "multiple_choice" && (
                <div className="border rounded p-4">
                  <h4 className="font-medium text-lg mb-3">Configurações multipla escolha:</h4>
                  <MultipleChoiceForm
                    question={selectedQuestionFull.question}
                    options={selectedQuestionFull.options || []}
                    onOptionsChange={(updated) => {
                      setSelectedQuestionFull((prev) => (prev ? { ...prev, options: updated } : prev));
                    }}
                  />
                </div>
              )}

              <div className="border rounded p-4">
                <h4 className="font-medium text-lg mb-3">Opções ({selectedQuestionFull.options.length})</h4>
                {(selectedQuestionFull.question.type === "single_choice" ||
                  selectedQuestionFull.question.type === "multiple_choice") && (
                    <SingleChoiceForm
                      question={selectedQuestionFull.question}
                      options={selectedQuestionFull.options || []}
                      onOptionsChange={(updated) => {
                        setSelectedQuestionFull((prev) => (prev ? { ...prev, options: updated } : prev));
                      }}
                    />
                  )}
                {selectedQuestionFull.question.type !== "single_choice" &&
                  selectedQuestionFull.question.type !== "multiple_choice" && (
                    <div className="text-gray-500 italic py-8 text-center">
                      Opções para tipo "{QUESTION_TYPE_LABELS[selectedQuestionFull.question.type]}" ainda não implementado.
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 italic text-center py-20">Selecione uma questão para editar seus detalhes.</div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ===================================================================== */
/* Switch                                                                */
/* ===================================================================== */

type SwitchFieldProps = {
  label: string;
  value: boolean;
  onChange: (newValue: boolean) => void;
  disabled?: boolean;
};
function SwitchField({ label, value, onChange, disabled = false }: SwitchFieldProps) {
  const handleClick = () => {
    if (disabled) return;
    onChange(!value);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={value}
        onClick={handleClick}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${value ? "bg-orange-500" : "bg-gray-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${value ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
      <label className={`text-sm ${disabled ? "text-gray-400" : "text-gray-700"}`}>{label}</label>
    </div>
  );
}
