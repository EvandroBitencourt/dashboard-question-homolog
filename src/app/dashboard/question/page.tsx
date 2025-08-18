// Question.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "lucide-react";
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
import { QuestionProps, QuestionWithOptions } from "@/utils/types/question";
import { FaSpinner } from "react-icons/fa";
import { createQuestionOption } from "@/utils/actions/question-option-data";
import SingleChoiceForm from "@/app/components/SingleChoiceForm";
import MultipleChoiceForm from "@/app/components/MultipleChoiceForm";
import QuestionActions from "./QuestionActions";

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

// Utility function to generate UUID
function generateFallbackUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
// Convert numeric values back to booleans for frontend state
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
// Switch component for boolean fields
type SwitchFieldProps = {
  label: string;
  value: boolean;
  onChange: (newValue: boolean) => void;
  disabled?: boolean;
};

function SwitchField({
  label,
  value,
  onChange,
  disabled = false,
}: SwitchFieldProps) {
  const handleClick = () => {
    if (disabled) return;
    const newValue = !value;
    onChange(newValue);
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
      <label
        className={`text-sm ${disabled ? "text-gray-400" : "text-gray-700"}`}
      >
        {label} <span className="text-xs text-gray-400"></span>
      </label>
    </div>
  );
}

export default function Question() {
  const { selectedQuizId } = useQuiz();
  const [openDialog, setOpenDialog] = useState(false);
  const [questionType, setQuestionType] = useState<QuestionProps["type"] | "">(
    ""
  );
  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(
    null
  );
  const [selectedQuestionFull, setSelectedQuestionFull] =
    useState<QuestionWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [localTitle, setLocalTitle] = useState("");
  const [localVariable, setLocalVariable] = useState(""); // Novo estado para variable

  useEffect(() => {
    setLocalTitle(selectedQuestionFull?.question.title || "");
    setLocalVariable(selectedQuestionFull?.question.variable || ""); // Sincroniza variable
  }, [
    selectedQuestionFull?.question.title,
    selectedQuestionFull?.question.variable,
  ]);

  const questionTypeOptions = useMemo(
    () =>
      Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({
        value: value as QuestionProps["type"],
        label,
      })),
    []
  );

  useEffect(() => {
    if (!selectedQuizId) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listQuestionsByQuiz(selectedQuizId)
      .then((res) => {
        if (res) {
          // Ensure boolean conversion for all questions
          const convertedQuestions = res.map(convertBooleansFromBackend);
          setQuestions(convertedQuestions);
        }
      })
      .catch(() => {
        setQuestions([]);
      })
      .finally(() => setLoading(false));
  }, [selectedQuizId]);

  // Load selected question details
  useEffect(() => {
    if (!selectedQuestionId) {
      setSelectedQuestionFull(null);
      return;
    }

    getQuestionWithOptions(selectedQuestionId)
      .then((data) => {
        if (data) {
          // Ensure proper boolean conversion from backend
          const convertedQuestion = convertBooleansFromBackend(data.question);
          setSelectedQuestionFull({
            ...data,
            question: convertedQuestion,
          });
        }
      })
      .catch(() => {
        setSelectedQuestionFull(null);
      });
  }, [selectedQuestionId]);

  // Create new question
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

      // Create default option for the new question
      await createQuestionOption({
        question_id: newQuestion.id,
        label: "",
        value: "",
        is_open: false,
        is_exclusive: false,
        is_nsnr: false,
        sort_order: 0,
      });

      // Convert booleans and add to questions list
      const convertedQuestion = convertBooleansFromBackend(newQuestion);
      setQuestions((prev) => [...prev, convertedQuestion]);
      setOpenDialog(false);
      setQuestionType("");
      setSelectedQuestionId(newQuestion.id);
    } catch {
      // noop
    }
  }, [selectedQuizId, questionType]);

  // Update question with proper state management
  const handleUpdateQuestion = useCallback(
    async (fields: Partial<QuestionProps>) => {
      if (!selectedQuestionFull || updateLoading) return;

      setUpdateLoading(true);

      try {
        const updated = await updateQuestion(
          selectedQuestionFull.question.id,
          fields
        );

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

            return {
              ...prev,
              question: updatedQuestion,
            };
          });

          if (fields.title !== undefined) {
            setQuestions((prev) =>
              prev.map((q) =>
                q.id === selectedQuestionFull.question.id
                  ? { ...q, title: fields.title ?? "" }
                  : q
              )
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

        setQuestions((prev) =>
          prev.filter((q) => q.id !== selectedQuestionFull.question.id)
        );

        setSelectedQuestionId(null);
        setSelectedQuestionFull(null);

        Swal.fire("Excluído!", "A questão foi removida com sucesso.", "success");
      } catch {
        Swal.fire("Erro", "Não foi possível excluir a questão.", "error");
      }
    }
  };

  // Debounced title update
  const [titleUpdateTimeout, setTitleUpdateTimeout] =
    useState<NodeJS.Timeout | null>(null);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setSelectedQuestionFull((prev) =>
        prev
          ? {
            ...prev,
            question: { ...prev.question, title: newTitle },
          }
          : prev
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
      if (titleUpdateTimeout) clearTimeout(titleUpdateTimeout);
    };
  }, [titleUpdateTimeout]);

  return (
    <main className="pt-[80px] sm:pl-[190px]">
      {/* ✅ mobile empilha; desktop mantém duas colunas */}
      <div className="flex md:flex-row flex-col h-[calc(100vh-80px)]">
        {/* Questions Sidebar */}
        <aside className="md:w-1/3 w-full md:border-r border-b bg-white md:p-4 p-3 md:h-auto h-[48vh] flex flex-col">
          <div className="flex items-center justify-between md:mb-4 mb-3 sticky top-0 z-10 bg-white pb-2">
            <h2 className="font-bold text-lg">QUESTÕES</h2>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button size="sm" variant="default" className="gap-1">
                  <Plus className="w-4 h-4" /> Nova
                </Button>
              </DialogTrigger>
              {/* ✅ cabe melhor no mobile */}
              <DialogContent className="sm:max-w-md w-[95vw] max-w-none">
                <DialogHeader>
                  <DialogTitle>Selecionar tipo de questão</DialogTitle>
                </DialogHeader>
                <Select
                  value={questionType}
                  onValueChange={(value) =>
                    setQuestionType(value as QuestionProps["type"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de questão" />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypeOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenDialog(false);
                      setQuestionType("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateQuestion} disabled={!questionType}>
                    Selecionar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ✅ rola só a lista no mobile */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin text-3xl text-gray-500">
                <FaSpinner />
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-2">
              {questions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma pergunta encontrada.
                </p>
              ) : (
                questions.map((q, index) => (
                  <div
                    key={q.id}
                    className={`p-3 border rounded mb-2 cursor-pointer transition-colors ${selectedQuestionId === q.id
                        ? "bg-orange-100 border-orange-500"
                        : "bg-white hover:bg-slate-100"
                      }`}
                    onClick={() => setSelectedQuestionId(q.id)}
                  >
                    <p className="font-medium">{`Q${index + 1}`}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {q.title || "Sem título"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {QUESTION_TYPE_LABELS[q.type]}
                    </p>
                  </div>
                ))
              )}
            </ScrollArea>
          )}
        </aside>

        {/* Question Details */}
        <section className="flex-1 md:p-6 p-4 overflow-y-auto md:h-auto h-[52vh]">
          {selectedQuestionFull && <QuestionActions />}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-xl">Detalhes da Questão</h3>
            <button
              onClick={handleStaticDelete}
              className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-red-100 transition"
            >
              <Trash className="w-6 h-6 text-red-600" />
            </button>
          </div>

          {selectedQuestionFull ? (
            <div className="space-y-6">
              {/* Question Configuration */}
              <div className="space-y-4 border rounded p-4">
                <h4 className="font-medium text-lg mb-3">Configurações</h4>

                {/* Title Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Título da Questão
                  </label>
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

                {/* Variable Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Variável
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    value={localVariable}
                    onChange={(e) => setLocalVariable(e.target.value)}
                    onBlur={() => {
                      if (
                        localVariable !==
                        selectedQuestionFull?.question.variable
                      ) {
                        handleUpdateQuestion({ variable: localVariable });
                      }
                    }}
                    placeholder="Digite a variável"
                    disabled={updateLoading}
                  />
                </div>

                {/* Boolean Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <SwitchField
                    label="Campo obrigatório"
                    value={selectedQuestionFull.question.is_required}
                    onChange={(val) =>
                      handleUpdateQuestion({ is_required: val })
                    }
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
                    onChange={(val) =>
                      handleUpdateQuestion({ is_readonly: val })
                    }
                    disabled={updateLoading}
                  />
                  {(selectedQuestionFull.question.type === "single_choice" ||
                    selectedQuestionFull.question.type ===
                    "multiple_choice") && (
                      <SwitchField
                        label="Embaralhar opções"
                        value={selectedQuestionFull.question.shuffle_options}
                        onChange={(val) =>
                          handleUpdateQuestion({ shuffle_options: val })
                        }
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

              {/* Question Options */}
              {selectedQuestionFull.question.type === "multiple_choice" && (
                <div className="border rounded p-4">
                  <h4 className="font-medium text-lg mb-3">
                    Configurações multipla escolha:
                  </h4>
                  <MultipleChoiceForm
                    question={selectedQuestionFull.question}
                    options={selectedQuestionFull.options || []}
                    onOptionsChange={(updated) => {
                      setSelectedQuestionFull((prev) =>
                        prev ? { ...prev, options: updated } : prev
                      );
                    }}
                  />
                </div>
              )}
              <div className="border rounded p-4">
                <h4 className="font-medium text-lg mb-3">
                  Opções ({selectedQuestionFull.options.length})
                </h4>
                {(selectedQuestionFull.question.type === "single_choice" ||
                  selectedQuestionFull.question.type === "multiple_choice") && (
                    <SingleChoiceForm
                      question={selectedQuestionFull.question}
                      options={selectedQuestionFull.options || []}
                      onOptionsChange={(updated) => {
                        setSelectedQuestionFull((prev) =>
                          prev ? { ...prev, options: updated } : prev
                        );
                      }}
                    />
                  )}
                {selectedQuestionFull.question.type !== "single_choice" &&
                  selectedQuestionFull.question.type !== "multiple_choice" && (
                    <div className="text-gray-500 italic py-8 text-center">
                      Opções para tipo "
                      {QUESTION_TYPE_LABELS[selectedQuestionFull.question.type]}
                      " ainda não implementado.
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 italic text-center py-20">
              Selecione uma questão para editar seus detalhes.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
