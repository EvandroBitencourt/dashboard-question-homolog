"use client";

import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateReport } from "@/hooks/use-reports";
import { toast } from "react-toastify";
import { CreateReportPayload } from "@/types/report";
import { ApiHttpError } from "@/services/reports.service";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const createReportSchema = z.object({
    title: z.string().min(3, "Informe um título com pelo menos 3 caracteres."),
    subtitle: z.string().max(180, "Use até 180 caracteres.").optional(),
    introduction: z.string().optional(),
});

type CreateReportFormValues = z.infer<typeof createReportSchema>;

function extractApiError(error: unknown) {
    if (error instanceof ApiHttpError) {
        return `${error.message} (HTTP ${error.status})`;
    }
    if (error instanceof Error) return error.message;
    return "Falha inesperada";
}

export default function NewReportPage() {
    const { selectedQuizId, selectedQuizTitle, isClientReady } = useQuiz();
    const router = useRouter();
    const createMutation = useCreateReport(isClientReady ? selectedQuizId : null);

    const form = useForm<CreateReportFormValues>({
        resolver: zodResolver(createReportSchema),
        defaultValues: {
            title: "",
            subtitle: "",
            introduction: "",
        },
    });

    const handleSubmit = form.handleSubmit(async (values) => {
        if (!selectedQuizId) {
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
            form.reset();
            
            // Aguardar um momento para garantir que as queries sejam invalidadas
            await new Promise(resolve => setTimeout(resolve, 500));
            
            router.push(`/questionarios/${selectedQuizId}/relatorios/${created.id}`);
        } catch (error) {
            console.error("Erro ao criar relatório:", error);
            toast.error(`Erro ao criar relatório: ${extractApiError(error)}`);
        }
    });

    if (!isClientReady) {
        return (
            <main className="pt-[80px] sm:pl-[190px]">
                <div className="max-w-screen-xl mx-auto p-4">
                    <Card className="shadow-sm">
                        <CardContent className="p-6">
                            <p className="text-sm text-gray-500">Carregando...</p>
                        </CardContent>
                    </Card>
                </div>
            </main>
        );
    }

    return (
        <main className="pt-[80px] sm:pl-[190px]">
            <div className="max-w-screen-xl mx-auto p-4">
                <Card className="shadow-sm">
                    <CardHeader className="border-b pb-3 flex flex-col gap-2">
                        <CardTitle className="text-lg text-[#e85228] font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Novo Relatório
                        </CardTitle>
                        <p className="text-xs text-gray-500">
                            Quiz selecionado:{" "}
                            {selectedQuizId ? (
                                <>
                                    <span className="font-semibold">{selectedQuizId}</span> —{" "}
                                    <span>{selectedQuizTitle}</span>
                                </>
                            ) : (
                                <span className="italic">nenhum quiz selecionado</span>
                            )}
                        </p>
                    </CardHeader>

                    <CardContent className="p-6">
                        <Form {...form}>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Título */}
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Título do relatório</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ex: Pesquisa Eleitoral – Novembro/2025"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Subtítulo */}
                                <FormField
                                    control={form.control}
                                    name="subtitle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subtítulo (opcional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Ex: Avaliação administrativa e cenário eleitoral"
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Texto introdutório */}
                                <FormField
                                    control={form.control}
                                    name="introduction"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Texto introdutório (opcional)</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    rows={6}
                                                    placeholder="Escreva aqui a introdução do relatório..."
                                                    {...field}
                                                    value={field.value ?? ""}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Ações */}
                                <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => router.back()}
                                        disabled={createMutation.isPending}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Voltar
                                    </Button>

                                    <Button
                                        type="submit"
                                        className="gap-2 bg-[#e85228] hover:bg-[#d94a20]"
                                        disabled={!selectedQuizId || createMutation.isPending}
                                    >
                                        {createMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Salvar rascunho
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
