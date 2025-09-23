"use client";

import React, { useEffect, useMemo, useState } from "react";
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
} from "@/utils/actions/question-data";
import { createQuestionRule } from "@/utils/actions/question-rule-data";
import { createQuestionOption } from "@/utils/actions/question-option-data";
import { QuestionProps, QuestionOptionProps } from "@/utils/types/question";

// NOVO: listar questionários para o modal de cópia
import { listQuizzes } from "@/utils/actions/quizzes-data";

function fallbackUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Props é opcional para manter retrocompatibilidade.
 *  Se você passar currentQuestionId, o modal de Pulo usa essa questão como base.
 *  Se NÃO passar, o modal permite escolher a questão base num dropdown.
 */
export default function QuestionActions({
  currentQuestionId,
}: {
  currentQuestionId?: number;
}) {
  const { selectedQuizId } = useQuiz();

  // Modais
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [showRestrictModal, setShowRestrictModal] = useState(false);

  // Estado geral
  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [orders, setOrders] = useState<Record<number, number>>({});

  // ====== PULO ======
  const [baseQuestionId, setBaseQuestionId] = useState<number | "">(
    currentQuestionId ?? ""
  );
  const [baseOptions, setBaseOptions] = useState<QuestionOptionProps[]>([]);
  const [isNumber, setIsNumber] = useState(false);
  const [optionId, setOptionId] = useState<number | "">("");
  const [state, setState] = useState("");
  const [value, setValue] = useState("");
  const [destination, setDestination] = useState<number | "">("");

  // ====== LINK (exibir somente se...) ======
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

  // ====== CÓPIA ======
  const [copyCount, setCopyCount] = useState<number>(1);
  const [quizzes, setQuizzes] = useState<
    { id: number; title?: string; name?: string }[]
  >([]);
  const [targetQuizId, setTargetQuizId] = useState<number | "">("");
  const [copyLoading, setCopyLoading] = useState(false);

  // Mocks (somente UI para botões ainda não integrados)
  const mockStates = useMemo(() => ["selecionado", "não selecionado"], []);
  const mockNumberStates = useMemo(
    () => [
      "maior que",
      "maior ou igual",
      "menor que",
      "menor ou igual",
      "diferente",
      "igual",
    ],
    []
  );

  useEffect(() => {
    if (typeof currentQuestionId === "number") {
      setBaseQuestionId(currentQuestionId);
      setLinkTargetId(currentQuestionId);
    }
  }, [currentQuestionId]);

  // Carrega lista de questões quando algum modal que usa perguntas abrir
  useEffect(() => {
    const needsQuestions =
      showReorderModal || showRestrictModal || showSkipModal || showLinkModal;
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
  ]);

  // Opções da questão base (PULO)
  useEffect(() => {
    if (!showSkipModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setBaseOptions(res?.options ?? []);
    };
    if (typeof baseQuestionId === "number") load(baseQuestionId);
    else setBaseOptions([]);
  }, [showSkipModal, baseQuestionId]);

  // Opções da questão condicional (LINK)
  useEffect(() => {
    if (!showLinkModal) return;
    const load = async () => {
      if (typeof linkQuestionId === "number") {
        const res = await getQuestionWithOptions(linkQuestionId);
        setLinkSourceOptions(res?.options ?? []);
      } else {
        setLinkSourceOptions([]);
      }
    };
    load();
  }, [showLinkModal, linkQuestionId]);

  // Lista de questionários (para CÓPIA)
  useEffect(() => {
    if (!showCopyModal) return;
    (async () => {
      try {
        const qs = (await listQuizzes()) || [];
        setQuizzes(qs);
        // sugestão: pré-selecionar o atual se existir
        setTargetQuizId((prev) =>
          prev !== "" ? prev : (selectedQuizId as number) ?? ""
        );
      } catch {
        setQuizzes([]);
      }
    })();
  }, [showCopyModal, selectedQuizId]);

  const getQuestionLabel = (q: QuestionProps) =>
    `${q.variable || `Q${q.id}`} — ${q.title || "-"}`;

  const getQuizLabel = (q: { title?: string; name?: string }) =>
    q.title || q.name || "Sem título";

  // ====== SALVAR PULO ======
  async function handleSaveSkip() {
    try {
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      if (typeof baseQuestionId !== "number")
        throw new Error("Selecione a questão base.");
      if (!destination) throw new Error("Selecione o destino.");

      let operator: string;
      let condition: any;

      if (!isNumber) {
        if (!optionId) throw new Error("Selecione a opção.");
        if (!state) throw new Error("Selecione o estado.");
        operator = state === "selecionado" ? "selected" : "not_selected";
        condition = {
          condition_question_id: baseQuestionId,
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
          condition_question_id: baseQuestionId,
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
      if (typeof currentQuestionId !== "number") {
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

  // ====== SALVAR LINK (exibir somente se...) ======
  async function handleSaveLink() {
    try {
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      const targetId =
        typeof currentQuestionId === "number"
          ? currentQuestionId
          : typeof linkTargetId === "number"
            ? linkTargetId
            : null;
      if (!targetId)
        throw new Error("Selecione a questão alvo (esta) no topo do modal.");
      if (typeof linkQuestionId !== "number")
        throw new Error("Selecione a questão condicional.");
      if (!linkOperator) throw new Error("Selecione a condição.");

      // Monta a condição
      let condition: any = {
        condition_question_id: linkQuestionId,
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

      // type "show": exibir a questão alvo somente se a condição for verdadeira
      const payload = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(linkQuestionId),
        type: "show" as const,
        logic: "AND" as const,
        target_question_id: Number(targetId),
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
      if (typeof currentQuestionId !== "number") setLinkTargetId("");
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message || String(err),
      });
    }
  }

  // ====== COPIAR QUESTÃO PARA OUTRO QUESTIONÁRIO ======
  async function handleCopyQuestion() {
    try {
      if (copyLoading) return;
      if (typeof currentQuestionId !== "number") {
        throw new Error("Abra o modal a partir de uma questão.");
      }
      if (!targetQuizId) {
        throw new Error("Selecione o questionário de destino.");
      }
      if (!copyCount || copyCount < 1) {
        throw new Error("Informe um número de cópias válido.");
      }

      setCopyLoading(true);

      // pega a questão completa (inclui opções)
      const full = await getQuestionWithOptions(currentQuestionId);
      if (!full?.question) throw new Error("Questão de origem não encontrada.");

      const q = full.question;

      // cria as cópias
      for (let i = 0; i < copyCount; i++) {
        const uuid =
          (self as any).crypto?.randomUUID?.() || fallbackUUID();

        const newQuestion = await createQuestion({
          quiz_id: Number(targetQuizId),
          type: q.type,
          title:
            q.title
              ? `Cópia de ${q.title}`
              : q.variable
                ? `Cópia de ${q.variable}`
                : "Cópia",
          variable: q.variable ? `${q.variable}_copia_${i + 1}` : "",
          uuid,
          // copiar flags principais
          is_required: !!q.is_required,
          is_hidden: !!q.is_hidden,
          is_readonly: !!q.is_readonly,
          shuffle_options: !!q.shuffle_options,
        });

        // replica opções (quando houver)
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

      // limpar estados
      setCopyCount(1);
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

  return (
    <TooltipProvider>
      <div className="flex gap-4 mb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowCopyModal(true)}
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
              onClick={() => setShowRefuseModal(true)}
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
                Número de cópias
              </label>
              <input
                type="number"
                min={1}
                value={copyCount}
                onChange={(e) => setCopyCount(Math.max(1, Number(e.target.value)))}
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
                disabled={copyLoading || !targetQuizId || !copyCount}
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

            {typeof currentQuestionId !== "number" ? (
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
                disabled={typeof baseQuestionId !== "number"}
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
                    disabled={typeof baseQuestionId !== "number"}
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
                    disabled={typeof baseQuestionId !== "number"}
                  >
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                    {mockStates.map((s) => (
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
                    disabled={typeof baseQuestionId !== "number"}
                  >
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                    {mockNumberStates.map((s) => (
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
                    disabled={typeof baseQuestionId !== "number"}
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
                disabled={typeof baseQuestionId !== "number"}
              >
                <option value="" disabled>
                  O Destino é OBRIGATÓRIO
                </option>
                {questions
                  .filter((q) => q.id !== baseQuestionId)
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
                  if (typeof currentQuestionId !== "number") {
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

      {/* ================= MODAL: VINCULAR (API) ================= */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Vincular Questões
            </h2>

            <p className="text-sm text-gray-700 mb-4">
              Esta questão será exibida <strong>somente se</strong>:
            </p>

            {typeof currentQuestionId !== "number" && (
              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">
                  Questão alvo (esta)
                </label>
                <select
                  value={linkTargetId}
                  onChange={(e) =>
                    setLinkTargetId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="">Selecione a questão</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {getQuestionLabel(q)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Questão condicional
              </label>
              <select
                value={linkQuestionId}
                onChange={(e) =>
                  setLinkQuestionId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="">Selecione uma questão</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {getQuestionLabel(q)}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Condição
              </label>
              <select
                value={linkOperator}
                onChange={(e) => setLinkOperator(e.target.value as any)}
                className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="">Selecione uma condição</option>
                <option value="eq">é igual a</option>
                <option value="neq">é diferente de</option>
                <option value="selected">está selecionado</option>
                <option value="not_selected">não está selecionado</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">
                Valor esperado
              </label>
              <input
                type="text"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder={
                  linkOperator === "selected" || linkOperator === "not_selected"
                    ? "Digite o rótulo/valor da opção"
                    : "Digite o valor"
                }
                className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 text-gray-800"
              />
              {linkOperator === "eq" || linkOperator === "neq" ? (
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={linkIsNumber}
                    onChange={() => setLinkIsNumber(!linkIsNumber)}
                    className="accent-orange-500"
                  />
                  valor numérico
                </label>
              ) : null}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkQuestionId("");
                  setLinkOperator("");
                  setLinkValue("");
                  setLinkIsNumber(false);
                  setLinkSourceOptions([]);
                  if (typeof currentQuestionId !== "number") setLinkTargetId("");
                }}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white"
                onClick={handleSaveLink}
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REORDENAR (UI) ================= */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
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
                <div className="col-span-3 truncate">
                  {q.variable || "-"}
                </div>
                <div className="col-span-6 truncate">{q.title || "-"}</div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={orders[q.id] || ""}
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
              >
                CANCELAR
              </button>
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECUSA (UI) ================= */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Configurar Recusa
            </h2>

            <p className="text-sm text-gray-700 mb-4">Se Q1 tem:</p>

            <div className="flex gap-4 mb-4">
              <div className="w-1/2">
                <label className="block text-sm text-gray-700 mb-1">
                  Opção
                </label>
                <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                  <option value="" disabled>
                    A Opção é OBRIGATÓRIA
                  </option>
                </select>
              </div>

              <div className="w-1/2">
                <label className="block text-sm text-gray-700 mb-1">
                  Estado
                </label>
                <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                  <option value="" disabled>
                    O Estado é OBRIGATÓRIO
                  </option>
                  <option>selecionado</option>
                  <option>não selecionado</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-800 mb-6">
              então <strong>recuse</strong>
            </p>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowRefuseModal(false)}
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
    </TooltipProvider>
  );
}
