"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
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

  // ====== Modal “Nova Cota” ======
  const [openDialog, setOpenDialog] = useState(false);
  const [savingQuota, setSavingQuota] = useState(false);

  // pergunta escolhida no modal
  const [modalQuestionId, setModalQuestionId] = useState<number | null>(null);
  // opções da pergunta escolhida
  const [modalOptions, setModalOptions] = useState<QuestionOptionProps[]>([]);
  // limites digitados por opção
  const [modalLimits, setModalLimits] = useState<Record<number, number>>({});
  const [modalLoading, setModalLoading] = useState(false);

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

  // perguntas que AINDA não têm nenhuma quota (para o seletor do modal)
  // perguntas disponíveis para criar cota
  const availableQuestions = useMemo(() => {
    const used = new Set(quotas.map((q) => Number(q.question_id)));
    return allQuestions.filter((q) => !used.has(Number(q.id)));
  }, [quotas, allQuestions]);

  // perguntas que já têm quota (para listagem/UX)
  const questionsWithQuotas = useMemo(() => {
    const used = new Set(quotas.map((q) => Number(q.question_id)));
    return allQuestions.filter((q) => used.has(Number(q.id)));
  }, [quotas, allQuestions]);


  // ====================== MODAL: abrir/reset ======================
  const handleOpenDialog = () => {
    setOpenDialog(true);
    setModalQuestionId(null);
    setModalOptions([]);
    setModalLimits({});
  };

  // quando mudar a pergunta no modal, busca SOMENTE as opções dela
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

  // ====================== CRIAR COTA (bulk + patch limites) ======================
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
      await bulkCreateQuotasForQuestion(Number(modalQuestionId), Number(selectedQuizId), 0);

      // carrega quotas do quiz e filtra por ESTA pergunta (CAST!)
      const all = await getQuotasByQuiz(Number(selectedQuizId));
      const createdForThisQuestion = all.filter(
        (q) => Number(q.question_id) === Number(modalQuestionId)
      );

      // mapeia por question_option_id (CAST!)
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


  // ====================== EXCLUIR QUOTA INDIVIDUAL ======================
  const handleDeleteQuota = async (quotaId?: number) => {
    if (!quotaId) return;
    if (!confirm("Excluir esta quota?")) return;
    await deleteQuota(quotaId);
    await reloadQuotas();
  };

  // ===== Ordena por pergunta e por opção (fica organizado como no modelo) =====
  const sortedQuotas = useMemo(() => {
    const copy = [...quotas];
    copy.sort((a, b) => {
      if (a.question_id !== b.question_id) return a.question_id - b.question_id;
      return Number(a.question_option_id) - Number(b.question_option_id);
    });
    return copy;
  }, [quotas]);

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="flex h-[calc(100vh-80px)]">
        {/* LISTA ÚNICA – igual ao modelo */}
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
                  disabled={!selectedQuizId || availableQuestions.length === 0}
                  title={
                    !selectedQuizId
                      ? "Selecione um questionário"
                      : availableQuestions.length === 0
                        ? "Todas as perguntas já possuem quotas"
                        : "Nova Cota"
                  }
                >
                  <Plus className="w-4 h-4" /> Nova
                </Button>
              </DialogTrigger>

              {/* ######## MODAL NOVA COTA ######## */}
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nova Cota</DialogTitle>
                </DialogHeader>

                {/* seleção da pergunta (somente as que ainda não têm quota) */}
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
                      {availableQuestions.map((q) => (
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

                {/* lista de opções – SOMENTE da pergunta escolhida */}
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
          ) : sortedQuotas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {!selectedQuizId
                ? "Selecione um questionário para gerenciar quotas."
                : "Nenhuma quota criada ainda."}
            </p>
          ) : (
            <ScrollArea className="h-full pr-2">
              {sortedQuotas.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between border-b last:border-b-0 py-3 group"
                >
                  <div className="flex items-start gap-3">
                    {/* bolinha verde com + */}
                    <div className="mt-1">
                      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* textos */}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {(q as any).option_label || `Opção #${q.question_option_id}`}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        [Q] {(q as any).question_title ?? "Pergunta"}
                      </span>
                    </div>
                  </div>

                  {/* ações à direita: badge azul + lixeira */}
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm min-w-[36px] text-center">
                      {q.limit ?? 0}
                    </span>

                    <button
                      onClick={() => handleDeleteQuota(q.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Excluir quota"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </ScrollArea>
          )}
        </section>
      </div>
    </main>
  );
}
