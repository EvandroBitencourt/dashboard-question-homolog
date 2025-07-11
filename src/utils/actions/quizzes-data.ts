// Importa o tipo "quizzesProps" que representa a estrutura de um questionário (quiz)
import { quizzesProps } from "../types/quizzes";

// Define a URL base da API para acessar os questionários
const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/questionnaire`;

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

// 🔐 Função auxiliar para buscar o token de autenticação salvo no cookie HttpOnly
// Essa função faz uma chamada à rota interna /api/token e devolve os headers prontos
async function getServerAuthHeaders(): Promise<HeadersInit> {
  const res = await fetch("/api/token");

  if (!res.ok) {
    throw new Error("Token não encontrado");
  }

  const data = await res.json();

  return {
    Authorization: `Bearer ${data.token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ✅ Lista todos os questionários disponíveis na API
export async function listQuizzes() {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(API_URL, {
      method: "GET",
      headers,
      // "revalidate: 60" permite que o conteúdo seja cacheado por 60s antes de ser revalidado
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("Erro ao listar questionários");

    return await res.json();
  } catch (error) {
    console.error("Erro ao buscar os questionários:", error);
    return null;
  }
}

// ✅ Cria um novo questionário na API com os dados enviados
export async function createQuiz(data: quizzesProps) {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(data), // Converte os dados para JSON
    });

    if (!res.ok) {
      // Tenta extrair a mensagem de erro retornada pela API
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
      );
    }

    return await res.json(); // Retorna a resposta da API em JSON
  } catch (error) {
    console.error("Erro ao criar questionário", error);
    throw error;
  }
}

// ✅ Atualiza um questionário já existente (usando o ID)
export async function updateQuiz(id: number, data: quizzesProps) {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data), // Envia os dados atualizados
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
      );
    }

    return await res.json();
  } catch (error) {
    console.error("Erro ao atualizar questionário", error);
    throw error;
  }
}

export async function updateQuizStatusOnly(
  id: number,
  status: "active" | "test" | "disabled",
  change_level?: "low" | "high"
) {
  const headers = await getServerAuthHeaders();

  const payload: Record<string, any> = { status };
  if (change_level) payload.change_level = change_level;

  const res = await fetch(
    `${BASE_API_URL}/questionnaire-actions/status/${id}`,
    {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json", // importante!
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.messages?.status || "Erro ao atualizar status.");
  }

  return res.json();
}

// ✅ Exclui um questionário com base no ID fornecido
export async function deleteQuiz(id: number) {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
      );
    }

    return true; // Retorna true indicando sucesso
  } catch (error) {
    console.error("Erro ao deletar questionário", error);
    throw error;
  }

}

export async function listArchivedQuizzes() {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/questionnaire-archived`, {
      method: "GET",
      headers,
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error("Erro ao listar questionários arquivados");

    return await res.json();
  } catch (error) {
    console.error("Erro ao buscar os questionários arquivados:", error);
    return null;
  }
}

export async function restoreQuiz(id: number) {
  try {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/questionnaire-restore/${id}`, {
      method: "PUT",
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(
        `Erro da API: ${res.status} - ${errorData.message || res.statusText}`
      );
    }

    return await res.json();
  } catch (error) {
    console.error("Erro ao desarquivar questionário", error);
    throw error;
  }
}


