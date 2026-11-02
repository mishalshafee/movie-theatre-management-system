// Front-end only: page-to-page flow and sample behaviour. No backend calls yet.
(function () {
  const $ = id => document.getElementById(id);
  const KEY = "showbook.booking", money = n => "$" + n.toFixed(2);
  const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY)) || { seats: [] }; } catch { return { seats: [] }; } };








 
  
// Password confirmation validation
const confirmPw = $("confirm-password");

if (confirmPw) {
    confirmPw.addEventListener("input", () => {
        confirmPw.setCustomValidity("");
    });
}

// Normal forms (excluding Login and Registration)
document.querySelectorAll(
    "form[data-next]:not(#SignupForm):not(#LoginForm)"
).forEach(f => f.addEventListener("submit", e => {

    e.preventDefault();

    if (f.hasAttribute("data-clear")) {
        sessionStorage.removeItem(KEY);
    }

    location.href = f.dataset.next;

}));

// Registration API connection
const signupForm = $("SignupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async function(e) {

        e.preventDefault();

        const fullName = $("fullname").value.trim();
        const email = $("email").value.trim();
        const password = $("password").value;
        const confirmPassword = $("confirm-password").value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        try {

            const result = await apiRequest("/auth/register", {

                method: "POST",

                body: JSON.stringify({
                    fullName: fullName,
                    email: email,
                    password: password
                })

            });

            alert("Registration successful!");

            window.location.href = "login.html";

        } catch (error) {

            alert(error.message);

        }

    });

}
// Login API connection
const loginForm = $("LoginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function(e) {

        e.preventDefault();

        const email = $("email").value.trim();
        const password = $("password").value;

        try {

            const result = await apiRequest("/auth/login", {

                method: "POST",

                body: JSON.stringify({
                    email: email,
                    password: password
                })

            });

            // Save login information
            if (result.accessToken) {
                sessionStorage.setItem("showbook.accessToken", result.accessToken);
            }

            if (result.user) {
                sessionStorage.setItem("showbook.user", JSON.stringify(result.user));
            }

            alert("Login successful!");

            window.location.href = "home.html";

        } catch (error) {

            alert(error.message);

        }

    });

}
























  // Forgot password: show the confirmation message.
  const forgot = $("ForgotForm");
  if (forgot) forgot.addEventListener("submit", e => {
    e.preventDefault();
    const m = $("message"); m.textContent = "If that email is registered, a reset link is on its way."; m.classList.add("show");
  });


})();






















