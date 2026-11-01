
const API_BASE_URL = "http://localhost:4000/api";

async function apiRequest(endpoint, options = {}) {

    const token = sessionStorage.getItem("showbook.accessToken");

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {

        ...options,

        credentials: "include",

        headers: {
            "Content-Type": "application/json",

            ...(token ? {
                Authorization: `Bearer ${token}`
            } : {}),

            ...options.headers
        }

    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || data.error?.message || "Request failed"
        );
    }

    return data;
}
