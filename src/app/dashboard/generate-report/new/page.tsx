"use client";

import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, FileText } from "lucide-react";

export default function NewReportPage() {
    const router = useRouter();
    const { selectedQuizId, selectedQuizTitle } = useQuiz();

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

                    <CardContent className="p-6 space-y-6">
                        {/* Título */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Título do relatório
                            </label>
                            <Input
                                placeholder="Ex: Pesquisa Eleitoral – Novembro/2025"
                            />
                        </div>

                        {/* Subtítulo */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Subtítulo (opcional)
                            </label>
                            <Input
                                placeholder="Ex: Avaliação administrativa e cenário eleitoral"
                            />
                        </div>

                        {/* Texto introdutório */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">
                                Texto introdutório
                            </label>
                            <Textarea
                                rows={6}
                                placeholder="Escreva aqui a introdução do relatório..."
                            />
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar
                            </Button>

                            <Button
                                type="button"
                                className="gap-2 bg-[#e85228] hover:bg-[#d94a20]"
                            >
                                <Save className="w-4 h-4" />
                                Salvar rascunho
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
