import type { UserProps } from "@/utils/types/user";

const BASE_API_URL = `${process.env.NEXT_PUBLIC_API_URL}/api`;

/* ======================================================
 * 🔐 TOKEN (usado apenas para rotas protegidas)
 * ====================================================== */
async function getServerAuthHeaders(): Promise<HeadersInit> {
    const res = await fetch("/api/token", {
        method: "GET",
        credentials: "include",
    });

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

/* ======================================================
 * 👤 PERFIL DO USUÁRIO LOGADO
 * ====================================================== */
export async function getUserProfile(): Promise<UserProps> {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/me`, {
        method: "GET",
        headers,
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Erro ao buscar perfil do usuário.");
    }

    return res.json();
}

/* ======================================================
 * ✏️ ATUALIZAR MEU PERFIL
 * ====================================================== */
type UpdateUserPayload = {
    username?: string;
    email?: string;
    password?: string;
};

export async function updateMyProfile(data: UpdateUserPayload) {
    const headers = await getServerAuthHeaders();

    const res = await fetch(`${BASE_API_URL}/me`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));

        throw new Error(
            error?.messages?.username ||
            error?.messages?.email ||
            error?.messages?.password ||
            error?.message ||
            "Erro ao atualizar perfil."
        );
    }

    return res.json(); // { message, user }
}

/* ======================================================
 * ➕ CRIAR USUÁRIO (REGISTER - SHIELD)
 * ====================================================== */
type CreateUserPayload = {
    username: string;
    email: string;
    password: string;
    password_confirm: string;
};

export async function createUser(data: CreateUserPayload) {
    const res = await fetch(`${BASE_API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({}));

        throw new Error(
            error?.messages?.email ||
            error?.messages?.username ||
            error?.messages?.password ||
            error?.message ||
            "Erro ao criar usuário."
        );
    }

    return res.json(); // { access_token }
}
