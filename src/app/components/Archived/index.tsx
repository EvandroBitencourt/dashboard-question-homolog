"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Pencil, Undo } from "lucide-react";
import Swal from "sweetalert2";

import { quizzesProps } from "@/utils/types/quizzes";
import { listArchivedQuizzes, restoreQuiz } from "@/utils/actions/quizzes-data";

export default function Archived() {
  const router = useRouter();

  const [quizzes, setQuizzes] = useState<quizzesProps[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArchivedQuizzes = async () => {
    setLoading(true);
    const data = await listArchivedQuizzes();
    if (data) setQuizzes(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchArchivedQuizzes();
  }, []);

  const handleRestore = async (id: number) => {


    const result = await Swal.fire({
      title: "Desarquivar?",
      text: "Deseja desarquivar este questionário? Ele voltará para a lista ativa.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sim, desarquivar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await restoreQuiz(id);
        toast.success("Questionário desarquivado com sucesso!");

        router.push("/")
      } catch {
        toast.error("Erro ao desarquivar questionário.");
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-semibold mb-4">Questionários Arquivados</h1>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin text-3xl text-gray-500">
            <FaSpinner />
          </div>
        </div>
      ) : quizzes.length > 0 ? (
        <ul className="space-y-2">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="bg-gray-100 p-4 border rounded-md shadow-sm hover:shadow transition flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold text-lg">{quiz.title}</h3>
                <p className="text-sm text-gray-600">
                  Finalizado em:{" "}
                  {new Date(quiz.end_date).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleRestore(quiz.id)}
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Nenhum questionário arquivado encontrado.</p>
      )}
    </div>
  );
}
