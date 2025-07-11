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
import { ScrollArea } from "@/components/ui/scroll-area";
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

const questions = [
    "P1", "P2", "P3", "P4", "P6", "P7", "P8", "P9", "P12", "P13",
    "P14", "P15", "P16", "P17", "P18", "P19", "P20", "P21", "P22", "P24",
    "P25", "P27", "P28", "P30", "P31", "P32", "P33", "P34", "P35", "P36",
    "P37", "P38", "P40", "P41", "P42", "P44", "P45", "P46", "P47", "P48",
    "Nome", "Bairro", "Telefone",
];

const Export = () => {
    const [isExpanded, setIsExpanded] = useState(false);

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
                                Revisão 4
                            </CardTitle>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="p-4">
                                <p className="text-sm text-[#e85228] mb-2 underline cursor-pointer">
                                    Questões disponíveis
                                </p>
                                <ScrollArea className="max-h-64">
                                    <div className="flex flex-wrap gap-2">
                                        {questions.map((q, i) => (
                                            <span
                                                key={i}
                                                className="bg-gray-200 text-sm px-3 py-1 rounded-full hover:bg-gray-300 cursor-pointer"
                                            >
                                                {q} +
                                            </span>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <p className="text-sm text-[#e85228] mt-4">Questões selecionadas</p>
                                <p className="text-xs text-gray-500 italic">
                                    If no question is selected all questions will be exported.
                                </p>
                            </CardContent>
                        )}
                    </Card>
                </div>

                {/* Opções de exportação */}
                <div className="w-full md:w-[350px] space-y-4">
                    <div className="flex items-center space-x-2">
                        <input type="checkbox" id="saveFormat" />
                        <label htmlFor="saveFormat" className="text-sm">
                            Salvar novo formato de exportação
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="divideCols" className="text-sm">
                            Dividir em colunas
                        </Label>
                        <Switch id="divideCols" />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Data de exportação</Label>
                        <RadioGroup defaultValue="coleta" className="space-y-1">
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

                    {/* Campo "Iniciando" com ícone */}
                    <div className="space-y-1">
                        <Label className="text-sm">Iniciando</Label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <CalendarDays className="w-4 h-4 text-gray-400" />
                            </span>
                            <Input placeholder="Data" className="pl-10" />
                        </div>
                    </div>

                    {/* Campo "Terminando" com ícone */}
                    <div className="space-y-1">
                        <Label className="text-sm">Terminando</Label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <CalendarDays className="w-4 h-4 text-gray-400" />
                            </span>
                            <Input placeholder="Data" className="pl-10" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Exportar respostas como</Label>
                        <RadioGroup defaultValue="valor" className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="valor" id="valor" />
                                <Label htmlFor="valor" className="text-sm">Valor</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="variavel" id="variavel" />
                                <Label htmlFor="variavel" className="text-sm">Variável</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-1">
                        <Label className="text-sm">Formato</Label>
                        <Select defaultValue="xls">
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
                        <Select defaultValue="mesma">
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mesma">Mesma planilha</SelectItem>
                                <SelectItem value="separada">Planilhas separadas</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button className="w-full bg-[#e85228] hover:bg-[#cf4723] text-white">
                        EXPORTAR
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default Export;
