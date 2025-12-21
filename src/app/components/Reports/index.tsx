"use client";

import { useRouter } from "next/navigation";
import { useQuiz } from "@/context/QuizContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, PlusCircle, Eye } from "lucide-react";

type ReportItem = {
    id: number;
    title: string;
    created_at: string;
    status: "draft" | "final";
};

export default function Reports() {
    const router = useRouter();
    const { selectedQuizId, selectedQuizTitle } = useQuiz();

    // 🔹 Dados fictícios (mock)
    const reports: ReportItem[] = [
        {
            id: 1,
            title: "Pesquisa Eleitoral – Rodada 1",
            created_at: "2025-11-15",
            status: "final",
        },
        {
            id: 2,
            title: "Pesquisa Eleitoral – Rodada 2",
            created_at: "2025-12-01",
            status: "draft",
        },
    ];

    const handleCreateReport = () => {
        router.push("/dashboard/generate-report/new");
    };

    const handleViewReport = (id: number) => {
        router.push(`/dashboard/generate-report/${id}`);
    };

    return (
        <section>
            <Card className="shadow-sm">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
                    <div>
                        <CardTitle className="text-lg text-[#e85228] font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Relatórios
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
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
                    </div>

                    <Button
                        type="button"
                        onClick={handleCreateReport}
                        disabled={!selectedQuizId}
                        className="gap-2 bg-[#e85228] hover:bg-[#d94a20]"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Criar relatório
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    <ScrollArea className="max-h-[520px]">
                        {reports.length === 0 && (
                            <p className="px-6 py-8 text-sm text-gray-500">
                                Nenhum relatório criado para este questionário.
                            </p>
                        )}

                        {reports.length > 0 && (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700 w-16">
                                                ID
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Título
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Criado em
                                            </th>
                                            <th className="px-4 py-2 text-left font-semibold text-gray-700">
                                                Status
                                            </th>
                                            <th className="px-4 py-2 text-center font-semibold text-gray-700 w-[140px]">
                                                Ações
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reports.map((report) => (
                                            <tr
                                                key={report.id}
                                                className="border-b last:border-0 hover:bg-orange-50/60 transition-colors"
                                            >
                                                <td className="px-4 py-2 font-medium text-gray-700">
                                                    #{report.id}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {report.title}
                                                </td>
                                                <td className="px-4 py-2 text-gray-700">
                                                    {new Date(report.created_at).toLocaleDateString("pt-BR")}
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span
                                                        className={`text-xs font-semibold px-2 py-1 rounded-full ${report.status === "final"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                            }`}
                                                    >
                                                        {report.status === "final" ? "Finalizado" : "Rascunho"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-1"
                                                        onClick={() => handleViewReport(report.id)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Ver
                                                    </Button>
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
        </section>
    );
}
