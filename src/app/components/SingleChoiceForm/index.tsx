"use client";

import { useEffect, useState, useRef } from "react";
import { QuestionOptionProps, QuestionProps } from "@/utils/types/question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash } from "lucide-react";
import { 
    createQuestionOption, 
    updateQuestionOption, 
    deleteQuestionOption 
} from "@/utils/actions/question-option-data";

const maskTypes = [
    { value: "custom", label: "Personalizado" },
    { value: "date", label: "Data" },
    { value: "time", label: "Hora" },
    { value: "email", label: "Email" },
    { value: "number", label: "Número" },
    { value: "text", label: "Texto" },
    { value: "decimal", label: "Decimal" },
];

interface Props {
    question: QuestionProps;
    options: QuestionOptionProps[];
    onOptionsChange?: (options: QuestionOptionProps[]) => void;
}

export default function SingleChoiceForm({ question, options, onOptionsChange }: Props) {
    const [localOptions, setLocalOptions] = useState<QuestionOptionProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSaving, setShowSaving] = useState(false);

    const originalValues = useRef<{ [key: string]: { label: string; value: string } }>({});

    function parseOption(option: any): QuestionOptionProps {
        return {
            ...option,
            id: Number(option.id),
            question_id: Number(option.question_id),
            is_open: option.is_open === "1" || option.is_open === 1 || option.is_open === true,
            is_exclusive: option.is_exclusive === "1" || option.is_exclusive === 1 || option.is_exclusive === true,
            is_nsnr: option.is_nsnr === "1" || option.is_nsnr === 1 || option.is_nsnr === true,
            sort_order: Number(option.sort_order),
        };
    }

    useEffect(() => {
        setLocalOptions(options.map(parseOption));
    }, [options]);

    function getNextValue() {
        if (localOptions.length === 0) return "P1";
        const lastValue = localOptions[localOptions.length - 1].value || "P1";
        const match = lastValue.match(/^([a-zA-Z_]+)(\d+)$/i);
        if (match) {
            const prefix = match[1];
            const number = parseInt(match[2], 10) + 1;
            return `${prefix}${number}`;
        } else {
            return `${lastValue}2`;
        }
    }

    const handleAddOption = async (type: "default" | "open" | "nsnr") => {
        if (isLoading) return;
        setIsLoading(true);

        try {
            let newOptionData: Omit<QuestionOptionProps, "id">;

            if (type === "default") {
                newOptionData = {
                    question_id: Number(question.id),
                    label: "Nova opção",
                    value: getNextValue(),
                    is_open: 0,
                    is_exclusive: 0,
                    is_nsnr: 0,
                    sort_order: localOptions.length,
                    mask: "custom",
                };
            } else if (type === "open") {
                newOptionData = {
                    question_id: Number(question.id),
                    label: "Opção aberta",
                    value: getNextValue(),
                    is_open: 1,
                    is_exclusive: 0,
                    is_nsnr: 0,
                    sort_order: localOptions.length,
                    mask: "custom",
                };
            } else if (type === "nsnr") {
                if (localOptions.some((o) => o.is_nsnr)) {
                    setIsLoading(false);
                    return;
                }
                newOptionData = {
                    question_id: Number(question.id),
                    label: "NS/NR",
                    value: getNextValue(),
                    is_open: 0,
                    is_exclusive: 0,
                    is_nsnr: 1,
                    sort_order: localOptions.length,
                    mask: "custom",
                };
            } else {
                setIsLoading(false);
                return;
            }

            const createdOption = await createQuestionOption(newOptionData);

            if (createdOption) {
                const updated = [...localOptions, parseOption(createdOption)];
                setLocalOptions(updated);
                if (onOptionsChange) onOptionsChange(updated);
            } else {
                console.error("Erro ao criar opção no backend");
            }
        } catch (error) {
            console.error("Erro ao adicionar opção:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = async (index: number, field: keyof QuestionOptionProps, value: any) => {
        if (isLoading) return;

        const updated = localOptions.map((opt, i) =>
            i === index ? { ...opt, [field]: value } : opt
        );
        setLocalOptions(updated);
        if (onOptionsChange) onOptionsChange(updated);

        const option = localOptions[index];
        if (option && option.id && typeof option.id === "number" && option.id > 0) {
            setIsLoading(true);
            setShowSaving(true);
            try {
                const dataToSend: any = {};

                if (["is_open", "is_exclusive", "is_nsnr"].includes(field)) {
                    dataToSend[field] = value ? 1 : 0;
                } else {
                    dataToSend[field] = value;
                }

                const updatedOption = await updateQuestionOption(option.id, dataToSend);
                if (!updatedOption) {
                    console.error("Erro ao atualizar opção no backend");
                }
            } catch (error) {
                console.error("Erro ao atualizar opção:", error);
            } finally {
                setIsLoading(false);
                setTimeout(() => setShowSaving(false), 1200);
            }
        }
    };

    const handleMaskChange = async (index: number, value: string) => {
        await handleChange(index, "mask", value);
    };

    const handleRemove = async (index: number) => {
        if (isLoading) return;

        const option = localOptions[index];

        if (option && option.id && typeof option.id === "number" && option.id > 0) {
            setIsLoading(true);
            try {
                const success = await deleteQuestionOption(option.id);
                if (success) {
                    const updated = [...localOptions];
                    updated.splice(index, 1);
                    setLocalOptions(updated);
                    if (onOptionsChange) onOptionsChange(updated);
                } else {
                    console.error("Erro ao deletar opção no backend");
                }
            } catch (error) {
                console.error("Erro ao remover opção:", error);
            } finally {
                setIsLoading(false);
            }
        } else {
            const updated = [...localOptions];
            updated.splice(index, 1);
            setLocalOptions(updated);
            if (onOptionsChange) onOptionsChange(updated);
        }
    };

    return (
        <div className="space-y-3">
            {showSaving && (
                <div className="text-sm text-blue-600 font-medium transition-opacity duration-700">
                    Salvando alterações...
                </div>
            )}

            {localOptions.map((option, index) => (
                <div key={option.id ?? index} className="flex items-center justify-between gap-2 p-3">
                    {option.is_nsnr ? (
                        <>
                            <span className="text-xs text-purple-600 font-bold">NS/NR</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(index)}
                                disabled={isLoading}
                            >
                                <Trash className="w-4 h-4 text-red-500" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Input
                                placeholder={option.is_open ? "Texto da opção aberta" : "Texto da opção"}
                                value={option.label}
                                onFocus={() => {
                                    originalValues.current[`${index}`] = {
                                        ...(originalValues.current[`${index}`] || {}),
                                        label: option.label,
                                    };
                                }}
                                onChange={(e) => {
                                    const updated = localOptions.map((opt, i) =>
                                        i === index ? { ...opt, label: e.target.value } : opt
                                    );
                                    setLocalOptions(updated);
                                    if (onOptionsChange) onOptionsChange(updated);
                                }}
                                onBlur={(e) => {
                                    const original = originalValues.current[`${index}`]?.label ?? "";
                                    if (original !== e.target.value) {
                                        handleChange(index, "label", e.target.value);
                                    }
                                }}
                                disabled={isLoading}
                            />
                            <Input
                                placeholder="Variável"
                                className="w-32"
                                value={option.value}
                                onFocus={() => {
                                    originalValues.current[`${index}`] = {
                                        ...(originalValues.current[`${index}`] || {}),
                                        value: option.value,
                                    };
                                }}
                                onChange={(e) => {
                                    const updated = localOptions.map((opt, i) =>
                                        i === index ? { ...opt, value: e.target.value } : opt
                                    );
                                    setLocalOptions(updated);
                                    if (onOptionsChange) onOptionsChange(updated);
                                }}
                                onBlur={(e) => {
                                    const original = originalValues.current[`${index}`]?.value ?? "";
                                    if (original !== e.target.value) {
                                        handleChange(index, "value", e.target.value);
                                    }
                                }}
                                disabled={isLoading}
                            />
                            {option.is_open && (
                                <select
                                    className="border rounded px-2 py-1 text-xs"
                                    value={option.mask || "custom"}
                                    onChange={(e) => handleMaskChange(index, e.target.value)}
                                    disabled={isLoading}
                                >
                                    {maskTypes.map((mask) => (
                                        <option key={mask.value} value={mask.value}>
                                            {mask.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(index)}
                                disabled={isLoading}
                            >
                                <Trash className="w-4 h-4 text-red-500" />
                            </Button>
                        </>
                    )}
                </div>
            ))}

            <div className="flex gap-2 p-3">
                <Button variant="outline" onClick={() => handleAddOption("default")} disabled={isLoading}>
                    + OPÇÃO
                </Button>
                <Button variant="outline" onClick={() => handleAddOption("open")} disabled={isLoading}>
                    + OPÇÃO ABERTA
                </Button>
                <Button
                    variant="outline"
                    onClick={() => handleAddOption("nsnr")}
                    disabled={isLoading || localOptions.some((o) => o.is_nsnr)}
                >
                    + OPÇÃO NS/NR
                </Button>
            </div>
        </div>
    );
}