
(function () {

    const $ = id => document.getElementById(id);

    // Load logged-in user's profile
    async function loadProfile() {

        try {

            const result = await apiRequest("/auth/me");

            const user = result.user;

            if (!user) {
                throw new Error("User information not found.");
            }

            // Get user information
            const fullName = user.fullName || user.name || "User";
            const email = user.email || "";

            // Display profile information
            $("profile-name").textContent = fullName;
            $("profile-email").textContent = email;

            $("n").value = fullName;
            $("e").value = email;

            // Generate avatar initials
            const initials = fullName
                .split(" ")
                .filter(Boolean)
                .map(word => word.charAt(0))
                .join("")
                .substring(0, 2)
                .toUpperCase();

            $("profile-avatar").textContent = initials;

        } catch (error) {

            console.error("Profile loading error:", error);

            $("profile-name").textContent = "Unable to load profile";
            $("profile-email").textContent = error.message;

            sessionStorage.removeItem("showbook.accessToken");
            sessionStorage.removeItem("showbook.user");

        }
    }


    // Logout functionality
    const logoutButton = $("logout-btn");

    if (logoutButton) {

        logoutButton.addEventListener("click", async function () {

            logoutButton.disabled = true;

            try {

                await apiRequest("/auth/logout", {
                    method: "POST"
                });

                sessionStorage.removeItem("showbook.accessToken");
                sessionStorage.removeItem("showbook.user");

                window.location.href = "login.html";

            } catch (error) {

                console.error("Logout error:", error);

                alert("Unable to log out. Please try again.");

                logoutButton.disabled = false;

            }

        });

    }

    // Run profile loading
    loadProfile();

})();
