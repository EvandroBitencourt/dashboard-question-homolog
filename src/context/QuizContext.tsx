// context/QuizContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface QuizContextType {
  selectedQuizId: number | null;
  setSelectedQuizId: (id: number | null) => void;
  selectedQuizTitle: string;
  setSelectedQuizTitle: (title: string) => void;
  isClientReady: boolean;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [selectedQuizTitle, setSelectedQuizTitle] = useState<string>("");
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem("selectedQuizId");
    const storedTitle = localStorage.getItem("selectedQuizTitle");

    const parsedId = Number(storedId);
    if (!isNaN(parsedId) && parsedId > 0) {
      setSelectedQuizId(parsedId);
      setSelectedQuizTitle(storedTitle || "");
    } else {
      setSelectedQuizId(null);
      setSelectedQuizTitle("");
    }

    setIsClientReady(true);
  }, []);

  useEffect(() => {
    if (selectedQuizId !== null && selectedQuizId > 0) {
      localStorage.setItem("selectedQuizId", String(selectedQuizId));
      localStorage.setItem("selectedQuizTitle", selectedQuizTitle);
    } else {
      localStorage.removeItem("selectedQuizId");
      localStorage.removeItem("selectedQuizTitle");
    }
  }, [selectedQuizId, selectedQuizTitle]);

  return (
    <QuizContext.Provider
      value={{
        selectedQuizId,
        setSelectedQuizId,
        selectedQuizTitle,
        setSelectedQuizTitle,
        isClientReady,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
};

export const useQuiz = (): QuizContextType => {
  const context = useContext(QuizContext);
  if (!context) {
    throw new Error("useQuiz deve ser usado dentro de QuizProvider");
  }
  return context;
};
