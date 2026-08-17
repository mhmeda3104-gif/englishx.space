function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️"
  }[type] || "ℹ️";
  
  toast.innerHTML = `<span>${icon}</span> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function initTheme() {
  const theme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButtonUI(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  updateThemeButtonUI(newTheme);
  
  showToast(`Switched to ${newTheme === "dark" ? "Dark" : "Light"} Mode! 🌓`, "success");
}

function updateThemeButtonUI(theme) {
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
}

// Ensure the theme initializes on load
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
});

// Expose to window for inline HTML handlers
window.showToast = showToast;
window.toggleTheme = toggleTheme;