
const API_BASE_URL = "http://localhost:4000/api";

async function apiRequest(endpoint, options = {}, retry = true) {

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

    // Handle empty response
    if (response.status === 204) {
        return null;
    }

    const data = await response.json();

    // Handle expired access token
    if (
        response.status === 401 &&
        data.error?.code === "TOKEN_EXPIRED" &&
        retry
    ) {
        const refreshResponse = await fetch(
            `${API_BASE_URL}/auth/refresh`,
            {
                method: "POST",
                credentials: "include"
            }
        );

        if (!refreshResponse.ok) {
            sessionStorage.removeItem("showbook.accessToken");
            sessionStorage.removeItem("showbook.user");

            window.location.href = "login.html";

            throw new Error("Session expired. Please log in again.");
        }

        const refreshData = await refreshResponse.json();

        sessionStorage.setItem(
            "showbook.accessToken",
            refreshData.accessToken
        );

        // Retry original request once
        return apiRequest(endpoint, options, false);
    }

    // Handle other errors
    if (!response.ok) {
        const error = new Error(
            data.error?.message || "Request failed"
        );

        error.code = data.error?.code;

        throw error;
    }

    return data;
}

