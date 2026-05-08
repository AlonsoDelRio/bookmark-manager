import { supabase } from "./supabase";

const API_BASE = import.meta.env["VITE_API_URL"] ?? "";

async function getAuthHeaders(): Promise<Record<string, string>> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error("Not authenticated");
    }
    return {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
    };
}

async function apiFetch<T>(
    path: string,
    options?: RequestInit
): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
    }

    if (res.status === 204) {
        return undefined as T;
    }
    return res.json() as Promise<T>;
}

export { apiFetch }