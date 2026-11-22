/**
 * The Code view's page (os-ui/PLUGINS.md, S6a-2), on its own origin
 * app://code-view. It reads the project's Code/ folder through the read
 * channel and its history through /api/code-view/git.
 */
const project = new URLSearchParams(location.search).get("project") ?? "";
const app = document.getElementById("app")!;
const root = document.createElement("div");
root.className = "tree-root";
root.textContent = `${project}/Code/`;
app.append(root);
