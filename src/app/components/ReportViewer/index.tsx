"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import {
  useDeleteReport,
  useReportDataset,
  useReportsList,
  useUpdateReport,
} from "@/hooks/use-reports";
import { ApiHttpError } from "@/services/reports.service";
import { ReportDatasetAnswer } from "@/types/report";

type ReportViewerProps = {
  reportId: string;
  quizId?: number;
};

type QuestionSummary = {
  questionId: string;
  title: string;
  total: number;
  options: Array<{
    label: string;
    count: number;
    percent: number;
  }>;
};

const COLORS = [
  "#E74E15",
  "#f0642b",
  "#f27a4a",
  "#f5966f",
  "#f8b39a",
  "#fad1c2",
  "#9CA3AF",
  "#6B7280",
];

const editSchema = z.object({
  title: z.string().min(3, "Informe ao menos 3 caracteres."),
  subtitle: z.string().max(180, "Use até 180 caracteres.").optional(),
  status: z.string().min(1, "Informe o status."),
});

type EditFormValues = z.infer<typeof editSchema>;

function extractApiError(error: unknown) {
  if (error instanceof ApiHttpError) return `${error.message} (HTTP ${error.status})`;
  if (error instanceof Error) return error.message;
  return "Falha inesperada";
}

function normalizeAnswerLabel(answer: ReportDatasetAnswer): string {
  if (answer.option_label) return String(answer.option_label);
  if (answer.value_text) return String(answer.value_text);
  if (typeof answer.value_bool === "boolean") return answer.value_bool ? "Sim" : "Não";
  if (answer.value_number !== null && answer.value_number !== undefined) return String(answer.value_number);
  if (answer.option_value !== null && answer.option_value !== undefined) return String(answer.option_value);
  if (answer.value !== null && answer.value !== undefined) return String(answer.value);
  return "Sem resposta";
}

