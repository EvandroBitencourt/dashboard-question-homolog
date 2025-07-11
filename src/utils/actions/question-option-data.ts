import { QuestionOptionProps } from "@/utils/types/question";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;
const BASE_URL = `${BASE_API_URL}/question-option`;

// 🛡️ Função para pegar o token do cookie (igual ao question-data.ts)
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

// ✅ Cria uma nova opção
export async function createQuestionOption(
    data: Omit<QuestionOptionProps, "id">
): Promise<QuestionOptionProps | null> {
    try {
        const headers = await getServerAuthHeaders();

        // 🔍 LOG para depurar o payload que está causando o erro 400
        console.log("🔍 Enviando para API (createQuestionOption):", data);

        const res = await fetch(BASE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            console.error("❌ Erro da API (createQuestionOption):", error); // 👈 Adicional
            throw new Error(
                `Erro da API: ${res.status} - ${error.message || res.statusText}`
            );
        }

        return await res.json();
    } catch (err) {
        console.error("Erro ao criar opção de pergunta:", err);
        return null;
    }
}


// Atualiza uma opção existente
export async function updateQuestionOption(
    id: number,
    data: Partial<QuestionOptionProps>
): Promise<QuestionOptionProps | null> {
    try {
        const headers = await getServerAuthHeaders();

        // Filtra campos undefined, null e mask:null
        const filteredData = Object.fromEntries(
            Object.entries(data).filter(([k, v]) => v !== undefined && v !== null && !(k === "mask" && v === null))
        );

        if (Object.keys(filteredData).length === 0) {
            throw new Error("Nenhum dado para atualizar.");
        }

        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(filteredData),
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(
                `Erro da API: ${res.status} - ${error.message || res.statusText}`
            );
        }

        return await res.json();
    } catch (err) {
        console.error("Erro ao atualizar opção de pergunta:", err);
        return null;
    }
}

// Remove uma opção existente
export async function deleteQuestionOption(id: number): Promise<boolean> {
    try {
        const headers = await getServerAuthHeaders();

        const res = await fetch(`${BASE_URL}/${id}`, {
            method: "DELETE",
            headers,
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(
                `Erro da API: ${res.status} - ${error.message || res.statusText}`
            );
        }

        return true;
    } catch (err) {
        console.error("Erro ao remover opção de pergunta:", err);
        return false;
    }
}

// Lista todas as opções de uma questão específica
export async function listQuestionOptionsByQuestionId(
  question_id: number
): Promise<QuestionOptionProps[]> {
  try {
    const headers = await getServerAuthHeaders();
    const res = await fetch(`${BASE_URL}?question_id=${question_id}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      throw new Error("Erro ao listar opções da questão");
    }

    return await res.json();
  } catch (err) {
    console.error("Erro ao buscar opções da questão:", err);
    return [];
  }
}
