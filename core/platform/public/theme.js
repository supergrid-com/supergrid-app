// Runs before paint so the stored theme applies without a flash. See app/lib/platform.tsx.
(function () {
  try {
    var t = localStorage.getItem("sg.theme") || "system";
    var dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
    var a = localStorage.getItem("sg.adminTheme");
    if (a) document.documentElement.setAttribute("data-admin-theme", a);
  } catch (e) {}
})();
