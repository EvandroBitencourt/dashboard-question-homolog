"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Copy,
  SkipForward,
  Link2,
  ArrowUpDown,
  MessageSquareWarning,
  Hand,
  Link as LinkIcon,
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

/* ===== NOVO: vínculos de opções (variável oculta) ===== */
import {
  listOptionLinks,
  saveOptionLinks,
  type OptionLink,
} from "@/utils/actions/question-option-link-data";

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

  /* ===== NOVO: modal da Variável Oculta ===== */
  const [showHiddenVarModal, setShowHiddenVarModal] = useState(false);

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

  /* ------------------- LINK (exibição) ------------------- */
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

  /* ------------------- RESTRIÇÃO (NOVO) ------------------- */
  const [restrictTargetId, setRestrictTargetId] = useState<number | "">(
    currentQuestionId ?? ""
  );
  const [restrictQuestionId, setRestrictQuestionId] = useState<number | "">("");
  const [restrictOptions, setRestrictOptions] = useState<QuestionOptionProps[]>(
    []
  );
  const [restrictOptionId, setRestrictOptionId] = useState<number | "">("");
  const [restrictState, setRestrictState] = useState<
    "" | "selecionado" | "não selecionado"
  >("");
  const [restrictJumpId, setRestrictJumpId] = useState<number | "">("");
  const [restrictSaving, setRestrictSaving] = useState(false);

  /* ------------------- VARIÁVEL OCULTA (estados) ------------------- */
  const [hvBaseOptions, setHvBaseOptions] = useState<QuestionOptionProps[]>([]);
  const [hvBaseOptionId, setHvBaseOptionId] = useState<number | "">("");

  const [hvTargetQuestionId, setHvTargetQuestionId] = useState<number | "">("");
  const [hvTargetOptions, setHvTargetOptions] = useState<
    QuestionOptionProps[]
  >([]);

  const [hvAvailableChecked, setHvAvailableChecked] = useState<number[]>([]);
  const [hvLinkedChecked, setHvLinkedChecked] = useState<number[]>([]);
  const [hvLinkedIds, setHvLinkedIds] = useState<number[]>([]);
  const [hvInitialLinkedIds, setHvInitialLinkedIds] = useState<number[]>([]);

  const hvCanLink = useMemo(
    () =>
      Number(hvBaseOptionId) > 0 &&
      Number(hvTargetQuestionId) > 0 &&
      hvAvailableChecked.length > 0,
    [hvBaseOptionId, hvTargetQuestionId, hvAvailableChecked]
  );

  const hvCanUnlink = useMemo(
    () =>
      Number(hvBaseOptionId) > 0 &&
      Number(hvTargetQuestionId) > 0 &&
      hvLinkedChecked.length > 0,
    [hvBaseOptionId, hvTargetQuestionId, hvLinkedChecked]
  );

  /* ------------------- EFFECTS ------------------- */
  useEffect(() => {
    if (typeof currentQuestionId === "number") {
      setBaseQuestionId(currentQuestionId);
      setLinkTargetId(currentQuestionId);
      setRefuseQuestionId(currentQuestionId);
      setRestrictTargetId(currentQuestionId);

      if (currentQuestionId) {
        getQuestionWithOptions(currentQuestionId).then((res) => {
          setHvBaseOptions(res?.options ?? []);
        });
      } else {
        setHvBaseOptions([]);
      }
    }
  }, [currentQuestionId]);

  useEffect(() => {
    const needsQuestions =
      showReorderModal ||
      showRestrictModal ||
      showSkipModal ||
      showLinkModal ||
      showCopyModal ||
      showRefuseModal ||
      showHiddenVarModal;
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
    showHiddenVarModal,
  ]);

  useEffect(() => {
    if (!showSkipModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setBaseOptions(res?.options ?? []);
    };
    if (Number(baseQuestionId) > 0) load(Number(baseQuestionId));
    else setBaseOptions([]);
  }, [showSkipModal, baseQuestionId]);

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

  useEffect(() => {
    if (!showRefuseModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setRefuseOptions(res?.options ?? []);
    };
    if (Number(refuseQuestionId) > 0) load(Number(refuseQuestionId));
    else setRefuseOptions([]);
  }, [showRefuseModal, refuseQuestionId]);

  useEffect(() => {
    if (!showRestrictModal) return;
    const load = async (qid: number) => {
      const res = await getQuestionWithOptions(qid);
      setRestrictOptions(res?.options ?? []);
    };
    if (Number(restrictQuestionId) > 0) load(Number(restrictQuestionId));
    else setRestrictOptions([]);
  }, [showRestrictModal, restrictQuestionId]);

  /* ===== VARIÁVEL OCULTA: carregar opções e vínculos ===== */
  useEffect(() => {
    if (!showHiddenVarModal) return;

    (async () => {
      try {
        setHvTargetOptions([]);
        setHvLinkedIds([]);
        setHvInitialLinkedIds([]);
        setHvAvailableChecked([]);
        setHvLinkedChecked([]);

        if (!(Number(hvTargetQuestionId) > 0)) return;

        const full = await getQuestionWithOptions(Number(hvTargetQuestionId));
        const opts = full?.options ?? [];
        setHvTargetOptions(opts);

        if (Number(hvBaseOptionId) > 0 && selectedQuizId && currentQuestionId) {
          const rows = await listOptionLinks({
            quiz_id: Number(selectedQuizId),
            source_question_id: Number(currentQuestionId),
            source_option_id: Number(hvBaseOptionId),
            target_question_id: Number(hvTargetQuestionId),
          });

          const already = (rows || []).map((r) => r.target_option_id);
          setHvLinkedIds(already);
          setHvInitialLinkedIds(already);
        }
      } catch {
        /* silencioso */
      }
    })();
  }, [
    showHiddenVarModal,
    hvTargetQuestionId,
    hvBaseOptionId,
    selectedQuizId,
    currentQuestionId,
  ]);

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

  /* ------------------- SALVAR LINK (exibição) ------------------- */
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
        type: "refuse" as const,
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

  /* ------------------- SALVAR RESTRIÇÃO (NOVO) ------------------- */
  async function handleSaveRestrict() {
    try {
      if (restrictSaving) return;
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      if (!(Number(restrictTargetId) > 0))
        throw new Error("Selecione o ‘Alvo / Antes de Q?’.");
      if (!(Number(restrictQuestionId) > 0))
        throw new Error("Selecione a questão condicional.");
      if (!(Number(restrictOptionId) > 0))
        throw new Error("Selecione a opção.");
      if (!restrictState) throw new Error("Selecione o estado.");

      const operator =
        restrictState === "selecionado" ? "selected" : "not_selected";

      const payload = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(restrictQuestionId),
        type: "restrict" as const,
        logic: "AND" as const,
        target_question_id: Number(restrictTargetId),
        sort_order: 0,
        is_active: 1,
        // jump_to_question_id (opcional)
        conditions: [
          {
            condition_question_id: Number(restrictQuestionId),
            operator,
            option_id: Number(restrictOptionId),
            compare_value: null,
            is_number: 0,
          },
        ],
      };

      setRestrictSaving(true);
      await createQuestionRule(payload as any);
      setRestrictSaving(false);

      await Swal.fire({
        icon: "success",
        title: "Restrição criada!",
        timer: 1400,
        showConfirmButton: false,
      });

      setShowRestrictModal(false);
      setRestrictQuestionId("");
      setRestrictOptions([]);
      setRestrictOptionId("");
      setRestrictState("");
      setRestrictJumpId("");
    } catch (err: any) {
      setRestrictSaving(false);
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message ?? String(err),
      });
    }
  }

  /* ------------------- VARIÁVEL OCULTA: Ações UI ------------------- */
  function hvToggleAvailable(id: number, checked: boolean) {
    setHvAvailableChecked((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    );
  }
  function hvToggleLinked(id: number, checked: boolean) {
    setHvLinkedChecked((prev) =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id)
    );
  }
  function hvDoLink() {
    if (!hvCanLink) return;
    const next = Array.from(new Set([...hvLinkedIds, ...hvAvailableChecked]));
    setHvLinkedIds(next);
    setHvAvailableChecked([]);
  }
  function hvDoUnlink() {
    if (!hvCanUnlink) return;
    const next = hvLinkedIds.filter((id) => !hvLinkedChecked.includes(id));
    setHvLinkedIds(next);
    setHvLinkedChecked([]);
  }

  async function hvSave() {
    try {
      if (!selectedQuizId) throw new Error("Quiz não selecionado.");
      if (!(Number(currentQuestionId) > 0))
        throw new Error("Questão atual inválida.");
      if (!(Number(hvBaseOptionId) > 0))
        throw new Error("Escolha uma opção base da questão atual.");
      if (!(Number(hvTargetQuestionId) > 0))
        throw new Error("Selecione a questão para vincular.");

      const toCreateIds = hvLinkedIds.filter(
        (id) => !hvInitialLinkedIds.includes(id)
      );
      const toDeleteIds = hvInitialLinkedIds.filter(
        (id) => !hvLinkedIds.includes(id)
      );

      const baseLink: Pick<
        OptionLink,
        "quiz_id" | "source_question_id" | "source_option_id" | "target_question_id"
      > = {
        quiz_id: Number(selectedQuizId),
        source_question_id: Number(currentQuestionId),
        source_option_id: Number(hvBaseOptionId),
        target_question_id: Number(hvTargetQuestionId),
      };

      const toCreate: OptionLink[] = toCreateIds.map((target_option_id) => ({
        ...baseLink,
        target_option_id,
      }));
      const toDelete: OptionLink[] = toDeleteIds.map((target_option_id) => ({
        ...baseLink,
        target_option_id,
      }));

      const result = await saveOptionLinks({ toCreate, toDelete });

      if (!result?.ok) {
        await Swal.fire({
          icon: "warning",
          title: "Alguns vínculos não foram salvos",
          text: "Verifique sua conexão e tente novamente.",
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Vínculos salvos!",
          timer: 1300,
          showConfirmButton: false,
        });
      }

      setShowHiddenVarModal(false);
      setHvBaseOptionId("");
      setHvTargetQuestionId("");
      setHvTargetOptions([]);
      setHvLinkedIds([]);
      setHvInitialLinkedIds([]);
      setHvAvailableChecked([]);
      setHvLinkedChecked([]);
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "Erro ao salvar",
        text: err?.message ?? String(err),
      });
    }
  }

  /* ------------------- RENDER ------------------- */
  return (
    <TooltipProvider>
      <div className="flex gap-4 mb-4">
        {/* Copiar questão */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => {
                setSourceQuestionId("");
                setTargetQuizId("");
                setShowCopyModal(true);
              }}
              aria-label="Copiar questão"
              title="Copiar questão"
            >
              <Copy size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copiar questão</TooltipContent>
        </Tooltip>

        {/* Adicionar Restrição */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowRestrictModal(true)}
              aria-label="Adicionar Restrição"
              title="Adicionar Restrição"
            >
              <MessageSquareWarning size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Restrição</TooltipContent>
        </Tooltip>

        {/* Pular questão */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowSkipModal(true)}
              aria-label="Pular questão"
              title="Pular questão"
            >
              <SkipForward size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Pular questão</TooltipContent>
        </Tooltip>

        {/* Vincular questões (mostrar/ocultar) */}

        {/* Variável Oculta */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => {
                if (Number(currentQuestionId) > 0) {
                  getQuestionWithOptions(Number(currentQuestionId)).then((res) =>
                    setHvBaseOptions(res?.options ?? [])
                  );
                } else {
                  setHvBaseOptions([]);
                }
                setShowHiddenVarModal(true);
              }}
              aria-label="Criar Variável Oculta"
              title="Criar Variável Oculta"
            >
              <LinkIcon size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Vincular questões</TooltipContent>
        </Tooltip>

        {/* Reordenar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowReorderModal(true)}
              aria-label="Reordenar questões"
              title="Reordenar questões"
            >
              <ArrowUpDown size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reordenar questões</TooltipContent>
        </Tooltip>

        {/* Recusa */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => {
                setRefuseQuestionId(
                  Number(currentQuestionId) > 0 ? Number(currentQuestionId) : ""
                );
                setRefuseOptionId("");
                setRefuseState("");
                setShowRefuseModal(true);
              }}
              aria-label="Adicionar Recusa"
              title="Adicionar Recusa"
            >
              <Hand size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Recusa</TooltipContent>
        </Tooltip>
      </div>

      {/* ================= MODAL: VARIÁVEL OCULTA ================= */}
      {showHiddenVarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl p-6">
            <h2 className="text-lg font-semibold mb-1 text-gray-800">
              Criar Variável Oculta
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Crie vínculos entre as questões
            </p>

            <div className="grid grid-cols-12 gap-6">
              {/* Coluna Esquerda */}
              <div className="col-span-12 md:col-span-5">
                <p className="text-sm text-gray-700 mb-2">
                  Opções (da questão atual)
                </p>
                <select
                  value={hvBaseOptionId}
                  onChange={(e) =>
                    setHvBaseOptionId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-orange-500 px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="">Selecione uma opção base</option>
                  {hvBaseOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label || o.value || `Opção ${o.id}`}
                    </option>
                  ))}
                </select>

                <div className="mt-4 rounded border p-3">
                  <p className="text-sm text-gray-600 mb-2">Disponíveis</p>

                  <div className="mb-2">
                    <input
                      placeholder="(Opcional) Buscar nos disponíveis"
                      className="w-full border-b px-2 py-1 outline-none text-sm"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        const ids = hvTargetOptions
                          .filter((op) =>
                            (op.label || op.value || "")
                              .toLowerCase()
                              .includes(q)
                          )
                          .map((op) => op.id!);
                        setHvAvailableChecked((prev) =>
                          prev.filter((id) => ids.includes(id))
                        );
                      }}
                    />
                  </div>

                  <div className="max-h-64 overflow-auto pr-1">
                    <label className="flex items-center gap-2 text-sm mb-2">
                      <input
                        type="checkbox"
                        checked={
                          hvTargetOptions.length > 0 &&
                          hvTargetOptions.every((o) =>
                            hvAvailableChecked.includes(o.id!)
                          )
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setHvAvailableChecked(
                              hvTargetOptions.map((o) => o.id!)
                            );
                          } else {
                            setHvAvailableChecked([]);
                          }
                        }}
                      />
                      Selecionar Todos
                    </label>

                    {hvTargetOptions.length === 0 && (
                      <p className="text-xs text-gray-500">
                        Nenhuma opção disponível.
                      </p>
                    )}

                    {hvTargetOptions.map((op) => (
                      <label
                        key={op.id}
                        className="flex items-center gap-2 text-sm py-1"
                      >
                        <input
                          type="checkbox"
                          checked={hvAvailableChecked.includes(op.id!)}
                          onChange={(e) =>
                            hvToggleAvailable(op.id!, e.target.checked)
                          }
                        />
                        {op.label || op.value}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Centro */}
              <div className="col-span-12 md:col-span-2 flex flex-col items-center justify-center gap-3">
                <button
                  className={`px-4 py-2 rounded text-white text-sm ${hvCanLink
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-400 cursor-not-allowed"
                    }`}
                  disabled={!hvCanLink}
                  onClick={hvDoLink}
                >
                  VINCULAR
                </button>
                <button
                  className={`px-4 py-2 rounded text-white text-sm ${hvCanUnlink
                    ? "bg-gray-500 hover:bg-gray-600"
                    : "bg-gray-300 cursor-not-allowed"
                    }`}
                  disabled={!hvCanUnlink}
                  onClick={hvDoUnlink}
                >
                  DESVINCULAR
                </button>
              </div>

              {/* Coluna Direita */}
              <div className="col-span-12 md:col-span-5">
                <p className="text-sm text-gray-700 mb-2">Questões</p>
                <select
                  value={hvTargetQuestionId}
                  onChange={(e) =>
                    setHvTargetQuestionId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="w-full border-b-2 border-orange-500 px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="">Selecione uma questão</option>
                  {questions
                    .filter((q) => q.id !== Number(currentQuestionId))
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {getQuestionLabel(q)}
                      </option>
                    ))}
                </select>

                <div className="mt-4 rounded border p-3">
                  <p className="text-sm text-gray-600 mb-2">Vinculados</p>

                  <div className="mb-2">
                    <input
                      placeholder="(Opcional) Buscar nos vinculados"
                      className="w-full border-b px-2 py-1 outline-none text-sm"
                      onChange={(e) => {
                        const q = e.target.value.toLowerCase();
                        const ids = hvTargetOptions
                          .filter((op) =>
                            (op.label || op.value || "")
                              .toLowerCase()
                              .includes(q)
                          )
                          .map((op) => op.id!);
                        setHvLinkedChecked((prev) =>
                          prev.filter((id) => ids.includes(id))
                        );
                      }}
                    />
                  </div>

                  <div className="max-h-64 overflow-auto pr-1">
                    {hvLinkedIds.length === 0 && (
                      <p className="text-xs text-gray-500">
                        Nenhum vínculo ainda.
                      </p>
                    )}

                    {hvLinkedIds
                      .map((id) => hvTargetOptions.find((o) => o.id === id))
                      .filter(Boolean)
                      .map((op) => (
                        <label
                          key={op!.id}
                          className="flex items-center gap-2 text-sm py-1"
                        >
                          <input
                            type="checkbox"
                            checked={hvLinkedChecked.includes(op!.id!)}
                            onChange={(e) =>
                              hvToggleLinked(op!.id!, e.target.checked)
                            }
                          />
                          {op!.label || op!.value}
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => {
                  setShowHiddenVarModal(false);
                  setHvBaseOptionId("");
                  setHvTargetQuestionId("");
                  setHvTargetOptions([]);
                  setHvLinkedIds([]);
                  setHvInitialLinkedIds([]);
                  setHvAvailableChecked([]);
                  setHvLinkedChecked([]);
                }}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white disabled:opacity-60"
                onClick={hvSave}
                disabled={
                  !(Number(hvBaseOptionId) > 0) ||
                  !(Number(hvTargetQuestionId) > 0)
                }
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ================= MODAL: RESTRIÇÃO (FUNCIONAL) ================= */}
      {showRestrictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              Editar Restrição
            </h2>

            <p className="text-sm text-gray-600 mb-2">Antes de Q?</p>
            <select
              value={restrictTargetId}
              onChange={(e) =>
                setRestrictTargetId(
                  e.target.value ? Number(e.target.value) : ""
                )
              }
              className="w-full border-b-2 border-orange-500 px-2 py-1 bg-transparent text-gray-800 mb-4"
            >
              <option value="">Selecione</option>
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {getQuestionLabel(q)}
                </option>
              ))}
            </select>

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
                  <select
                    value={restrictQuestionId}
                    onChange={(e) =>
                      setRestrictQuestionId(
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

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Opção
                  </label>
                  <select
                    value={restrictOptionId}
                    onChange={(e) =>
                      setRestrictOptionId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    disabled={!(Number(restrictQuestionId) > 0)}
                  >
                    <option value="" disabled>
                      A Opção é OBRIGATÓRIA
                    </option>
                    {restrictOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label || opt.value}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={restrictState}
                    onChange={(e) => setRestrictState(e.target.value as any)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    disabled={!(Number(restrictQuestionId) > 0)}
                  >
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                    <option value="selecionado">selecionado</option>
                    <option value="não selecionado">não selecionado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-7">
                  <label className="block text-sm text-gray-700 mb-1">
                    Pule para
                  </label>
                  <select
                    value={restrictJumpId}
                    onChange={(e) =>
                      setRestrictJumpId(
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    className="w-full border-b-2 border-gray-300 px-2 py-1 bg-transparent text-gray-800"
                  >
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
                  <select
                    value={restrictTargetId}
                    onChange={(e) =>
                      setRestrictTargetId(
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
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowRestrictModal(false)}
                disabled={restrictSaving}
              >
                FECHAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white disabled:opacity-60"
                onClick={handleSaveRestrict}
                disabled={
                  restrictSaving ||
                  !(Number(restrictTargetId) > 0) ||
                  !(Number(restrictQuestionId) > 0) ||
                  !(Number(restrictOptionId) > 0) ||
                  !restrictState
                }
              >
                {restrictSaving ? "SALVANDO..." : "SALVAR"}
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
