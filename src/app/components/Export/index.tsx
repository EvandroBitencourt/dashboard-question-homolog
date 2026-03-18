"use client";

import { useState } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import { useQuiz } from "@/context/QuizContext";
import { exportQuestionnaire } from "@/utils/actions/export-data";

const Export = () => {
    const { selectedQuizId, selectedQuizTitle } = useQuiz();

    const [isExpanded, setIsExpanded] = useState(true);
    const [exporting, setExporting] = useState(false);

    const [saveFormat, setSaveFormat] = useState(false);
    const [divideColumns, setDivideColumns] = useState(false);
    const [dateField, setDateField] = useState<"finished_at" | "created_at">("finished_at");
    const [dateStart, setDateStart] = useState("");
    const [dateEnd, setDateEnd] = useState("");
    const [exportAs, setExportAs] = useState<"value" | "variable">("value");
    const [format, setFormat] = useState("xls");
    const [revisionMode, setRevisionMode] = useState("mesma");

    async function handleExport() {
        if (!selectedQuizId) {
            await Swal.fire("Atenção", "Selecione um questionário antes de exportar.", "warning");
            return;
        }

        if (format !== "xls") {
            await Swal.fire("Atenção", "Por enquanto o backend está gerando apenas XLSX.", "warning");
            return;
        }

        try {
            setExporting(true);

            await exportQuestionnaire(selectedQuizId, {
                date_field: dateField,
                date_start: dateStart || null,
                date_end: dateEnd || null,
                export_as: exportAs,
            });

            await Swal.fire("Sucesso", "Arquivo exportado com sucesso.", "success");
        } catch (e: any) {
            console.error(e);
            await Swal.fire(
                "Erro",
                e?.message || "Não foi possível exportar os dados.",
                "error"
            );
        } finally {
            setExporting(false);
        }
    }

    return (
        <section className="space-y-6">
            <h2 className="text-xl font-semibold text-[#e85228]">EXPORTAR</h2>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Card>
                        <CardHeader
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="bg-[#e85228] text-white py-3 cursor-pointer flex items-center justify-between"
                        >
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5" />
                                ) : (
                                    <ChevronDown className="w-5 h-5" />
                                )}
                                {selectedQuizTitle ? `Questionário: ${selectedQuizTitle}` : "Exportação"}
                            </CardTitle>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="p-4">
                                <p className="text-sm text-gray-500">
                                    Todas as perguntas do questionário serão exportadas.
                                </p>
                            </CardContent>
                        )}
                    </Card>
                </div>

                <div className="w-full md:w-[350px] space-y-4">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="saveFormat"
                            checked={saveFormat}
                            onChange={(e) => setSaveFormat(e.target.checked)}
                        />
                        <label htmlFor="saveFormat" className="text-sm">
                            Salvar novo formato de exportação
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="divideCols" className="text-sm">
                            Dividir em colunas
                        </Label>
                        <Switch
                            id="divideCols"
                            checked={divideColumns}
                            onCheckedChange={setDivideColumns}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Data de exportação</Label>
                        <RadioGroup
                            value={dateField === "created_at" ? "sincronizacao" : "coleta"}
                            onValueChange={(value) =>
                                setDateField(value === "sincronizacao" ? "created_at" : "finished_at")
                            }
                            className="space-y-1"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="sincronizacao" id="sync" />
                                <Label htmlFor="sync" className="text-sm">Data de sincronização</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="coleta" id="coleta" />
                                <Label htmlFor="coleta" className="text-sm">Data de coleta</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Iniciando</Label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <CalendarDays className="w-4 h-4 text-gray-400" />
                            </span>
                            <Input
                                type="date"
                                value={dateStart}
                                onChange={(e) => setDateStart(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Terminando</Label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <CalendarDays className="w-4 h-4 text-gray-400" />
                            </span>
                            <Input
                                type="date"
                                value={dateEnd}
                                onChange={(e) => setDateEnd(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Exportar respostas como</Label>
                        <RadioGroup
                            value={exportAs}
                            onValueChange={(value) => setExportAs(value as "value" | "variable")}
                            className="space-y-1"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="value" id="valor" />
                                <Label htmlFor="valor" className="text-sm">Valor</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="variable" id="variavel" />
                                <Label htmlFor="variavel" className="text-sm">Variável</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Formato</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha formato" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="xls">Padrão (XLS)</SelectItem>
                                <SelectItem value="csv">CSV</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Exportar revisões como</Label>
                        <Select value={revisionMode} onValueChange={setRevisionMode}>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mesma">Mesma planilha</SelectItem>
                                <SelectItem value="separada">Planilhas separadas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting || !selectedQuizId}
                        className="w-full bg-[#e85228] hover:bg-[#cf4723] text-white"
                    >
                        {exporting ? "EXPORTANDO..." : "EXPORTAR"}
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default Export;