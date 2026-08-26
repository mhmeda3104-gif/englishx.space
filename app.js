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
  const theme = localStorage.getItem("theme_v2") || "light";
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeButtonUI(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme_v2", newTheme);
  updateThemeButtonUI(newTheme);
  
  showToast(`Switched to ${newTheme === "dark" ? "Dark" : "Light"} Mode`, "success");
}

function updateThemeButtonUI(theme) {
  const btn = document.getElementById("themeToggleBtn");
  if (btn) {
    btn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }
}

// Ensure the theme initializes on load
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
});

// Interactive Mouse Glow Effect
document.addEventListener("mousemove", (e) => {
  const x = e.clientX;
  const y = e.clientY;
  document.documentElement.style.setProperty("--mouse-x", `${x}px`);
  document.documentElement.style.setProperty("--mouse-y", `${y}px`);
});

// Expose to window for inline HTML handlers
window.showToast = showToast;
window.toggleTheme = toggleTheme;