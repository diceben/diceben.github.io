/* Theme toggle. Injected by JS on purpose: with JavaScript off the button never
   appears, and the page simply follows the operating system via
   prefers-color-scheme. Nothing else on the site depends on this file. */
(function () {
  "use strict";

  var root = document.documentElement;
  var footer = document.querySelector(".colophon");
  if (!footer) return;

  function stored() {
    try {
      return localStorage.getItem("theme");
    } catch (e) {
      return null;
    }
  }

  function systemPrefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function current() {
    var t = root.getAttribute("data-theme");
    if (t === "light" || t === "dark") return t;
    return systemPrefersDark() ? "dark" : "light";
  }

  var button = document.createElement("button");
  button.type = "button";
  button.className = "theme-toggle";

  function paint() {
    var dark = current() === "dark";
    button.textContent = dark ? "⇄ paper" : "⇄ carbon";
    button.setAttribute(
      "aria-label",
      "Switch to the " + (dark ? "paper (light)" : "carbon (dark)") + " theme",
    );
  }

  button.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
    paint();
  });

  // Follow the system while the visitor has not made an explicit choice.
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      if (!stored()) paint();
    });

  paint();
  footer.appendChild(button);
})();