function buildQuestionsSummary(answers: ReportDatasetAnswer[]): QuestionSummary[] {
  const byQuestion = new Map<
    string,
    {
      questionId: string;
      title: string;
      total: number;
      options: Map<string, number>;
    }
  >();

  for (const answer of answers) {
    const questionId = String(answer.question_id ?? "-");
    const title = answer.question_title || `Pergunta ${questionId}`;
    const optionLabel = normalizeAnswerLabel(answer);

    if (!byQuestion.has(questionId)) {
      byQuestion.set(questionId, {
        questionId,
        title,
        total: 0,
        options: new Map<string, number>(),
      });
    }

    const question = byQuestion.get(questionId);
    if (!question) continue;

    question.total += 1;
    question.options.set(optionLabel, (question.options.get(optionLabel) || 0) + 1);
  }

  return Array.from(byQuestion.values())
    .map((item) => {
      const options = Array.from(item.options.entries())
        .map(([label, count]) => ({
          label,
          count,
          percent: item.total > 0 ? (count / item.total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        questionId: item.questionId,
        title: item.title,
        total: item.total,
        options,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function formatStatus(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "finalized") return "Finalizado";
  if (normalized === "draft") return "Rascunho";
  return status || "-";
}

export default function ReportViewer({ reportId, quizId }: ReportViewerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedQuizId, selectedQuizTitle } = useQuiz();

  const queryQuizId = searchParams.get("quizId");
  const effectiveQuizId = quizId || (queryQuizId ? Number(queryQuizId) : selectedQuizId);
  const numericReportId = Number(reportId);

  const [editOpen, setEditOpen] = useState(false);

  const reportsQuery = useReportsList(effectiveQuizId);
  const datasetQuery = useReportDataset(effectiveQuizId, numericReportId);
  const updateMutation = useUpdateReport(effectiveQuizId, numericReportId);
  const deleteMutation = useDeleteReport(effectiveQuizId);

  const report = useMemo(
    () => reportsQuery.data?.items?.find((item) => Number(item.id) === numericReportId),
    [reportsQuery.data, numericReportId]
  );

  const interviews = datasetQuery.data?.interviews ?? [];

  const flattenedAnswers = useMemo(
    () => interviews.flatMap((interview) => interview.answers ?? []),
    [interviews]
  );

  const questions = useMemo(() => buildQuestionsSummary(flattenedAnswers), [flattenedAnswers]);

  const totalInterviews = interviews.length;
  const interviewsWithSummary = useMemo(
    () => interviews.filter((item) => Boolean(item.summary && item.summary.trim())).length,
    [interviews]
  );
  const totalAnswers = flattenedAnswers.length;

  const topQuestionsChartData = useMemo(
    () => questions.slice(0, 8).map((question) => ({ name: question.title, total: question.total })),
    [questions]
  );

  const mainQuestion = questions[0];
  const pieData = useMemo(
    () =>
      (mainQuestion?.options ?? []).slice(0, 8).map((option) => ({
        name: option.label,
        value: option.count,
      })),
    [mainQuestion]
  );

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    values: {
      title: report?.title || "",
      subtitle: report?.subtitle || "",
      status: report?.status || "draft",
    },
  });

  const handleRetry = () => {
    reportsQuery.refetch();
    datasetQuery.refetch();
  };

  const handleDelete = async () => {
    if (!effectiveQuizId) return;
    const confirmed = window.confirm("Deseja excluir este relatório?");
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(numericReportId);
      toast.success("Relatório excluído.");
      if (quizId) {
        router.push(`/questionarios/${quizId}/relatorios`);
      } else {
        router.push("/dashboard/generate-report");
      }
    } catch (error) {
      toast.error(`Erro ao excluir: ${extractApiError(error)}`);
    }
  };

  const handleUpdate = form.handleSubmit(async (values) => {
    try {
      await updateMutation.mutateAsync({
        title: values.title,
        subtitle: values.subtitle?.trim() || undefined,
        status: values.status,
      });
      toast.success("Relatório atualizado.");
      setEditOpen(false);
      reportsQuery.refetch();
    } catch (error) {
      toast.error(`Erro ao atualizar: ${extractApiError(error)}`);
    }
  });

  if (!effectiveQuizId) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] pt-[80px] sm:pl-[190px]">
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-4">
          <p className="text-sm text-gray-500">Selecione um questionário para visualizar o relatório.</p>
        </div>
      </main>
    );
  }

  if ((reportsQuery.isLoading && !reportsQuery.data) || (datasetQuery.isLoading && !datasetQuery.data)) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] pt-[80px] sm:pl-[190px]">
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-4">
          <div className="h-12 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-48 animate-pulse rounded bg-gray-200" />
        </div>
      </main>
    );
  }

  if (reportsQuery.isError || datasetQuery.isError) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] pt-[80px] sm:pl-[190px]">
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-4">
          <p className="text-sm text-red-600">Falha ao carregar relatório/dataset.</p>
          <Button type="button" variant="outline" className="mt-3 gap-2" onClick={handleRetry}>
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-[#f7f7f7] pt-[80px] sm:pl-[190px]">
        <div className="mx-auto max-w-screen-xl px-4 pb-10 pt-4">
          <p className="text-sm text-gray-600">Relatório não encontrado na listagem do quiz.</p>
        </div>
      </main>
    );
  }

  const quizTitle = selectedQuizTitle || `Questionário ${effectiveQuizId}`;

  return (
    <main className="min-h-screen bg-[#f7f7f7] pt-[80px] sm:pl-[190px]">
      <div className="mx-auto max-w-screen-xl px-4 pb-10">
        <div className="flex items-center justify-between gap-4 pt-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Visualização do Relatório</h1>
            <p className="text-sm text-gray-500">
              Relatório #{reportId} - Quiz {effectiveQuizId} - {quizTitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#E74E15] via-[#f0642b] to-[#c73f11] text-white shadow-lg">
            <div className="px-8 py-8">
              <div className="text-xs uppercase tracking-[0.35em] text-white/80">{quizTitle}</div>
              <div className="mt-3 text-2xl font-semibold">{report.title}</div>
              <div className="mt-1 text-sm text-white/90">{report.subtitle || "Sem subtítulo"}</div>
            </div>
            <div className="flex flex-wrap items-center gap-6 bg-white px-8 py-4 text-sm text-gray-700">
              <span>ID: #{report.id}</span>
              <span>Status: {formatStatus(report.status)}</span>
              <span>
                Criado em: {report.created_at ? new Date(report.created_at).toLocaleString("pt-BR") : "-"}
              </span>
            </div>
          </section>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.25em] text-gray-800">KPIs</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#f3c7b8] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Entrevistas</p>
                  <p className="text-2xl font-semibold text-[#E74E15]">{totalInterviews}</p>
                </div>
                <div className="rounded-lg border border-[#f3c7b8] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Resumos preenchidos</p>
                  <p className="text-2xl font-semibold text-[#E74E15]">{interviewsWithSummary}</p>
                </div>
                <div className="rounded-lg border border-[#f3c7b8] p-4">
                  <p className="text-xs uppercase tracking-widest text-gray-500">Respostas processadas</p>
                  <p className="text-2xl font-semibold text-[#E74E15]">{totalAnswers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.25em] text-gray-800">Gráficos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-8 pt-6 lg:grid-cols-2">
              <div className="h-[320px]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-700">
                  Top perguntas por volume de respostas
                </p>
                {topQuestionsChartData.length === 0 ? (
                  <p className="text-sm text-gray-500">Sem dados para montar gráfico de barras.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topQuestionsChartData} margin={{ top: 8, right: 16, left: 0, bottom: 42 }}>
                      <XAxis
                        dataKey="name"
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        height={70}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#E74E15" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="h-[320px]">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-700">
                  Distribuição da pergunta mais respondida
                </p>
                {pieData.length === 0 ? (
                  <p className="text-sm text-gray-500">Sem dados para montar gráfico de pizza.</p>
                ) : (
                  <>
                    <p className="mb-2 text-sm text-gray-600">{mainQuestion?.title}</p>
                    <ResponsiveContainer width="100%" height="92%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95}>
                          {pieData.map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.25em] text-gray-800">
                Quebras por pergunta
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {questions.length === 0 ? (
                <p className="text-sm text-gray-500">Dataset sem respostas para exibir.</p>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {questions.slice(0, 12).map((question) => (
                    <div key={question.questionId} className="rounded-lg border border-[#e6ebf7]">
                      <div className="border-b bg-[#fff5f1] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-gray-800">
                        {question.title}
                      </div>
                      <div className="px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-[11px] uppercase tracking-widest text-gray-500">
                              <th className="pb-2 text-left font-semibold">Resposta</th>
                              <th className="pb-2 text-right font-semibold">Qtd</th>
                              <th className="pb-2 text-right font-semibold">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {question.options.slice(0, 8).map((option) => (
                              <tr key={option.label} className="text-gray-600">
                                <td className="py-1">{option.label}</td>
                                <td className="py-1 text-right">{option.count}</td>
                                <td className="py-1 text-right">{option.percent.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar relatório</DialogTitle>
            <DialogDescription>Atualize título, subtítulo e status.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={handleUpdate}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtítulo</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
                        {...field}
                      >
                        <option value="draft">draft</option>
                        <option value="finalized">finalized</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2 bg-[#E74E15] hover:bg-[#cc3f0f]">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
