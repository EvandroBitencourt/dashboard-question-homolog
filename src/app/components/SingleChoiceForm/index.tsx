"use client";

import { useEffect, useState, useRef } from "react";
import { QuestionOptionProps, QuestionProps } from "@/utils/types/question";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash } from "lucide-react";
import {
  createQuestionOption,
  updateQuestionOption,
  deleteQuestionOption,
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

export default function SingleChoiceForm({
  question,
  options,
  onOptionsChange,
}: Props) {
  const [localOptions, setLocalOptions] = useState<QuestionOptionProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaving, setShowSaving] = useState(false);

  const originalValues = useRef<{
    [key: string]: { label: string; value: string };
  }>({});

  function parseOption(option: any): QuestionOptionProps {
    return {
      ...option,
      id: Number(option.id),
      question_id: Number(option.question_id),
      is_open:
        option.is_open === "1" ||
        option.is_open === 1 ||
        option.is_open === true,
      is_exclusive:
        option.is_exclusive === "1" ||
        option.is_exclusive === 1 ||
        option.is_exclusive === true,
      is_nsnr:
        option.is_nsnr === "1" ||
        option.is_nsnr === 1 ||
        option.is_nsnr === true,
      sort_order: Number(option.sort_order),
    };
  }

  useEffect(() => {
    const parsed = options.map(parseOption);

    const fixed = parsed.map((opt, idx) => ({
      ...opt,
      value: opt.is_open ? "" : opt.value || String(idx + 1),
    }));

    setLocalOptions(fixed);
  }, [options]);

  function getNextValue(): string {
    const numericValues = localOptions
      .map((opt) => parseInt(opt.value, 10))
      .filter((v) => !isNaN(v));

    const max = numericValues.length > 0 ? Math.max(...numericValues) : 0;
    return String(max + 1);
  }

  const handleAddOption = async (type: "default" | "open" | "nsnr") => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      let newOption: Omit<QuestionOptionProps, "id"> & { label: string } = {
        question_id: Number(question.id),
        label:
          type === "open"
            ? "Opção aberta"
            : type === "nsnr"
              ? "NS/NR"
              : "Nova opção",

        value: type === "open" ? "" : getNextValue(),

        is_open: type === "open",
        is_exclusive: false,
        is_nsnr: type === "nsnr",
        sort_order: localOptions.length,
        mask: "custom",
      };

      if (type === "nsnr" && localOptions.some((o) => o.is_nsnr)) {
        setIsLoading(false);
        return;
      }

      const created = await createQuestionOption(newOption);

      if (created) {
        const updated = [...localOptions, parseOption(created)];
        setLocalOptions(updated);
        onOptionsChange?.(updated);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (
    index: number,
    field: keyof QuestionOptionProps,
    value: any
  ) => {
    if (isLoading) return;

    const updated = localOptions.map((opt, i) =>
      i === index ? { ...opt, [field]: value } : opt
    );
    setLocalOptions(updated);
    onOptionsChange?.(updated);

    const option = localOptions[index];

    if (option?.id && option.id > 0) {
      setIsLoading(true);
      setShowSaving(true);
      try {
        const payload: any = {
          [field]: ["is_open", "is_exclusive", "is_nsnr"].includes(field)
            ? value
              ? 1
              : 0
            : value,
        };

        await updateQuestionOption(option.id, payload);
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

    if (option?.id && option.id > 0) {
      setIsLoading(true);
      try {
        const ok = await deleteQuestionOption(option.id);
        if (ok) {
          const updated = localOptions.filter((_, i) => i !== index);
          setLocalOptions(updated);
          onOptionsChange?.(updated);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      const updated = localOptions.filter((_, i) => i !== index);
      setLocalOptions(updated);
      onOptionsChange?.(updated);
    }
  };

  return (
    <div className="space-y-3">
      {showSaving && (
        <div className="text-sm text-blue-600 font-medium">
          Salvando alterações...
        </div>
      )}

      {localOptions.map((option, index) => (
        <div
          key={option.id ?? index}
          className="flex items-center justify-between gap-2 p-3"
        >
          {option.is_nsnr ? (
            <>
              <span className="text-xs text-purple-600 font-bold">NS/NR</span>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </>
          ) : (
            <>
              {/* LABEL */}
              <Input
                placeholder={
                  option.is_open ? "Texto da opção aberta" : "Texto da opção"
                }
                value={option.label}
                onFocus={() => {
                  originalValues.current[`${index}`] = {
                    ...(originalValues.current[`${index}`] || {}),
                    label: option.label,
                  };
                }}
                onChange={(e) => {
                  const updated = [...localOptions];
                  updated[index].label = e.target.value;
                  setLocalOptions(updated);
                  onOptionsChange?.(updated);
                }}
                onBlur={(e) => {
                  const original =
                    originalValues.current[`${index}`]?.label ?? "";
                  if (original !== e.target.value) {
                    handleChange(index, "label", e.target.value);
                  }
                }}
              />

              {/* 🔥 AQUI A CORREÇÃO FINAL  
                  NÃO mostra variável quando is_open === true
              */}
              {!option.is_open && (
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
                    const updated = [...localOptions];
                    updated[index].value = e.target.value;
                    setLocalOptions(updated);
                    onOptionsChange?.(updated);
                  }}
                  onBlur={(e) => {
                    const original =
                      originalValues.current[`${index}`]?.value ?? "";
                    if (original !== e.target.value) {
                      handleChange(index, "value", e.target.value);
                    }
                  }}
                />
              )}

              {/* MASK somente na opção aberta */}
              {option.is_open && (
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={option.mask || "custom"}
                  onChange={(e) => handleMaskChange(index, e.target.value)}
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
              >
                <Trash className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2 p-3">
        <Button variant="outline" onClick={() => handleAddOption("default")}>
          + OPÇÃO
        </Button>

        <Button variant="outline" onClick={() => handleAddOption("open")}>
          + OPÇÃO ABERTA
        </Button>

        <Button
          variant="outline"
          onClick={() => handleAddOption("nsnr")}
          disabled={localOptions.some((o) => o.is_nsnr)}
        >
          + OPÇÃO NS/NR
        </Button>
      </div>
    </div>
  );
}
