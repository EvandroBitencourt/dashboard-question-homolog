"use client";

import React, { useEffect, useState } from "react";
import {
  Copy,
  SkipForward,
  Link2,
  ArrowUpDown,
  MessageSquareWarning, // novo ícone
  Hand
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

const mockOptions = ["Masculino", "Feminino", "16 a 17 anos", "18 a 20 anos", "25 a 30 anos"];
const mockStates = ["selecionado", "não selecionado"];
const mockNumberStates = ["maior que", "maior ou igual", "menor que", "menor ou igual", "diferente", "igual"];
const mockDestinations = ["Q2", "Q3", "Q4", "Q5", "Q8", "Q30", "Q31"];

export default function QuestionActions() {
  const { selectedQuizId } = useQuiz();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);


  // NOVO: modal de restrição
  const [showRestrictModal, setShowRestrictModal] = useState(false);

  const [copies, setCopies] = useState(1);
  const [selectedForm, setSelectedForm] = useState("");

  const [isNumber, setIsNumber] = useState(false);
  const [option, setOption] = useState("");
  const [state, setState] = useState("");
  const [value, setValue] = useState("");
  const [destination, setDestination] = useState("");

  const [questions, setQuestions] = useState<QuestionProps[]>([]);
  const [orders, setOrders] = useState<Record<number, number>>({});

  // carrega questões quando qualquer modal que precise delas abre
  useEffect(() => {
    const needsQuestions = showReorderModal || showRestrictModal;
    if (!selectedQuizId || !needsQuestions) return;

    listQuestionsByQuiz(selectedQuizId).then((res) => {
      if (res) {
        setQuestions(res);
        if (showReorderModal) {
          const initialOrders: Record<number, number> = {};
          res.forEach((q, i) => {
            initialOrders[q.id] = i + 1;
          });
          setOrders(initialOrders);
        }
      }
    });
  }, [selectedQuizId, showReorderModal, showRestrictModal]);

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
              onClick={() => setShowRestrictModal(true)}
            >
              <MessageSquareWarning size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Restrição</TooltipContent>
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

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="hover:text-orange-500 transition-colors"
              onClick={() => setShowRefuseModal(true)}
            >
              <Hand size={20} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Adicionar Recusa</TooltipContent>
        </Tooltip>
      </div>

      {/* ================= MODAL: COPIAR ================= */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Copiar Questão</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Número de cópias</label>
              <input
                type="number"
                min={1}
                value={copies}
                onChange={(e) => setCopies(Number(e.target.value))}
                className="w-full border-b-2 border-orange-500 focus:outline-none focus:border-orange-600 px-2 py-1 text-gray-800"
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">Formulário</label>
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
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                COPIAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESTRIÇÃO (NOVO) ================= */}
      {showRestrictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">Editar Restrição</h2>

            {/* cabeçalho tipo “Antes de Qx” – opcional/estático aqui */}
            <p className="text-sm text-gray-600 mb-4">Antes de Q?</p>

            <div className="rounded border p-4">
              {/* Toggle numérico */}
              <label className="flex items-center gap-2 text-sm text-gray-700 mb-6">
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
                Numérico
              </label>

              {/* Linha principal: Questão / Opção / Estado */}
              <div className="grid grid-cols-12 gap-4 mb-6">
                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">Questão</label>
                  <select className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800">
                    <option value="" disabled selected>
                      A Questão é OBRIGATÓRIA
                    </option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.variable ? `${q.variable}` : `Q${q.id}`} — {q.title || "-"}
                      </option>
                    ))}
                  </select>
                </div>

                {!isNumber && (
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-sm text-gray-700 mb-1">Opção</label>
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
                )}

                <div className="col-span-12 md:col-span-4">
                  <label className="block text-sm text-gray-700 mb-1">Estado</label>
                  {!isNumber ? (
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
                  ) : (
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-7">
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
                      <div className="col-span-5">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) => setValue(e.target.value)}
                          className="w-full border-b-2 border-red-500 px-2 py-1 text-gray-800"
                          placeholder="Valor"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações +OU / +E */}
              <div className="flex items-center gap-3 mb-6">
                <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm opacity-70 cursor-not-allowed">
                  + OU
                </button>
                <button className="px-3 py-2 rounded bg-blue-600 text-white text-sm opacity-70 cursor-not-allowed">
                  + E
                </button>
              </div>

              {/* Ação: Pule para / Alvo */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-7">
                  <label className="block text-sm text-gray-700 mb-1">Pule para</label>
                  <select className="w-full border-b-2 border-gray-300 px-2 py-1 bg-transparent text-gray-800">
                    <option value="">Selecione</option>
                    {questions.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.variable ? `${q.variable}` : `Q${q.id}`} — {q.title || "-"}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <label className="block text-sm text-gray-700 mb-1">Alvo</label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                  >
                    <option value="" disabled>
                      O Alvo é OBRIGATÓRIO
                    </option>
                    {mockDestinations.map((dest) => (
                      <option key={dest} value={dest}>
                        {dest}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowRestrictModal(false)}
              >
                FECHAR
              </button>
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PULAR ================= */}
      {showSkipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Editar regra de pulo</h2>

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
              <div className="flex gap-4 mb-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">Opção</label>
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
                  <label className="block text-sm text-gray-700 mb-1">Estado</label>
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
            ) : (
              <div className="flex gap-4 mb-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-700 mb-1">Estado</label>
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
                  <label className="block text-sm text-gray-700 mb-1">Valor</label>
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
              <label className="block text-sm text-gray-700 mb-1">Destino</label>
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
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: VINCULAR ================= */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Vincular Questões</h2>

            <p className="text-sm text-gray-700 mb-4">
              Esta questão será exibida <strong>somente se</strong>:
            </p>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Questão condicional</label>
              <select className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800">
                <option value="" disabled>
                  Selecione uma questão
                </option>
                <option value="Q1">Q1 - Você tem filhos?</option>
                <option value="Q2">Q2 - Trabalha atualmente?</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-700 mb-1">Condição</label>
              <select className="w-full border-b-2 border-orange-500 focus:outline-none px-2 py-1 bg-transparent text-gray-800">
                <option value="" disabled>
                  Selecione uma condição
                </option>
                <option value="eq">é igual a</option>
                <option value="neq">é diferente de</option>
                <option value="sel">está selecionado</option>
                <option value="nsel">não está selecionado</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-700 mb-1">Valor esperado</label>
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
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: REORDENAR ================= */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-6 text-gray-800">Reordene as Questões</h2>

            <div className="grid grid-cols-12 items-center font-semibold border-b pb-2 mb-3 text-sm text-gray-600">
              <div className="col-span-3">Variável</div>
              <div className="col-span-6">Questão</div>
              <div className="col-span-2">Ordem</div>
              <div className="col-span-1 text-center"> </div>
            </div>

            {questions.map((q) => (
              <div key={q.id} className="grid grid-cols-12 items-center py-2 border-b text-sm">
                <div className="col-span-3 truncate">{q.variable || "-"}</div>
                <div className="col-span-6 truncate">{q.title || "-"}</div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={orders[q.id] || ""}
                    onChange={(e) => setOrders({ ...orders, [q.id]: Number(e.target.value) })}
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
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RECUSA ================= */}
      {showRefuseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-800">
              Configurar Recusa
            </h2>

            <p className="text-sm text-gray-700 mb-4">Se Q1 tem:</p>

            <div className="flex gap-4 mb-4">
              <div className="w-1/2">
                <label className="block text-sm text-gray-700 mb-1">Opção</label>
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
                <label className="block text-sm text-gray-700 mb-1">Estado</label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border-b-2 border-red-500 px-2 py-1 bg-transparent text-gray-800"
                >
                  <option value="" disabled>
                    O Estado é OBRIGATÓRIO
                  </option>
                  {mockStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-800 mb-6">então <strong>recuse</strong></p>

            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                onClick={() => setShowRefuseModal(false)}
              >
                FECHAR
              </button>
              <button className="px-4 py-2 rounded bg-orange-500 text-white opacity-60 cursor-not-allowed">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}

    </TooltipProvider>
  );
}
