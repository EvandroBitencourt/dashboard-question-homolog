"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { z } from "zod";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Eye, FileText, Loader2, PlusCircle, RefreshCw, Trash2 } from "lucide-react";
import { useCreateReport, useDeleteReport, useReportsList } from "@/hooks/use-reports";
import { ApiHttpError } from "@/services/reports.service";
import { CreateReportPayload } from "@/types/report";

type ReportsProps = {
  forcedQuizId?: number | null;
  forcedQuizTitle?: string;
};

const createReportSchema = z.object({
  title: z.string().min(3, "Informe um título com pelo menos 3 caracteres."),
  subtitle: z.string().max(180, "Use até 180 caracteres.").optional(),
});

type CreateReportFormValues = z.infer<typeof createReportSchema>;

function extractApiError(error: unknown) {
  if (error instanceof ApiHttpError) {
    return `${error.message} (HTTP ${error.status})`;
  }

  if (error instanceof Error) return error.message;
  return "Falha inesperada";
}

function formatStatus(status?: string | null) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "finalized") return "Finalizado";
  if (normalized === "draft") return "Rascunho";
  return status || "-";
}

export default function Reports({ forcedQuizId, forcedQuizTitle }: ReportsProps) {
  const router = useRouter();
  const { selectedQuizId, selectedQuizTitle } = useQuiz();
  const effectiveQuizId = forcedQuizId ?? selectedQuizId;
  const effectiveQuizTitle = forcedQuizTitle ?? selectedQuizTitle;
  const [createOpen, setCreateOpen] = useState(false);

  const reportsQuery = useReportsList(effectiveQuizId);
  const createMutation = useCreateReport(effectiveQuizId);
  const deleteMutation = useDeleteReport(effectiveQuizId);

  const form = useForm<CreateReportFormValues>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      title: "",
      subtitle: "",
    },
  });

  const reports = useMemo(() => reportsQuery.data?.items ?? [], [reportsQuery.data]);

  const handleCreateSubmit = form.handleSubmit(async (values) => {
    if (!effectiveQuizId) {
      toast.error("Selecione um questionário antes de criar relatório.");
      return;
    }

    const payload: CreateReportPayload = {
      title: values.title,
      subtitle: values.subtitle?.trim() || undefined,
    };

    try {
      const created = await createMutation.mutateAsync(payload);
      toast.success("Relatório criado com sucesso.");
      setCreateOpen(false);
      form.reset();
      router.push(`/questionarios/${effectiveQuizId}/relatorios/${created.id}`);
    } catch (error) {
      toast.error(`Erro ao criar relatório: ${extractApiError(error)}`);
    }
  });

  const handleViewReport = (id: number) => {
    if (!effectiveQuizId) return;
    router.push(`/questionarios/${effectiveQuizId}/relatorios/${id}`);
  };

  const handleDeleteReport = async (reportId: number) => {
    if (!effectiveQuizId) return;
    const confirmed = window.confirm("Deseja excluir este relatório?");
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(reportId);
      toast.success("Relatório excluído com sucesso.");
    } catch (error) {
      toast.error(`Erro ao excluir relatório: ${extractApiError(error)}`);
    }
  };

  return (
    <section>
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-[#e85228]">
              <FileText className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              Quiz selecionado:{" "}
              {effectiveQuizId ? (
                <>
                  <span className="font-semibold">{effectiveQuizId}</span> - <span>{effectiveQuizTitle}</span>
                </>
              ) : (
                <span className="italic">nenhum quiz selecionado</span>
              )}
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!effectiveQuizId}
            className="gap-2 bg-[#e85228] hover:bg-[#d94a20]"
          >
            <PlusCircle className="h-4 w-4" />
            Criar relatório
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="max-h-[520px]">
            {reportsQuery.isLoading && (
              <div className="space-y-2 px-6 py-6">
                <div className="h-10 animate-pulse rounded bg-gray-100" />
                <div className="h-10 animate-pulse rounded bg-gray-100" />
                <div className="h-10 animate-pulse rounded bg-gray-100" />
              </div>
            )}

            {reportsQuery.isError && (
              <div className="px-6 py-8 text-sm text-red-600">
                <p>Não foi possível carregar os relatórios.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 gap-2"
                  onClick={() => reportsQuery.refetch()}
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            )}

            {!reportsQuery.isLoading && !reportsQuery.isError && reports.length === 0 && (
              <p className="px-6 py-8 text-sm text-gray-500">
                Nenhum relatório criado para este questionário.
              </p>
            )}

            {!reportsQuery.isLoading && !reportsQuery.isError && reports.length > 0 && (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="w-16 px-4 py-2 text-left font-semibold text-gray-700">ID</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Título</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Subtítulo</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700">Criado em</th>
                      <th className="w-[210px] px-4 py-2 text-center font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-b transition-colors hover:bg-orange-50/60 last:border-0"
                      >
                        <td className="px-4 py-2 font-medium text-gray-700">#{report.id}</td>
                        <td className="px-4 py-2 text-gray-700">{report.title}</td>
                        <td className="px-4 py-2 text-gray-700">{report.subtitle || "-"}</td>
                        <td className="px-4 py-2 text-gray-700">{formatStatus(report.status)}</td>
                        <td className="px-4 py-2 text-gray-700">
                          {report.created_at
                            ? new Date(report.created_at).toLocaleString("pt-BR")
                            : "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => handleViewReport(report.id)}
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteReport(report.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo relatório</DialogTitle>
            <DialogDescription>Informe somente título e subtítulo.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={handleCreateSubmit}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Pesquisa Eleitoral - Rodada 1" {...field} />
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
                      <Input placeholder="Opcional" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="gap-2 bg-[#e85228] hover:bg-[#d94a20]">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
