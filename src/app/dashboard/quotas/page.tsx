"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuiz } from "@/context/QuizContext";
import {
  QuestionProps,
  type QuestionOptionProps,
} from "@/utils/types/question";
import { QuotasProps } from "@/utils/types/quotas";
import { FaSpinner } from "react-icons/fa";
import { listQuestionsByQuiz } from "@/utils/actions/question-data";
import {
  getQuotasByQuiz,
  checkQuestionHasQuotas,
  bulkCreateQuotasForQuestion,
  updateQuotaLimit,
  deleteQuota,
} from "@/utils/actions/quotas-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listQuestionOptionsByQuestionId } from "@/utils/actions/question-option-data";

/** Rótulos de tipos (exibidos no seletor do modal) */
const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: "Escolha Única",
  multiple_choice: "Escolha Múltipla",
  open: "Aberta",
  signature: "Assinatura",
  photo: "Foto",
  matrix: "Matriz",
  scale: "Escala",
};

export default function Quotas() {
  const { selectedQuizId } = useQuiz();

  // ====== Estado principal (lista) ======
  const [quotas, setQuotas] = useState<QuotasProps[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionProps[]>([]);
  const [loading, setLoading] = useState(true);

  // ====== Dropdown pais -> filhos ======
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggleExpand = (pid: number) =>
    setExpanded((prev) => ({ ...prev, [pid]: !prev[pid] }));

  // ====== Modal “Nova Cota” (pais) ======
  const [openDialog, setOpenDialog] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);
  const [modalQuestionId, setModalQuestionId] = useState<number | null>(null);
  const [modalOptions, setModalOptions] = useState<QuestionOptionProps[]>([]);
  const [modalLimits, setModalLimits] = useState<Record<number, number>>({});
  const [modalLoading, setModalLoading] = useState(false);

  // ====== Modal “Nova sub-cota” ======
  const [openSubDialog, setOpenSubDialog] = useState(false);
  const [subSaving, setSubSaving] = useState(false);
  const [subParentQuota, setSubParentQuota] = useState<QuotasProps | null>(
    null
  );
  const [subQuestionId, setSubQuestionId] = useState<number | null>(null);
  const [subOptions, setSubOptions] = useState<QuestionOptionProps[]>([]);
  const [subLimits, setSubLimits] = useState<Record<number, number>>({});
  const [subLoading, setSubLoading] = useState(false);

  // ====================== LOAD INICIAL ======================
  useEffect(() => {
    const run = async () => {
      if (!selectedQuizId) {
        setQuotas([]);
        setAllQuestions([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [qs, qts] = await Promise.all([
          listQuestionsByQuiz(selectedQuizId),
          getQuotasByQuiz(selectedQuizId),
        ]);
        setAllQuestions(qs || []);
        setQuotas(qts || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedQuizId]);

  const reloadQuotas = async () => {
    if (!selectedQuizId) return;
    const qts = await getQuotasByQuiz(selectedQuizId);
    setQuotas(qts || []);
  };

  // ===== Pais/filhos =====
  const parents = useMemo(() => {
    const list = quotas.filter((q) => !q.parent_quota_id);
    list.sort((a, b) => {
      if (a.question_id !== b.question_id) return a.question_id - b.question_id;
      return Number(a.question_option_id) - Number(b.question_option_id);
    });
    return list;
  }, [quotas]);

  const childrenByParent = useMemo(() => {
    const map = new Map<number, QuotasProps[]>();
    quotas
      .filter((q) => !!q.parent_quota_id)
      .forEach((child) => {
        const pid = Number(child.parent_quota_id);
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(child);
      });
    map.forEach((arr) =>
      arr.sort((a, b) => {
        if (a.question_id !== b.question_id) return a.question_id - b.question_id;
        return Number(a.question_option_id) - Number(b.question_option_id);
      })
    );
    return map;
  }, [quotas]);

  // perguntas disponíveis para criar **cotas-pai** (sem já existir pai)
  const availableQuestionsForParent = useMemo(() => {
    const usedParentQuestions = new Set(
      quotas.filter((q) => !q.parent_quota_id).map((q) => Number(q.question_id))
    );
    return allQuestions.filter((q) => !usedParentQuestions.has(Number(q.id)));
  }, [quotas, allQuestions]);

  // ====================== MODAL PAI: abrir/reset ======================
  const handleOpenDialog = () => {
    setOpenDialog(true);
    setModalQuestionId(null);
    setModalOptions([]);
    setModalLimits({});
  };

  // quando mudar a pergunta (pai), busca opções
  useEffect(() => {
    const run = async () => {
      if (!modalQuestionId) {
        setModalOptions([]);
        setModalLimits({});
        return;
      }
      try {
        setModalLoading(true);
        const opts = await listQuestionOptionsByQuestionId(modalQuestionId);
        const list = opts ?? [];
        setModalOptions(list);
        const lims: Record<number, number> = {};
        list.forEach((o) => (lims[o.id] = 0));
        setModalLimits(lims);
      } finally {
        setModalLoading(false);
      }
    };
    run();
  }, [modalQuestionId]);

  // ====================== CRIAR COTA PAI (bulk + patch limites) ======================
  const handleCreateQuota = async () => {
    if (!selectedQuizId || !modalQuestionId) return;

    setSavingQuota(true);
    try {
      const already = await checkQuestionHasQuotas(Number(modalQuestionId));
      if (already?.has_quotas) {
        alert("Esta pergunta já possui quotas.");
        return;
      }

      // cria quotas base (limite 0)
      await bulkCreateQuotasForQuestion(
        Number(modalQuestionId),
        Number(selectedQuizId),
        0
      );

      // carrega quotas do quiz e filtra por ESTA pergunta
      const all = await getQuotasByQuiz(Number(selectedQuizId));
      const createdForThisQuestion = all.filter(
        (q) => Number(q.question_id) === Number(modalQuestionId) && !q.parent_quota_id
      );

      // mapeia por question_option_id
      const mapByOption = new Map<number, QuotasProps>(
        createdForThisQuestion.map((q) => [Number(q.question_option_id), q])
      );

      // aplica limites digitados
      await Promise.all(
        modalOptions.map(async (opt) => {
          const quota = mapByOption.get(Number(opt.id));
          const lim = Number(modalLimits[Number(opt.id)] ?? 0);
          if (quota?.id != null) {
            await updateQuotaLimit(Number(quota.id), lim);
          }
        })
      );

      await reloadQuotas();
      setOpenDialog(false);
      setModalQuestionId(null);
      setModalOptions([]);
      setModalLimits({});
    } catch (e) {
      console.error(e);
      alert("Erro ao criar quotas.");
    } finally {
      setSavingQuota(false);
    }
  };

  // ====================== MODAL SUB: abrir/reset ======================
  const openSubQuotaModal = (parent: QuotasProps) => {
    setSubParentQuota(parent);
    setOpenSubDialog(true);
    setSubQuestionId(null);
    setSubOptions([]);
    setSubLimits({});
  };

  // quando mudar a pergunta (sub-cota), busca opções
  useEffect(() => {
    const run = async () => {
      if (!subQuestionId) {
        setSubOptions([]);
        setSubLimits({});
        return;
      }
      try {
        setSubLoading(true);
        const opts = await listQuestionOptionsByQuestionId(subQuestionId);
        const list = opts ?? [];
        setSubOptions(list);
        const lims: Record<number, number> = {};
        list.forEach((o) => (lims[o.id] = 0));
        setSubLimits(lims);
      } finally {
        setSubLoading(false);
      }
    };
    run();
  }, [subQuestionId]);

  // ====================== CRIAR SUB-COTAS ======================
  const handleCreateSubQuota = async () => {
    if (!selectedQuizId || !subQuestionId || !subParentQuota?.id) return;

    const parentLimit = Number(subParentQuota.limit ?? 0);
    const sum = Object.values(subLimits).reduce((a, b) => a + Number(b || 0), 0);
    if (sum > parentLimit) {
      alert(
        `A soma das sub-cotas (${sum}) não pode ultrapassar o limite da cota-pai (${parentLimit}).`
      );
      return;
    }

    setSubSaving(true);
    try {
      // cria sub-cotas com limite 0
      // (o back aceita parent_quota_id; a action deve repassar o 4º argumento no body)
      // @ts-ignore – 4º argumento: parent_quota_id
      await bulkCreateQuotasForQuestion(
        Number(subQuestionId),
        Number(selectedQuizId),
        0,
        Number(subParentQuota.id)
      );

      // carrega e filtra filhos do pai para ESTA pergunta
      const all = await getQuotasByQuiz(Number(selectedQuizId));
      const createdChildren = all.filter(
        (q) =>
          Number(q.question_id) === Number(subQuestionId) &&
          Number(q.parent_quota_id) === Number(subParentQuota.id)
      );

      const mapByOption = new Map<number, QuotasProps>(
        createdChildren.map((q) => [Number(q.question_option_id), q])
      );

      // aplica limites (isso dispara a validação de soma vs pai no back)
      for (const opt of subOptions) {
        const quota = mapByOption.get(Number(opt.id));
        const lim = Number(subLimits[Number(opt.id)] ?? 0);
        if (quota?.id != null) {
          await updateQuotaLimit(Number(quota.id), lim);
        }
      }

      await reloadQuotas();
      // abre o pai automaticamente
      setExpanded((prev) => ({ ...prev, [subParentQuota.id!]: true }));
      setOpenSubDialog(false);
      setSubParentQuota(null);
      setSubQuestionId(null);
      setSubOptions([]);
      setSubLimits({});
    } catch (e) {
      console.error(e);
      alert("Erro ao criar sub-cotas.");
    } finally {
      setSubSaving(false);
    }
  };

  // ====================== EXCLUIR QUOTA (pai ou filho) ======================
  const handleDeleteQuota = async (quotaId?: number) => {
    if (!quotaId) return;
    if (!confirm("Excluir esta quota?")) return;
    await deleteQuota(quotaId);
    await reloadQuotas();
  };

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="flex h-[calc(100vh-80px)]">
        <section className="w-full border-r bg-white p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">QUOTAS</h2>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1"
                  onClick={handleOpenDialog}
                  disabled={!selectedQuizId || availableQuestionsForParent.length === 0}
                  title={
                    !selectedQuizId
                      ? "Selecione um questionário"
                      : availableQuestionsForParent.length === 0
                        ? "Todas as perguntas já possuem quotas"
                        : "Nova Cota"
                  }
                >
                  <Plus className="w-4 h-4" /> Nova
                </Button>
              </DialogTrigger>

              {/* ######## MODAL NOVA COTA (PAI) ######## */}
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Cota</DialogTitle>
                </DialogHeader>

                <div className="mb-4">
                  <label className="block text-sm text-gray-700 mb-1">
                    Questão
                  </label>
                  <Select
                    value={modalQuestionId ? String(modalQuestionId) : ""}
                    onValueChange={(v) => setModalQuestionId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma Questão" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableQuestionsForParent.map((q) => (
                        <SelectItem key={q.id} value={String(q.id)}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {`[Q${q.order ?? ""}] ${q.title || "Sem título"}`}
                            </span>
                            <span className="text-xs text-gray-400">
                              {QUESTION_TYPE_LABELS[q.type] || q.type}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Defina os limites por opção
                  </p>

                  <div className="max-h-[55vh] overflow-y-auto border rounded">
                    {modalLoading && (
                      <div className="p-4 text-center text-gray-500">
                        Carregando opções…
                      </div>
                    )}

                    {!modalLoading && modalQuestionId && modalOptions.length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        Esta pergunta não possui opções.
                      </div>
                    )}

                    {!modalLoading &&
                      modalOptions.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between px-3 py-3 border-b last:border-b-0"
                        >
                          <span className="text-sm">{opt.label}</span>
                          <input
                            type="number"
                            min={0}
                            className="w-20 border rounded px-2 py-1 text-right"
                            value={modalLimits[opt.id] ?? 0}
                            onChange={(e) =>
                              setModalLimits((prev) => ({
                                ...prev,
                                [opt.id]: Number(e.target.value || 0),
                              }))
                            }
                          />
                        </div>
                      ))}
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenDialog(false);
                      setModalQuestionId(null);
                      setModalOptions([]);
                      setModalLimits({});
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={!modalQuestionId || savingQuota}
                    onClick={handleCreateQuota}
                  >
                    {savingQuota ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Salvando…
                      </>
                    ) : (
                      "Salvar"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin text-3xl text-gray-500">
                <FaSpinner />
              </div>
            </div>
          ) : parents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {!selectedQuizId
                ? "Selecione um questionário para gerenciar quotas."
                : "Nenhuma quota criada ainda."}
            </p>
          ) : (
            <ScrollArea className="h-full pr-2">
              {parents.map((parent) => {
                const kids = childrenByParent.get(Number(parent.id)) || [];
                const isOpen = !!expanded[parent.id!];

                return (
                  <div key={parent.id}>
                    {/* LINHA DO PAI */}
                    <div className="flex items-center justify-between border-b py-3">
                      <div className="flex items-start gap-3">
                        {/* setinha */}
                        <button
                          onClick={() => kids.length && toggleExpand(parent.id!)}
                          className="mt-1 text-gray-500 disabled:opacity-40"
                          title={
                            kids.length
                              ? isOpen
                                ? "Recolher"
                                : "Expandir"
                              : "Sem sub-cotas"
                          }
                          disabled={!kids.length}
                        >
                          {kids.length ? (
                            isOpen ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )
                          ) : (
                            <span className="inline-block w-5 h-5" />
                          )}
                        </button>

                        {/* bolinha verde + (abre modal sub-cota) */}
                        <button
                          className="mt-1 w-6 h-6 rounded-full bg-green-600 flex items-center justify-center"
                          title="Adicionar sub-cota"
                          onClick={() => openSubQuotaModal(parent)}
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>

                        {/* textos do pai */}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {(parent as any).option_label ||
                              `Opção #${parent.question_option_id}`}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            [Q] {(parent as any).question_title ?? "Pergunta"}
                          </span>
                        </div>
                      </div>

                      {/* ações pai */}
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm min-w-[36px] text-center">
                          {parent.limit ?? 0}
                        </span>

                        <button
                          onClick={() => handleDeleteQuota(parent.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Excluir quota"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* FILHOS */}
                    {isOpen &&
                      kids.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between border-b py-2 pl-10"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-1 inline-block w-3 h-3 rounded-full bg-gray-300" />
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {(child as any).option_label ||
                                  `Opção #${child.question_option_id}`}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                [Q]{" "}
                                {(child as any).question_title ?? "Pergunta"} •
                                (sub-cota)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm min-w-[36px] text-center">
                              {child.limit ?? 0}
                            </span>

                            <button
                              onClick={() => handleDeleteQuota(child.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Excluir sub-cota"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </section>
      </div>

      {/* ######## MODAL NOVA SUB-COTA ######## */}
      <Dialog open={openSubDialog} onOpenChange={setOpenSubDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nova sub-cota de:{" "}
              <span className="font-semibold">
                {(subParentQuota as any)?.option_label ??
                  `Opção #${subParentQuota?.question_option_id ?? ""}`}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-1">Questão</label>
            <Select
              value={subQuestionId ? String(subQuestionId) : ""}
              onValueChange={(v) => setSubQuestionId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma Questão" />
              </SelectTrigger>
              <SelectContent>
                {allQuestions.map((q) => (
                  <SelectItem key={q.id} value={String(q.id)}>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {`[Q${q.order ?? ""}] ${q.title || "Sem título"}`}
                      </span>
                      <span className="text-xs text-gray-400">
                        {QUESTION_TYPE_LABELS[q.type] || q.type}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">
              Defina os limites por opção
              {subParentQuota && (
                <>
                  {" "}
                  <span className="text-gray-500">
                    (máximo total: {subParentQuota.limit ?? 0})
                  </span>
                </>
              )}
            </p>

            <div className="max-h-[55vh] overflow-y-auto border rounded">
              {subLoading && (
                <div className="p-4 text-center text-gray-500">
                  Carregando opções…
                </div>
              )}

              {!subLoading && subQuestionId && subOptions.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  Esta pergunta não possui opções.
                </div>
              )}

              {!subLoading &&
                subOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="flex items-center justify-between px-3 py-3 border-b last:border-b-0"
                  >
                    <span className="text-sm">{opt.label}</span>
                    <input
                      type="number"
                      min={0}
                      className="w-20 border rounded px-2 py-1 text-right"
                      value={subLimits[opt.id] ?? 0}
                      onChange={(e) =>
                        setSubLimits((prev) => ({
                          ...prev,
                          [opt.id]: Number(e.target.value || 0),
                        }))
                      }
                    />
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpenSubDialog(false);
                setSubParentQuota(null);
                setSubQuestionId(null);
                setSubOptions([]);
                setSubLimits({});
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={!subQuestionId || subSaving}
              onClick={handleCreateSubQuota}
            >
              {subSaving ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Salvando…
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
