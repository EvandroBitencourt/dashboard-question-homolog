"use client";

import { useQuiz } from "@/context/QuizContext"; // <-- adicionar aqui

import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash } from "lucide-react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import {
  listQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  updateQuizStatusOnly,
} from "@/utils/actions/quizzes-data";
import { quizzesProps } from "@/utils/types/quizzes";

import Swal from "sweetalert2";
import Link from "next/link";

const quizSchema = z.object({
  title: z.string().min(3, "O título é obrigatório"),
  end_date: z.string().min(1, "A data de término é obrigatória"),
  max_sample: z.coerce.number().nullable().optional(),
  status: z.enum(["active", "test", "disabled"]),
  change_level: z.string().nullable().optional(),
  value_ns_nr: z.coerce.number(),
  value_skipped: z.coerce.number(),
  value_blank: z.string(),
  bar_color: z.string(),
  text_color: z.string(),
  logo_path: z.string().nullable().optional(),
  allow_over_sample: z.coerce.boolean(),
  allow_continued_collection: z.coerce.boolean(),
  is_online: z.coerce.boolean(),
  digitization_mode: z.coerce.boolean(),
});

type QuizFormData = z.infer<typeof quizSchema>;

export default function Quizzes() {
  const { selectedQuizId, setSelectedQuizId, setSelectedQuizTitle } = useQuiz();

  const [quizzes, setQuizzes] = useState<quizzesProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<quizzesProps | null>(null);

  const fetchQuizzes = async () => {
    setLoading(true);
    const data = await listQuizzes();
    if (data) setQuizzes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const defaultValues: QuizFormData = {
    title: "",
    end_date: "",
    max_sample: null,
    status: "test",
    change_level: null,
    value_ns_nr: 99,
    value_skipped: 0,
    value_blank: "#",
    bar_color: "#2196F3",
    text_color: "#000000",
    logo_path: "",
    allow_over_sample: false,
    allow_continued_collection: false,
    is_online: false,
    digitization_mode: false,
  };

  const createForm = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues,
  });

  const editForm = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues,
  });

  const statusValue = editForm.watch("status");
  const changeLevelValue = editForm.watch("change_level");

  const handleOpenEditModal = (quiz: quizzesProps) => {
    setSelectedQuiz(quiz);

    // Converte corretamente valores para booleano
    const normalizeBoolean = (val: any) =>
      val === true || val === "true" || val === 1 || val === "1";

    editForm.reset({
      title: quiz.title,
      end_date: quiz.end_date?.toString().split("T")[0] || "",
      max_sample: quiz.max_sample,
      status:
        quiz.status === "active" || quiz.status === "test"
          ? quiz.status
          : "test",

      change_level:
        quiz.status === "active" ? quiz.change_level ?? "low" : null,
      value_ns_nr: quiz.value_ns_nr,
      value_skipped: quiz.value_skipped,
      value_blank: quiz.value_blank.toString(),
      bar_color: quiz.bar_color,
      text_color: quiz.text_color,
      logo_path: quiz.logo_path ?? "",

      allow_over_sample: normalizeBoolean(quiz.allow_over_sample),
      allow_continued_collection: normalizeBoolean(
        quiz.allow_continued_collection
      ),
      is_online: normalizeBoolean(quiz.is_online),
      digitization_mode: normalizeBoolean(quiz.digitization_mode),
    });

    setEditModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: `Deseja excluir o quiz ${id}?`,
      text: "Essa ação não poderá ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteQuiz(id);
        await fetchQuizzes();
        Swal.fire("Excluído!", "O quiz foi removido com sucesso.", "success");
      } catch {
        Swal.fire("Erro", "Erro ao excluir quiz.", "error");
      }
    }
  };

  const handleCreateSubmit = async (data: QuizFormData) => {
    try {
      // Transforma os campos booleanos em 0 ou 1
      const payload = {
        ...data,
        allow_over_sample: data.allow_over_sample ? 1 : 0,
        allow_continued_collection: data.allow_continued_collection ? 1 : 0,
        is_online: data.is_online ? 1 : 0,
        digitization_mode: data.digitization_mode ? 1 : 0,
      };

      await createQuiz(payload as any); // ou ajustar a tipagem se necessário
      toast.success("Quiz criado com sucesso!");
      fetchQuizzes();
      setCreateModalOpen(false);
      createForm.reset();
    } catch {
      toast.error("Erro ao criar quiz.");
    }
  };

  const handleEditSubmit = async (data: QuizFormData) => {
    if (!selectedQuiz) return;

    try {
      // Converte campos booleanos para 0 ou 1 antes de enviar ao backend
      const payload = {
        ...data,
        allow_over_sample: data.allow_over_sample ? 1 : 0,
        allow_continued_collection: data.allow_continued_collection ? 1 : 0,
        is_online: data.is_online ? 1 : 0,
        digitization_mode: data.digitization_mode ? 1 : 0,
      };

      await updateQuiz(selectedQuiz.id, payload as any); // ou ajustar a tipagem se preferir
      toast.success("Quiz atualizado!");
      fetchQuizzes();
      setEditModalOpen(false);
    } catch {
      toast.error("Erro ao atualizar quiz.");
    }
  };

  const renderExtraFields = (
    form: ReturnType<typeof useForm<QuizFormData>>
  ) => <></>;

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between border-b pb-3 mb-5">
        <h1 className="text-2xl font-semibold text-gray-800">
          Gerenciar Questionários
        </h1>
        <div className="flex items-center justify-center">
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#e74e15] text-white hover:bg-[#3e3e3e]">
                <Plus className="w-4 h-4" /> ADICIONAR
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px]  max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-bold">
                  Criar Novo Questionário
                </DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form
                  onSubmit={createForm.handleSubmit(handleCreateSubmit)}
                  className="space-y-4"
                >
                  <h3 className="font-semibold">
                    Informações Básicas do Formulário
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="title"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título do formulário</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="max_sample"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Máx.Amostra(s)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="end_date"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data Final</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      name="status"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modo</FormLabel>
                          <FormControl>
                            <select {...field} className="input" disabled>
                              <option value="test">Teste</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* <FormField
                      name="change_level"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Alteração</FormLabel>
                          <FormControl>
                            <select {...field} className="input" disabled>
                              <option value="">Selecione</option>
                            </select>
                          </FormControl>
                        </FormItem>
                      )}
                    /> */}
                  </div>
                  <h3 className="font-semibold">
                    Padronize os Valores das Questões
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      name="value_ns_nr"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor NS/NR</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="value_skipped"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Pulado</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="value_blank"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor em Branco</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <h3 className="font-bold">Estilos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      name="bar_color"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor da Barra</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      name="text_color"
                      control={createForm.control}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor do Texto</FormLabel>
                          <FormControl>
                            <Input type="color" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    name="logo_path"
                    control={createForm.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo (URL)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <h3 className="font-semibold">Adicionais</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: "Exceder Amostra", name: "allow_over_sample" },
                      {
                        label: "Continuar Coleta",
                        name: "allow_continued_collection",
                      },
                      { label: "Online", name: "is_online" },
                      { label: "Modo Digitação", name: "digitization_mode" },
                    ].map(({ label, name }) => (
                      <FormField
                        key={name}
                        name={name as keyof QuizFormData}
                        control={createForm.control}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel>{label}</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={Boolean(field.value)}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>

                  {renderExtraFields(createForm)}
                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    PUBLICAR
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin text-3xl text-gray-500">
            <FaSpinner />
          </div>
        </div>
      ) : quizzes.length > 0 ? (
        <ul className="space-y-2">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              onClick={() => {
                setSelectedQuizId(quiz.id);
                setSelectedQuizTitle(quiz.title);
              }}
              className={`cursor-pointer bg-white p-4 border rounded-md shadow-sm hover:shadow transition flex justify-between items-center ${selectedQuizId === quiz.id ? "border-2 border-[#e74e15]" : ""
                }`}
            >
              <div>
                <h3 className="font-bold text-lg">{quiz.title}</h3>
                <p className="text-sm text-gray-600">
                  Finaliza em: {new Date(quiz.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpenEditModal(quiz)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Editar Quiz</DialogTitle>
                      <DialogDescription>
                        <Link className="text-blue-500 font-medium" href={'#'} target="_blank">Clique aqui para acessar o LINK DO FORMULÁRIO ONLINE</Link>
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...editForm}>
                      <form
                        onSubmit={editForm.handleSubmit(handleEditSubmit)}
                        className="space-y-4"
                      >
                        <h3 className="font-semibold">
                          Informações Básicas do Formulário
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            name="title"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Título do formulário</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            name="max_sample"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Máx. Amostra(s)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    value={field.value ?? ""}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            name="end_date"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data Final</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="status"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Modo</FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="input"
                                    onChange={async (e) => {
                                      const newValue = e.target.value;

                                      // Confirmação ao ativar
                                      if (
                                        field.value === "test" &&
                                        newValue === "active" &&
                                        selectedQuiz?.id
                                      ) {
                                        setEditModalOpen(false);

                                        const result = await Swal.fire({
                                          title: "Confirma?",
                                          text: "Quando o modo do questionário for modificado para ATIVO não pode voltar mais para o modo TESTE.",
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonText: "Sim, confirmar",
                                          cancelButtonText: "Cancelar",
                                        });

                                        if (result.isConfirmed) {
                                          try {
                                            await updateQuizStatusOnly(
                                              selectedQuiz.id,
                                              "active",
                                              "low"
                                            );

                                            field.onChange("active");
                                            editForm.setValue(
                                              "change_level",
                                              "low"
                                            );
                                            toast.success(
                                              "Status atualizado para ATIVO com sucesso!"
                                            );
                                          } catch (err) {
                                            console.error(err);
                                            toast.error(
                                              "Erro ao atualizar status."
                                            );
                                            field.onChange("test");
                                          }
                                        } else {
                                          field.onChange("test");
                                        }

                                        setTimeout(
                                          () => setEditModalOpen(true),
                                          100
                                        );
                                        return;
                                      }

                                      // Apenas troca o status (inclusive para desabilitado)
                                      field.onChange(newValue);
                                    }}
                                  >
                                    {field.value === "test" && (
                                      <option value="test">Teste</option>
                                    )}
                                    <option value="active">Ativo</option>
                                    {field.value === "active" ||
                                      field.value === "disabled" ? (
                                      <option value="disabled">
                                        Desabilitado
                                      </option>
                                    ) : null}
                                  </select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="change_level"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nível de Alteração</FormLabel>
                                <FormControl>
                                  <select
                                    name={field.name}
                                    ref={field.ref}
                                    className="input"
                                    disabled={
                                      editForm.watch("status") !== "active"
                                    }
                                    value={field.value ?? ""} // <- garante que nunca será `null`
                                    onBlur={field.onBlur}
                                    onChange={async (e) => {
                                      const newValue = e.target.value;
                                      const currentValue = field.value;

                                      if (newValue === currentValue) return;

                                      if (
                                        (currentValue === "low" &&
                                          newValue === "high") ||
                                        (currentValue === "high" &&
                                          newValue === "low")
                                      ) {
                                        setEditModalOpen(false); // fecha o modal principal

                                        const confirmText =
                                          newValue === "high"
                                            ? "Mudar o nível de alterações de BAIXO para ALTO, permitirá que o questionário seja completamente alterado, mas não será possível gerar cruzamentos entre diferentes revisões. Confirma?"
                                            : "Mudar o nível de alterações de ALTO para BAIXO, impedirá alterações estruturais no questionário, mas permitirá cruzamentos de dados entre diferentes revisões. Confirma?";

                                        const result = await Swal.fire({
                                          title: "Confirma?",
                                          text: confirmText,
                                          icon: "warning",
                                          showCancelButton: true,
                                          confirmButtonText: "OK",
                                          cancelButtonText: "Cancelar",
                                        });

                                        if (result.isConfirmed) {
                                          field.onChange(newValue);
                                        } else {
                                          field.onChange(currentValue);
                                        }

                                        setTimeout(() => {
                                          setEditModalOpen(true); // reabre modal
                                        }, 100);
                                      } else {
                                        field.onChange(newValue);
                                      }
                                    }}
                                  >
                                    <option value="">Selecione</option>
                                    <option value="low">Baixo</option>
                                    <option value="high">Alto</option>
                                  </select>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <h3 className="font-semibold">
                          Padronize os Valores das Questões
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <FormField
                            name="value_ns_nr"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor NS/NR</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="value_skipped"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor Pulado</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="value_blank"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Valor em Branco</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <h3 className="font-bold">Estilos</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            name="bar_color"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor da Barra</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            name="text_color"
                            control={editForm.control}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Cor do Texto</FormLabel>
                                <FormControl>
                                  <Input type="color" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          name="logo_path"
                          control={editForm.control}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logo (URL)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  value={field.value ?? ""}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <h3 className="font-semibold">Adicionais</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              key: "allow_over_sample",
                              label: "Exceder Amostra",
                            },
                            {
                              key: "allow_continued_collection",
                              label: "Continuar Coleta",
                            },
                            { key: "is_online", label: "Online" },
                            {
                              key: "digitization_mode",
                              label: "Modo Digitação",
                            },
                          ].map(({ key, label }) => (
                            <FormField
                              key={key}
                              name={key as keyof QuizFormData}
                              control={editForm.control}
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel>{label}</FormLabel>
                                  <FormControl>
                                    <Switch
                                      checked={Boolean(field.value)}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>

                        {renderExtraFields(editForm)}

                        <Button
                          type="submit"
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Salvar alterações
                        </Button>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDelete(quiz.id)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Nenhum questionário encontrado.</p>
      )}
    </div>
  );
}
