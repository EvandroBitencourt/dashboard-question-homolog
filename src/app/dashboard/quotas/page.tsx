"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { listQuestions, listQuestionsByQuiz } from "@/utils/actions/question-data";
import {
  getQuotasByQuiz,
  checkQuestionHasQuotas,
  bulkCreateQuotasForQuestion,
  updateQuotaLimit,
  deleteQuotasByQuestion,
  getAllQuotas,
} from "@/utils/actions/quotas-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listQuestionOptionsByQuestionId } from "@/utils/actions/question-option-data";

// Mapeia os tipos de questão para seus rótulos legíveis
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

  const [openDialog, setOpenDialog] = useState(false);
  const [quotas, setQuotas] = useState<QuotasProps[]>([]);
  const [allQuestions, setAllQuestions] = useState<QuestionProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null
  );
  const [selectedQuestionIdForDetails, setSelectedQuestionIdForDetails] =
    useState<number | null>(null);
  const [savingQuota, setSavingQuota] = useState(false);
  const [questionOptions, setQuestionOptions] = useState<QuestionOptionProps[]>(
    []
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionLimits, setOptionLimits] = useState<Record<number, number>>({});
  const [selectedQuotaId, setSelectedQuotaId] = useState<number | null>(null);

  // Carrega quotas por questionário
  const reloadQuotas = async () => {
    try {
      setLoading(true);
      if (!selectedQuizId) {
        setQuotas([]);
        return;
      }
      const quotasData = await getQuotasByQuiz(selectedQuizId);
      setQuotas(quotasData);
    } catch (error) {
      console.error("Erro ao carregar quotas:", error);
      setQuotas([]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega perguntas que aceitam quotas
  const loadQuestions = async () => {
    try {
      const res = await listQuestions();
      setAllQuestions(res || []);
    } catch (error) {
      console.error("Erro ao carregar perguntas:", error);
      setAllQuestions([]);
    }
  };

  useEffect(() => {
    if (!selectedQuizId) {
      setQuotas([]);
      setAllQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getQuotasByQuiz(selectedQuizId)
      .then((quotasData) => setQuotas(quotasData))
      .catch(() => setQuotas([]))
      .finally(() => setLoading(false));
    listQuestionsByQuiz(selectedQuizId)
      .then((res) => setAllQuestions(res || []))
      .catch(() => setAllQuestions([]));
  }, [selectedQuizId]);

  const availableQuestions = useMemo(() => {
    const used = new Set(quotas.map((q) => q.question_id));
    return allQuestions.filter((q) => !used.has(q.id));
  }, [quotas, allQuestions]);

  const questionsWithQuotas = useMemo(() => {
    const used = new Set(quotas.map((q) => String(q.question_id)));
    return allQuestions.filter((q) => used.has(String(q.id)));
  }, [quotas, allQuestions]);

  const handleCreateQuota = async () => {
    if (!selectedQuizId || !selectedQuestionId) return;

    setSavingQuota(true);
    try {
      const alreadyExists = await checkQuestionHasQuotas(selectedQuestionId);
      if (alreadyExists?.has_quotas) {
        alert("Esta pergunta já possui quotas.");
        return;
      }

      await bulkCreateQuotasForQuestion(selectedQuestionId, selectedQuizId, 0);
      await reloadQuotas();
      setOpenDialog(false);
      setSelectedQuestionId(null);
    } catch (error) {
      console.error("Erro ao criar quotas:", error);
      alert("Erro ao criar quotas.");
    } finally {
      setSavingQuota(false);
    }
  };

  useEffect(() => {
    const fetchOptions = async () => {
      if (!selectedQuestionIdForDetails) return;

      // Só busca opções se houver quotas criadas para a pergunta
      const hasQuotas = quotas.some(
        (q) => q.question_id === selectedQuestionIdForDetails
      );
      if (!hasQuotas) return;

      try {
        setOptionsLoading(true);
        const opts = await listQuestionOptionsByQuestionId(
          selectedQuestionIdForDetails
        );
        setQuestionOptions(opts || []);

        const related = quotas.filter(
          (q) => q.question_id === selectedQuestionIdForDetails
        );
        const limits: Record<number, number> = {};
        related.forEach((q) => {
          if (q.question_option_id) limits[q.question_option_id] = q.limit ?? 0;
        });
        setOptionLimits(limits);
      } catch (error) {
        console.error("Erro ao carregar opções:", error);
        setQuestionOptions([]);
        setOptionLimits({});
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, [selectedQuestionIdForDetails, quotas]);

  const handleLimitChange = async (optionId: number, newLimit: number) => {
    const prev = optionLimits[optionId] || 0;
    setOptionLimits((prevState) => ({ ...prevState, [optionId]: newLimit }));

    try {
      const quota = quotas.find(
        (q) =>
          q.question_option_id === optionId &&
          q.question_id === selectedQuestionIdForDetails
      );
      if (!quota || !quota.id) throw new Error("Quota não encontrada");

      await updateQuotaLimit(quota.id!, newLimit);
      setQuotas((prevState) =>
        prevState.map((q) =>
          q.id === quota.id ? { ...q, limit: newLimit } : q
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar limite:", error);
      alert("Erro ao atualizar limite.");
      setOptionLimits((prevState) => ({ ...prevState, [optionId]: prev }));
    }
  };

  const handleDeleteQuestionQuotas = async (questionId: number) => {
    if (!confirm("Deseja mesmo excluir todas as quotas desta pergunta?"))
      return;
    try {
      await deleteQuotasByQuestion(questionId);
      await reloadQuotas();
      if (selectedQuestionIdForDetails === questionId) {
        setSelectedQuestionIdForDetails(null);
      }
    } catch (error) {
      console.error("Erro ao excluir quotas:", error);
      alert("Erro ao excluir quotas.");
    }
  };
  // Abre o diálogo de criação de quota
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar: questions with quotas */}
        <aside className="w-full sm:w-1/3 border-r bg-white p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg">QUOTAS</h2>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1"
                  onClick={handleOpenDialog}
                  disabled={!selectedQuizId}
                >
                  <Plus className="w-4 h-4" /> Nova
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar quota a uma pergunta</DialogTitle>
                </DialogHeader>
                <div>
                  {availableQuestions.length === 0 ? (
                    <div className="py-8 text-center text-gray-400">
                      {allQuestions.length === 0
                        ? "Nenhuma pergunta de múltipla/única escolha encontrada neste quiz."
                        : "Todas as perguntas já possuem quota."}
                    </div>
                  ) : (
                    <Select
                      value={
                        selectedQuestionId ? String(selectedQuestionId) : ""
                      }
                      onValueChange={(value) => {
                        const questionId = Number(value);
                        console.log("Pergunta selecionada:", questionId);
                        setSelectedQuestionId(questionId);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a pergunta" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableQuestions.map((q) => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {q.title || "Sem título"}
                              </span>
                              <span className="text-xs text-gray-400">
                                {QUESTION_TYPE_LABELS[q.type]}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenDialog(false);
                      setSelectedQuestionId(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    disabled={
                      !selectedQuestionId ||
                      savingQuota ||
                      availableQuestions.length === 0
                    }
                    onClick={handleCreateQuota}
                  >
                    {savingQuota ? (
                      <>
                        <FaSpinner className="animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      "Adicionar"
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
          ) : questionsWithQuotas.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {!selectedQuizId
                ? "Selecione um questionário para gerenciar quotas."
                : "Nenhuma quota criada ainda."}
            </p>
          ) : (
            <ScrollArea className="h-full pr-2">
              {quotas.map((quota, idx) => (
                <div
                  key={quota.id}
                  className={`p-3 border rounded mb-2 cursor-pointer transition-colors ${
                    selectedQuotaId === quota.id
                      ? "bg-orange-100 border-orange-500"
                      : "bg-white hover:bg-slate-100"
                  }`}
                  onClick={() => setSelectedQuotaId(quota.id ?? null)}
                >
                  <p className="font-medium">{`Quota ${idx + 1}`}</p>
                  <p className="text-sm text-gray-500 truncate">
                    Pergunta: {allQuestions.find(q => q.id === quota.question_id)?.title || "?"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Opção ID: {quota.question_option_id}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Limite: {quota.limit} | Usado: {quota.current_count}
                  </p>
                </div>
              ))}
            </ScrollArea>
          )}
        </aside>

        {/* Quota details */}
        <section className="flex-1 p-6 overflow-y-auto">
          <h3 className="font-semibold text-xl mb-4">Detalhes da Quota</h3>
          {!selectedQuotaId ? (
            <div className="text-gray-400 italic text-center py-20">
              Selecione uma quota para editar.
            </div>
          ) : (
            (() => {
              const quota = quotas.find(q => q.id === selectedQuotaId);
              if (!quota) return null;
              const question = allQuestions.find(q => q.id === quota.question_id);
              return (
                <div className="space-y-4">
                  <div>
                    <div className="font-bold">Pergunta:</div>
                    <div>{question?.title || "?"}</div>
                  </div>
                  <div>
                    <div className="font-bold">Opção ID:</div>
                    <div>{quota.question_option_id}</div>
                  </div>
                  <div>
                    <div className="font-bold">Limite:</div>
                    <input
                      type="number"
                      min={0}
                      value={quota.limit ?? 0}
                      onChange={async (e) => {
                        const newLimit = Number(e.target.value);
                        await updateQuotaLimit(quota.id!, newLimit);
                        setQuotas((prev) =>
                          prev.map((q) =>
                            q.id === quota.id ? { ...q, limit: newLimit } : q
                          )
                        );
                      }}
                      className="border rounded px-2 py-1 w-24"
                    />
                  </div>
                  <div>
                    <div className="font-bold">Usado:</div>
                    <div>{quota.current_count}</div>
                  </div>
                </div>
              );
            })()
          )}
        </section>
      </div>
    </main>
  );
}
