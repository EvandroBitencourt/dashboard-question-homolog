"use client";

import React, { useEffect, useState } from "react";
import {
  Copy,
  SkipForward,
  Link2,
  ArrowUpDown,
  MessageSquareWarning,
  Hand,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Swal from "sweetalert2";

import { useQuiz } from "@/context/QuizContext";
import {
  listQuestionsByQuiz,
  getQuestionWithOptions,
  createQuestion,
  updateQuestion,
} from "@/utils/actions/question-data";
import { createQuestionRule } from "@/utils/actions/question-rule-data";
import { createQuestionOption } from "@/utils/actions/question-option-data";
import { QuestionProps, QuestionOptionProps } from "@/utils/types/question";
import { listQuizzes } from "@/utils/actions/quizzes-data";

/* utils */
function fallbackUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function QuestionActions({
  currentQuestionId,
}: {
  currentQuestionId?: number;
}) {
  const { selectedQuizId } = useQuiz();

  /* ------------------- MODAIS ------------------- */
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);

  /* ------------------- ESTADOS GERAIS ------------------- */
  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [orders, setOrders] = useState<Record<number, number>>({});
  const [savingOrder, setSavingOrder] = useState(false);

  /* ------------------- PULO ------------------- */
  const [baseQuestionId, setBaseQuestionId] = useState<number | "">(
    currentQuestionId ?? ""
  );
  const [baseOptions, setBaseOptions] = useState<QuestionOptionProps[]>([]);
  const [isNumber, setIsNumber] = useState(false);
  const [optionId, setOptionId] = useState<number | "">("");
  const [state, setState] = useState("");
  const [value, setValue] = useState("");
  const [destination, setDestination] = useState<number | "">("");

  /* ------------------- LINK ------------------- */
  const [linkQuestionId, setLinkQuestionId] = useState<number | "">("");
  const [linkOperator, setLinkOperator] =
    useState<"" | "eq" | "neq" | "selected" | "not_selected">("");
  const [linkValue, setLinkValue] = useState("");
  const [linkIsNumber, setLinkIsNumber] = useState(false);
  const [linkSourceOptions, setLinkSourceOptions] = useState<
    QuestionOptionProps[]
  >([]);
  const [linkTargetId, setLinkTargetId] = useState<number | "">(
    currentQuestionId ?? ""
  );

  /* ------------------- CÓPIA ------------------- */
  const [sourceQuestionId, setSourceQuestionId] = useState<number | "">("");
  const [copyCount, setCopyCount] = useState<number>(1);
  const [quizzes, setQuizzes] = useState<
    { id: number; title?: string; name?: string }[]
  >([]);
  const [targetQuizId, setTargetQuizId] = useState<number | "">("");
  const [copyLoading, setCopyLoading] = useState(false);

  /* ------------------- RECUSA ------------------- */
  const [refuseQuestionId, setRefuseQuestionId] = useState<number | "">(
    currentQuestionId ?? ""
  );
  const [refuseOptions, setRefuseOptions] = useState<QuestionOptionProps[]>([]);
  const [refuseOptionId, setRefuseOptionId] = useState<number | "">("");
  const [refuseState, setRefuseState] = useState<
    "" | "selecionado" | "não selecionado"
  >("");
  const [refuseSaving, setRefuseSaving] = useState(false);

  /* ------------------- EFFECTS ------------------- */
  useEffect(() => {
    if (typeof currentQuestionId === "number") {
      setBaseQuestionId(currentQuestionId);
      setLinkTargetId(currentQuestionId);
      setRefuseQuestionId(currentQuestionId); // garante pré-seleção correta
    }
  }, [currentQuestionId]);

  // carrega perguntas quando algum modal que usa perguntas abrir
  useEffect(() => {
    const needsQuestions =
      showReorderModal ||
      showRestrictModal ||
      showSkipModal ||
      showLinkModal ||
      showCopyModal ||
      showRefuseModal;
    if (!selectedQuizId || !needsQuestions) return;

    listQuestionsByQuiz(selectedQuizId).then((res) => {
      if (!res) return;
      setQuestions(res);

      if (showReorderModal) {
        const initial: Record<number, number> = {};
        res.forEach((q, i) => (initial[q.id] = i + 1));
        setOrders(initial);
      }
    });
  }, [
    selectedQuizId,
    showReorderModal,
    showRestrictModal,
    showSkipModal,
    showLinkModal,
    showCopyModal,
    showRefuseModal,
  ]);

  // opções da questão base (pulo)
  useEffect(() => {
    if (!showSkipModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setBaseOptions(res?.options ?? []);
    };
    if (Number(baseQuestionId) > 0) load(Number(baseQuestionId));
    else setBaseOptions([]);
  }, [showSkipModal, baseQuestionId]);

  // opções da questão condicional (link)
  useEffect(() => {
    if (!showLinkModal) return;
    const load = async () => {
      if (Number(linkQuestionId) > 0) {
        const res = await getQuestionWithOptions(Number(linkQuestionId));
        setLinkSourceOptions(res?.options ?? []);
      } else {
        setLinkSourceOptions([]);
      }
    };
    load();
  }, [showLinkModal, linkQuestionId]);

  // lista de questionários (cópia)
  useEffect(() => {
    if (!showCopyModal) return;
    (async () => {
      try {
        const qs = (await listQuizzes()) || [];
        setQuizzes(qs);
      } catch {
        setQuizzes([]);
      }
    })();
  }, [showCopyModal]);

  // opções da questão (recusa) — usa Number() para aceitar "3" ou 3
  useEffect(() => {
    if (!showRefuseModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setRefuseOptions(res?.options ?? []);
    };
    if (Number(refuseQuestionId) > 0) load(Number(refuseQuestionId));
    else setRefuseOptions([]);
  }, [showRefuseModal, refuseQuestionId]);

  /* ------------------- HELPERS ------------------- */
  const getQuestionLabel = (q: QuestionProps) =>
    `${q.variable || `Q${q.id}`} — ${q.title || "-"}`;
  const getQuizLabel = (q: { title?: string; name?: string }) =>
    q.title || q.name || "Sem título";

  /* ------------------- SALVAR PULO ------------------- */
  async function handleSaveSkip() {
    try {
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      if (!(Number(baseQuestionId) > 0))
        throw new Error("Selecione a questão base.");
      if (!(Number(destination) > 0)) throw new Error("Selecione o destino.");

      let operator: string;
      let condition: any;

      if (!isNumber) {
        if (!(Number(optionId) > 0)) throw new Error("Selecione a opção.");
        if (!state) throw new Error("Selecione o estado.");
        operator = state === "selecionado" ? "selected" : "not_selected";
        condition = {
          condition_question_id: Number(baseQuestionId),
          operator,
          option_id: Number(optionId),
          compare_value: null,
          is_number: 0,
        };
      } else {
        if (!state) throw new Error("Selecione o estado numérico.");
        if (value === "") throw new Error("Informe o valor.");
        const map: Record<string, string> = {
          "maior que": "gt",
          "maior ou igual": "gte",
          "menor que": "lt",
          "menor ou igual": "lte",
          diferente: "neq",
          igual: "eq",
        };
        operator = map[state];
        condition = {
          condition_question_id: Number(baseQuestionId),
          operator,
          option_id: null,
          compare_value: String(value),
          is_number: 1,
        };
      }

      const payload = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(baseQuestionId),
        type: "skip" as const,
        logic: "AND" as const,
        target_question_id: Number(destination),
        sort_order: 0,
        is_active: 1,
        conditions: [condition],
      };

      await createQuestionRule(payload);
      await Swal.fire({
        icon: "success",
        title: "Regra de pulo criada!",
        timer: 1400,
        showConfirmButton: false,
      });

      setShowSkipModal(false);
      setIsNumber(false);
      setOptionId("");
      setState("");
      setValue("");
      setDestination("");
      if (!(Number(currentQuestionId) > 0)) {
        setBaseOptions([]);
        setBaseQuestionId("");
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message ?? String(err),
      });
    }
  }

  /* ------------------- SALVAR LINK ------------------- */
  async function handleSaveLink() {
    try {
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      const targetId =
        Number(currentQuestionId) > 0
          ? Number(currentQuestionId)
          : Number(linkTargetId) > 0
            ? Number(linkTargetId)
            : null;
      if (!targetId)
        throw new Error("Selecione a questão alvo (esta) no topo do modal.");
      if (!(Number(linkQuestionId) > 0))
        throw new Error("Selecione a questão condicional.");
      if (!linkOperator) throw new Error("Selecione a condição.");

      let condition: any = {
        condition_question_id: Number(linkQuestionId),
        operator: linkOperator,
        option_id: null as number | null,
        compare_value: null as string | null,
        is_number: 0 as 0 | 1,
      };

      if (linkOperator === "selected" || linkOperator === "not_selected") {
        if (!linkValue.trim())
          throw new Error("Informe o rótulo/valor da opção.");
        const opt = linkSourceOptions.find(
          (o) =>
            (o.label ?? "").toLowerCase() === linkValue.trim().toLowerCase() ||
            (o.value ?? "").toLowerCase() === linkValue.trim().toLowerCase()
        );
        if (!opt)
          throw new Error("Opção não encontrada na questão condicional.");
        condition.option_id = opt.id!;
      } else {
        if (!linkValue.trim()) throw new Error("Informe o valor esperado.");
        condition.compare_value = linkValue.trim();
        condition.is_number = linkIsNumber ? 1 : 0;
      }

      const payload = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(linkQuestionId),
        type: "show" as const,
        logic: "AND" as const,
        target_question_id: targetId,
        sort_order: 0,
        is_active: 1,
        conditions: [condition],
      };

      await createQuestionRule(payload);
      await Swal.fire({
        icon: "success",
        title: "Regra de exibição criada!",
        timer: 1400,
        showConfirmButton: false,
      });

      setShowLinkModal(false);
      setLinkQuestionId("");
      setLinkOperator("");
      setLinkValue("");
      setLinkIsNumber(false);
      setLinkSourceOptions([]);
      if (!(Number(currentQuestionId) > 0)) setLinkTargetId("");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message || String(err),
      });
    }
  }

  /* ------------------- REORDENAR ------------------- */
  async function updateOneOrder(questionId: number, newOrder: number) {
    try {
      await updateQuestion(questionId, { sort_order: newOrder } as any);
      return;
    } catch {
      await updateQuestion(questionId, { order: newOrder } as any);
    }
  }

  async function handleSaveReorder() {
    try {
      if (savingOrder) return;
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");

      const changes = questions
        .map((q) => ({
          id: q.id,
          newOrder: Number(orders[q.id]),
        }))
        .filter((c) => Number.isFinite(c.newOrder) && c.newOrder > 0);

      if (changes.length === 0) {
        throw new Error("Informe a nova ordem das questões.");
      }

      setSavingOrder(true);
      for (const c of changes) {
        await updateOneOrder(c.id, c.newOrder);
      }
      setSavingOrder(false);
      setShowReorderModal(false);

      window.dispatchEvent(new Event("questions:changed"));

      await Swal.fire({
        icon: "success",
        title: "Ordem atualizada!",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: any) {
      setSavingOrder(false);
      Swal.fire({
        icon: "error",
        title: "Falha ao salvar a ordem",
        text:
          err?.message ??
          "Tente novamente. Se persistir, posso logar o payload para depurar.",
      });
    }
  }

  /* ------------------- COPIAR QUESTÃO ------------------- */
  async function handleCopyQuestion() {
    try {
      if (copyLoading) return;

      if (!(Number(sourceQuestionId) > 0))
        throw new Error("Selecione uma questão para copiar.");
      if (!(Number(targetQuizId) > 0))
        throw new Error("Selecione o questionário de destino.");
      if (!copyCount || copyCount < 1)
        throw new Error("Informe um número de cópias válido.");

      setCopyLoading(true);

      const full = await getQuestionWithOptions(Number(sourceQuestionId));
      if (!full?.question) throw new Error("Questão de origem não encontrada.");

      const q = full.question;

      for (let i = 0; i < copyCount; i++) {
        const uuid =
          (self as any).crypto?.randomUUID?.() || fallbackUUID();

        const newQuestion = await createQuestion({
          quiz_id: Number(targetQuizId),
          type: q.type,
          title: q.title
            ? `Cópia de ${q.title}`
            : q.variable
              ? `Cópia de ${q.variable}`
              : "Cópia",
          variable: q.variable ? `${q.variable}_copia_${i + 1}` : "",
          uuid,
          is_required: !!q.is_required,
          is_hidden: !!q.is_hidden,
          is_readonly: !!q.is_readonly,
          shuffle_options: !!q.shuffle_options,
        });

        if (Array.isArray(full.options) && full.options.length > 0) {
          for (const opt of full.options) {
            await createQuestionOption({
              question_id: newQuestion.id,
              label: opt.label ?? "",
              value: opt.value ?? "",
              is_open: !!opt.is_open,
              is_exclusive: !!opt.is_exclusive,
              is_nsnr: !!opt.is_nsnr,
              sort_order: Number(opt.sort_order ?? 0),
            });
          }
        }
      }

      setCopyLoading(false);
      setShowCopyModal(false);

      await Swal.fire({
        icon: "success",
        title: "Questão copiada!",
        text:
          Number(targetQuizId) === Number(selectedQuizId)
            ? "As cópias foram adicionadas neste questionário."
            : "As cópias foram adicionadas no questionário de destino.",
        timer: 1600,
        showConfirmButton: false,
      });

      setCopyCount(1);
      setSourceQuestionId("");
      setTargetQuizId("");
    } catch (err: any) {
      setCopyLoading(false);
      Swal.fire({
        icon: "error",
        title: "Erro ao copiar",
        text: err?.message ?? String(err),
      });
    }
  }

  /* ------------------- SALVAR RECUSA ------------------- */
  async function handleSaveRefuse() {
    try {
      if (refuseSaving) return;
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      if (!(Number(refuseQuestionId) > 0))
        throw new Error("Selecione a questão (origem).");
      if (!(Number(refuseOptionId) > 0))
        throw new Error("Selecione a opção.");
      if (!refuseState) throw new Error("Selecione o estado.");

      setRefuseSaving(true);

      const operator =
        refuseState === "selecionado" ? "selected" : "not_selected";

      const payload = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(refuseQuestionId),
        type: "refuse" as const, // se sua engine usar "block", troque aqui
        logic: "AND" as const,
        target_question_id: null as unknown as number | null,
        sort_order: 0,
        is_active: 1,
        conditions: [
          {
            condition_question_id: Number(refuseQuestionId),
            operator,
            option_id: Number(refuseOptionId),
            compare_value: null,
            is_number: 0,
          },
        ],
      };

      await createQuestionRule(payload as any);
      await Swal.fire({
        icon: "success",
        title: "Regra de recusa criada!",
        timer: 1400,
        showConfirmButton: false,
      });

      setShowRefuseModal(false);
      setRefuseOptionId("");
      setRefuseState("");
      if (!(Number(currentQuestionId) > 0)) {
        setRefuseQuestionId("");
        setRefuseOptions([]);
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message ?? String(err),
      });
    } finally {
      setRefuseSaving(false);
    }
  }

  /* ------------------- RENDER ------------------- */
  return (
    <TooltipProvider>
      <div className="flex gap-4 mb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => {
                setSourceQuestionId(""); // abre em branco como você pediu
                setTargetQuizId("");
                setShowCopyModal(true);
              }}
            >
              <Copy size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copiar questão</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowRestrictModal(true)}
            >
              <MessageSquareWarning size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Restrição</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowSkipModal(true)}
            >
              <SkipForward size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Pular questão</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowLinkModal(true)}
            >
              <Link2 size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Vincular questões</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowReorderModal(true)}
            >
              <ArrowUpDown size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reordenar questões</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => {
                // garante que já abre habilitado mesmo se vier pré-selecionado
                setRefuseQuestionId(
                  Number(currentQuestionId) > 0 ? Number(currentQuestionId) : ""
                );
                setRefuseOptionId("");
                setRefuseState("");
                setShowRefuseModal(true);
              }}
            >
              <Hand size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Recusa</TooltipContent>
        </Tooltip>
      </div>

      {/* ================= MODAL: COPIAR (API) ================= */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            {copyLoading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-transparent" />
              </div>
            )}
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Copiar Questão
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Questão (origem)
              </label>
              <select
                value={sourceQuestionId}
                onChange={(e) =>
                  setSourceQuestionId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="">Selecione</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {getQuestionLabel(q)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Número de cópias
              </label>
              <input
                type="number"
                min={1}
                value={copyCount}
                onChange={(e) =>
                  setCopyCount(Math.max(1, Number(e.target.value)))
                }
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 text-gray-800"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">
                Formulário
              </label>
              <select
                value={targetQuizId}
                onChange={(e) =>
                  setTargetQuizId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="">Selecione um formulário</option>
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {getQuizLabel(q)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                disabled={copyLoading}
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-60"
                onClick={() => {
                  if (copyLoading) return;
                  setShowCopyModal(false);
                }}
              >
                CANCELAR
              </button>
              <button
                disabled={
                  copyLoading ||
                  !(Number(targetQuizId) > 0) ||
                  !copyCount ||
                  !(Number(sourceQuestionId) > 0)
                }
                className="px-4 py-2 rounded bg-orange-500 text-white disabled:opacity-60"
                onClick={handleCopyQuestion}
              >
                COPIAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTRIÇÃO (UI) ================= */}
      {showRestrictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              Editar Restrição
            </h2>

            <p className="text-sm text-gray-600 mb-4">Antes de Q?</p>

            <div className="rounded border p-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-6">
                <input type="checkbox" className="accent-orange-500" disabled />
                Numérico
              </label>

              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Questão
                  </label>
                  <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                    <option value="" disabled>
                      A Questão é OBRIGATÓRIA
                    </option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {getQuestionLabel(q)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Opção
                  </label>
                  <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                    <option value="" disabled>
                      A Opção é OBRIGATÓRIA
                    </option>
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm opacity-70 cursor-not-allowed">
                  + OU
                </button>
                <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm opacity-70 cursor-not-allowed">
                  + E
                </button>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-7">
                  <label className="block text-sm text-gray-700 mb-1">
                    Pule para
                  </label>
                  <select className="w-full border-b-2 border-gray-300 px-2 py-1 bg-transparent text-gray-800">
                    <option value="">Selecione</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {getQuestionLabel(q)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-sm text-gray-700 mb-1">
                    Alvo
                  </label>
                  <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                    <option value="" disabled>
                      O Alvo é OBRIGATÓRIO
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowRestrictModal(false)}
              >
                FECHAR
              </button>
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PULAR (API) ================= */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Editar regra de pulo
            </h2>

            {!(Number(currentQuestionId) > 0) ? (
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">
                  Questão base
                </label>
                <select
                  value={baseQuestionId}
                  onChange={(e) =>
                    setBaseQuestionId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-orange-500 px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="">Selecione a questão</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {getQuestionLabel(q)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs text-gray-600 mb-2">
                Usando a questão atual como base.
              </p>
            )}

            <label className="flex items-center mb-4 gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isNumber}
                onChange={() => {
                  setIsNumber(!isNumber);
                  setOptionId("");
                  setState("");
                  setValue("");
                }}
                className="accent-orange-500"
                disabled={!(Number(baseQuestionId) > 0)}
              />
              É Número
            </label>

            {!isNumber ? (
              <div className="flex gap-4 mb-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Opção
                  </label>
                  <select
                    value={optionId}
                    onChange={(e) => setOptionId(Number(e.target.value))}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    disabled={!(Number(baseQuestionId) > 0)}
                  >
                    <option value="" disabled>
                      A Opção é OBRIGATÓRIA
                    </option>
                    {baseOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    disabled={!(Number(baseQuestionId) > 0)}
                  >
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                    {["selecionado", "não selecionado"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 mb-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    disabled={!(Number(baseQuestionId) > 0)}
                  >
                    {[
                      "maior que",
                      "maior ou igual",
                      "menor que",
                      "menor ou igual",
                      "diferente",
                      "igual",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 text-gray-800"
                    placeholder="O Valor é OBRIGATÓRIO"
                    disabled={!(Number(baseQuestionId) > 0)}
                  />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">Destino</label>
              <select
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                disabled={!(Number(baseQuestionId) > 0)}
              >
                <option value="" disabled>
                  O Destino é OBRIGATÓRIO
                </option>
                {questions
                  .filter((q) => q.id !== Number(baseQuestionId))
                  .map((q) => (
                    <option key={q.id} value={q.id}>
                      {getQuestionLabel(q)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => {
                  setShowSkipModal(false);
                  setIsNumber(false);
                  setOptionId("");
                  setState("");
                  setValue("");
                  setDestination("");
                  if (!(Number(currentQuestionId) > 0)) {
                    setBaseOptions([]);
                    setBaseQuestionId("");
                  }
                }}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white"
                onClick={handleSaveSkip}
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REORDENAR (API) ================= */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto relative">
            {savingOrder && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-transparent" />
              </div>
            )}

            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              Reordene as Questões
            </h2>

            <div className="grid grid-cols-12 items-center font-semibold border-b pb-2 mb-3 text-sm text-gray-600">
              <div className="col-span-3">Variável</div>
              <div className="col-span-6">Questão</div>
              <div className="col-span-2">Ordem</div>
              <div className="col-span-1 text-center"> </div>
            </div>

            {questions.map((q) => (
              <div
                key={q.id}
                className="grid grid-cols-12 items-center py-2 border-b text-sm"
              >
                <div className="col-span-3 truncate">{q.variable || "-"}</div>
                <div className="col-span-6 truncate">{q.title || "-"}</div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min={1}
                    value={orders[q.id] ?? ""}
                    onChange={(e) =>
                      setOrders({ ...orders, [q.id]: Number(e.target.value) })
                    }
                    className="w-full border-b-2 border-orange-500 px-2 py-1 text-gray-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>
            ))}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowReorderModal(false)}
                disabled={savingOrder}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white"
                onClick={handleSaveReorder}
                disabled={savingOrder}
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECUSA (API) ================= */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Configurar Recusa
            </h2>

            {!(Number(currentQuestionId) > 0) && (
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">
                  Questão (origem)
                </label>
                <select
                  value={refuseQuestionId}
                  onChange={(e) =>
                    setRefuseQuestionId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-orange-500 px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="">Selecione</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {getQuestionLabel(q)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-4 mb-6">
              <div className="w-1/2">
                <label className="block text-sm text-gray-700 mb-1">
                  Opção
                </label>
                <select
                  value={refuseOptionId}
                  onChange={(e) =>
                    setRefuseOptionId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                  disabled={!(Number(refuseQuestionId) > 0)}
                >
                  <option value="" disabled>
                    A Opção é OBRIGATÓRIA
                  </option>
                  {refuseOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label || opt.value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-1/2">
                <label className="block text-sm text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={refuseState}
                  onChange={(e) => setRefuseState(e.target.value as any)}
                  className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                  disabled={!(Number(refuseQuestionId) > 0)}
                >
                  <option value="" disabled>
                    O Estado é OBRIGATÓRIO
                  </option>
                  <option value="selecionado">selecionado</option>
                  <option value="não selecionado">não selecionado</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => {
                  setShowRefuseModal(false);
                  setRefuseOptionId("");
                  setRefuseState("");
                  if (!(Number(currentQuestionId) > 0)) {
                    setRefuseOptions([]);
                    setRefuseQuestionId("");
                  }
                }}
              >
                FECHAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white disabled:opacity-60"
                onClick={handleSaveRefuse}
                disabled={
                  refuseSaving ||
                  !(Number(refuseQuestionId) > 0) ||
                  !(Number(refuseOptionId) > 0) ||
                  !refuseState
                }
              >
                {refuseSaving ? "SALVANDO..." : "SALVAR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
