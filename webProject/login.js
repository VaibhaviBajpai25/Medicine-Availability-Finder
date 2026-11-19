const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#message");
const guestLogin = document.querySelector("#guestLogin");
const forgotPassword = document.querySelector("#forgotPassword");
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");

if (loginForm && loginMessage) {
    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
            sessionStorage.setItem("medifinder-pending-email", document.querySelector("#email")?.value.trim() || "");
        } catch {
            loginMessage.textContent = "Browser session storage is unavailable. You can still enter your email on the profile page.";
        }
        window.location.href = "profile.html";
    });
}

togglePassword?.addEventListener("click", () => {
    if (!passwordInput) return;
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    togglePassword.textContent = shouldShow ? "Hide" : "Show";
    togglePassword.setAttribute("aria-label", `${shouldShow ? "Hide" : "Show"} password`);
    togglePassword.setAttribute("aria-pressed", String(shouldShow));
});

const loginCard = document.querySelector(".login-card");
if (
    loginCard &&
    window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches
) {
    loginCard.addEventListener("pointermove", (event) => {
        const bounds = loginCard.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        loginCard.style.setProperty("--tilt-x", `${(y * -7).toFixed(2)}deg`);
        loginCard.style.setProperty("--tilt-y", `${(x * 9).toFixed(2)}deg`);
        loginCard.style.setProperty("--shine-x", `${((x + 0.5) * 100).toFixed(1)}%`);
        loginCard.style.setProperty("--shine-y", `${((y + 0.5) * 100).toFixed(1)}%`);
    });

    loginCard.addEventListener("pointerleave", () => {
        ["--tilt-x", "--tilt-y", "--shine-x", "--shine-y"].forEach((property) => {
            loginCard.style.removeProperty(property);
        });
    });
}

guestLogin?.addEventListener("click", () => {
    try {
        sessionStorage.removeItem("medifinder-pending-email");
    } catch {
        if (loginMessage) loginMessage.textContent = "Browser session storage is unavailable. You can still continue to profile setup.";
    }
    window.location.href = "profile.html";
});

forgotPassword?.addEventListener("click", () => {
    if (loginMessage) loginMessage.textContent = "Password recovery isn't available because account sign-in isn't connected yet.";
});
