"use client";

import { useEffect, useState, useRef } from "react";
import { QuestionOptionProps, QuestionProps } from "@/utils/types/question";
import { Input } from "@/components/ui/input";
import { updateQuestionOption } from "@/utils/actions/question-option-data";

interface Props {
    question: QuestionProps;
    options: QuestionOptionProps[];
    onOptionsChange?: (options: QuestionOptionProps[]) => void;
}

export default function MultipleChoiceForm({ question, options, onOptionsChange }: Props) {
    const [localOptions, setLocalOptions] = useState<QuestionOptionProps[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSaving, setShowSaving] = useState(false);

    // Para armazenar valores originais ao focar
    const originalValues = useRef<{ [key: string]: { value?: string; min?: number; max?: number } }>({});

    useEffect(() => {
        function parseOption(option: any): QuestionOptionProps {
            return {
                ...option,
                id: Number(option.id),
                question_id: Number(option.question_id),
                min_selections: option.min_selections !== undefined && option.min_selections !== null ? Number(option.min_selections) : null,
                max_selections: option.max_selections !== undefined && option.max_selections !== null ? Number(option.max_selections) : null,
                value: option.value ?? "",
            };
        }
        setLocalOptions(options.map(parseOption));
    }, [options]);

    const handleChange = async (index: number, field: keyof QuestionOptionProps, value: any) => {
        if (isLoading) return;

        const updated = localOptions.map((opt, i) =>
            i === index ? { ...opt, [field]: value } : opt
        );
        setLocalOptions(updated);
        if (onOptionsChange) onOptionsChange(updated);

        const option = localOptions[index];
        if (option && option.id && typeof option.id === 'number' && option.id > 0) {
            setIsLoading(true);
            setShowSaving(true);
            try {
                const dataToSend: any = {};
                dataToSend[field] = value;
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

    return (
        <div className="space-y-3">
            {showSaving && (
                <div
                    className="text-sm text-blue-600 font-medium transition-opacity duration-700"
                    style={{ opacity: showSaving ? 1 : 0 }}
                >
                    Salvando informações...
                </div>
            )}
            {localOptions.map((option, index) => (
                <div key={option.id ?? index} className="flex flex-wrap items-center gap-2 p-3 border rounded">
                    <Input
                        placeholder="Variável"
                        className="w-24"
                        value={option.value}
                        onFocus={() => {
                            originalValues.current[`${index}`] = {
                                ...originalValues.current[`${index}`],
                                value: option.value,
                            };
                        }}
                        onChange={e => {
                            const value = e.target.value;
                            const updated = localOptions.map((opt, i) =>
                                i === index ? { ...opt, value } : opt
                            );
                            setLocalOptions(updated);
                            if (onOptionsChange) onOptionsChange(updated);
                        }}
                        onBlur={e => {
                            const original = originalValues.current[`${index}`]?.value ?? "";
                            if (original !== e.target.value) {
                                handleChange(index, "value", e.target.value);
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Input
                        placeholder="Mín. Seleções"
                        className="w-24"
                        type="number"
                        value={option.min_selections ?? ""}
                        onFocus={() => {
                            originalValues.current[`${index}`] = {
                                ...originalValues.current[`${index}`],
                                min: option.min_selections ?? undefined,
                            };
                        }}
                        onChange={e => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            const updated = localOptions.map((opt, i) =>
                                i === index ? { ...opt, min_selections: value } : opt
                            );
                            setLocalOptions(updated);
                            if (onOptionsChange) onOptionsChange(updated);
                        }}
                        onBlur={e => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            const original = originalValues.current[`${index}`]?.min ?? null;
                            if (original !== value) {
                                handleChange(index, "min_selections", value);
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Input
                        placeholder="Máx. Seleções"
                        className="w-24"
                        type="number"
                        value={option.max_selections ?? ""}
                        onFocus={() => {
                            originalValues.current[`${index}`] = {
                                ...originalValues.current[`${index}`],
                                max: option.max_selections ?? undefined,
                            };
                        }}
                        onChange={e => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            const updated = localOptions.map((opt, i) =>
                                i === index ? { ...opt, max_selections: value } : opt
                            );
                            setLocalOptions(updated);
                            if (onOptionsChange) onOptionsChange(updated);
                        }}
                        onBlur={e => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            const original = originalValues.current[`${index}`]?.max ?? null;
                            if (original !== value) {
                                handleChange(index, "max_selections", value);
                            }
                        }}
                        disabled={isLoading}
                    />
                </div>
            ))}
        </div>
    );
}