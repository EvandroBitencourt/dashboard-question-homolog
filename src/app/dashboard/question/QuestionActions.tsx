"use client";

import React, { useEffect, useState } from "react";
import {
  Copy,
  SkipForward,
  Link2,
  Move,
  Send,
  ArrowUpDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useQuiz } from "@/context/QuizContext";
import { listQuestionsByQuiz } from "@/utils/actions/question-data";
import { QuestionProps } from "@/utils/types/question";

const mockForms = [
  "Teste Zidane",
  "Cota 3 - Lucas - Jun/2025",
  "Cota 4 - Lucas - Jun/2025",
  "Novo Questionário",
  "teste evandro",
];

const mockOptions = ["16 a 17 anos", "18 a 20 anos", "25 a 30 anos"];
const mockStates = ["selecionado", "não selecionado"];
const mockNumberStates = [
  "maior que",
  "maior ou igual",
  "menor que",
  "menor ou igual",
  "diferente",
  "igual",
];
const mockDestinations = ["Q2", "Q3", "Q4", "Q5", "Q8"];

export default function QuestionActions() {
  const { selectedQuizId } = useQuiz();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  const [copies, setCopies] = useState(1);
  const [selectedForm, setSelectedForm] = useState("");

  const [isNumber, setIsNumber] = useState(false);
  const [option, setOption] = useState("");
  const [state, setState] = useState("");
  const [value, setValue] = useState("");
  const [destination, setDestination] = useState("");

  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [orders, setOrders] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!selectedQuizId || !showReorderModal) return;

    listQuestionsByQuiz(selectedQuizId).then((res) => {
      if (res) {
        setQuestions(res);
        const initialOrders: Record<number, number> = {};
        res.forEach((q, i) => {
          initialOrders[q.id] = i + 1;
        });
        setOrders(initialOrders);
      }
    });
  }, [selectedQuizId, showReorderModal]);

  return (
    <TooltipProvider>
      <div className="flex gap-4 mb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowCopyModal(true)}
            >
              <Copy size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copia questão</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowSkipModal(true)}
            >
              <SkipForward size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Pular questão</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowLinkModal(true)}
            >
              <Link2 size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Vincular questões</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowReorderModal(true)}
            >
              <ArrowUpDown size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reordenar questões</TooltipContent>
        </Tooltip>
        {/* <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
            >
              <Send size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Enviar dados pré cadastro</TooltipContent>
        </Tooltip> */}
      </div>

      {/* Modal Copiar Questão */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Copiar Questão
            </h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Número de cópias
              </label>
              <input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 text-gray-800"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">
                Formulário
              </label>
              <select
                value={selectedForm}
                onChange={(e) => setSelectedForm(e.target.value)}
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="" disabled>
                  Selecione um formulário
                </option>
                {mockForms.map((form) => (
                  <option key={form} value={form}>
                    {form}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowCopyModal(false)}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                disabled
              >
                COPIAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pular Questão */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Editar regra de pulo
            </h2>

            <label className="flex items-center mb-4 gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={isNumber}
                onChange={() => {
                  setIsNumber(!isNumber);
                  setOption("");
                  setState("");
                  setValue("");
                }}
                className="accent-orange-500"
              />
              É Número
            </label>

            {!isNumber ? (
              <>
                <div className="flex gap-4 mb-4">
                  <div className="w-1/2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Opção
                    </label>
                    <select
                      value={option}
                      onChange={(e) => setOption(e.target.value)}
                      className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    >
                      <option value="" disabled>
                        A Opção é OBRIGATÓRIA
                      </option>
                      {mockOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-1/2">
                    <label className="block text-sm text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                    >
                      <option value="" disabled>
                        O estado é OBRIGATÓRIO
                      </option>
                      {mockStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex gap-4 mb-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                  >
                    <option value="" disabled>
                      O estado é OBRIGATÓRIO
                    </option>
                    {mockNumberStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">
                    Valor
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 text-gray-800"
                    placeholder="O Valor é OBRIGATÓRIO"
                  />
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">
                Destino
              </label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
              >
                <option value="" disabled>
                  O Destino é OBRIGATÓRIO
                </option>
                {mockDestinations.map((dest) => (
                  <option key={dest} value={dest}>
                    {dest}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowSkipModal(false)}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                disabled
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Vincular Questão */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Vincular Questões
            </h2>

            {/* Mock: Essa questão será exibida SE... */}
            <p className="text-sm text-gray-700 mb-4">
              Esta questão será exibida <strong>somente se</strong>:
            </p>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Questão condicional
              </label>
              <select className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800">
                <option value="" disabled>
                  Selecione uma questão
                </option>
                <option value="Q1">Q1 - Você tem filhos?</option>
                <option value="Q1">Q2 - Trabalha atualmente?</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">
                Condição
              </label>
              <select className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800">
                <option value="" disabled>
                  Selecione uma condição
                </option>
                <option value="Q1">é igual a</option>
                <option value="Q1">é diferente de</option>
                <option value="Q1">está selecionado</option>
                <option value="Q1">não está selecionado</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">
                Valor esperado
              </label>
              <input
                type="text"
                placeholder="Digite o valor ou rótulo da opção"
                className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 text-gray-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowLinkModal(false)}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                disabled
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reordenar Questões */}
       {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">
              Reordene as Questões
            </h2>

            <div className="grid grid-cols-12 items-center font-semibold border-b pb-2 mb-3 text-sm text-gray-600">
              <div className="col-span-3">Variável</div>
              <div className="col-span-6">Questão</div>
              <div className="col-span-2">Ordem</div>
              <div className="col-span-1 text-center"> </div>
            </div>

            {questions.map((q) => (
              <div
                key={q.id}
                className="grid grid-cols-12 items-center py-2 border-b text-sm"
              >
                <div className="col-span-3 truncate">{q.variable || "-"}</div>
                <div className="col-span-6 truncate">{q.title || "-"}</div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={orders[q.id] || ""}
                    onChange={(e) =>
                      setOrders({ ...orders, [q.id]: Number(e.target.value) })
                    }
                    className="w-full border-b-2 border-orange-500 px-2 py-1 text-gray-800 focus:outline-none focus:border-orange-600"
                  />
                </div>
              </div>
            ))}

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowReorderModal(false)}
              >
                CANCELAR
              </button>
              <button
                className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600 transition"
                disabled
              >
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
