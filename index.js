const projectsArea = document.getElementById("projectsArea");
const projectDialog = document.getElementById("projectDialog");
const projectForm = document.getElementById("projectForm");
const projectDialogTitle = document.getElementById("projectDialogTitle");
const projectIdInput = document.getElementById("projectId");
const projectNameInput = document.getElementById("projectName");
const projectDescriptionInput = document.getElementById("projectDescription");

document.getElementById("newProjectBtn").addEventListener("click", () => {
  projectDialogTitle.textContent = "New Project";
  projectIdInput.value = "";
  projectNameInput.value = "";
  projectDescriptionInput.value = "";
  projectDialog.showModal();
});

document.getElementById("cancelProjectBtn").addEventListener("click", () => {
  projectDialog.close();
});

projectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = projectNameInput.value.trim();
  if (!name) return;
  const id = projectIdInput.value;
  if (id) {
    updateProject(id, { name, description: projectDescriptionInput.value });
  } else {
    createProject({ name, description: projectDescriptionInput.value });
  }
  projectDialog.close();
  render();
});

document.getElementById("exportAllBtn").addEventListener("click", () => {
  const data = exportProjectsData();
  if (data.projects.length === 0) {
    alert("No projects to export yet.");
    return;
  }
  downloadJson("projects-export.json", data);
});

const importFileInput = document.getElementById("importFileInput");

document.getElementById("importBtn").addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];
  if (!file) return;

  let result;
  try {
    const text = (await file.text()).replace(/^\uFEFF/, "");
    result = importProjectsData(JSON.parse(text));
  } catch (e) {
    console.error(e);
    alert(`Couldn't import that file: ${e.message}`);
    return;
  } finally {
    importFileInput.value = "";
  }

  const { projectCount, partCount } = result;
  if (projectCount === 0) {
    alert("No valid projects found in that file.");
    return;
  }
  alert(`Imported ${projectCount} project${projectCount === 1 ? "" : "s"} with ${partCount} part${partCount === 1 ? "" : "s"}.`);
  render();
});

function render() {
  const data = loadData();
  const projects = [...data.projects].sort((a, b) => b.createdAt - a.createdAt);

  if (projects.length === 0) {
    projectsArea.innerHTML = `
      <div class="empty-state">
        <p>No projects yet. Create one to start tracking parts and costs.</p>
      </div>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid";

  for (const project of projects) {
    const parts = getPartsForProject(project.id);
    const totals = projectTotals(parts);

    const card = document.createElement("a");
    card.className = "card";
    card.href = `project.html?id=${encodeURIComponent(project.id)}`;

    card.innerHTML = `
      <div class="card-toolbar">
        <button class="card-export" title="Export project as JSON" aria-label="Export project as JSON">&darr;</button>
        <button class="card-delete" title="Delete project" aria-label="Delete project">&times;</button>
      </div>
      <h3>${escapeHtml(project.name)}</h3>
      <p class="desc">${escapeHtml(project.description || "")}</p>
      <div class="card-stats">
        <span>${parts.length} part${parts.length === 1 ? "" : "s"}</span>
        <span>Total: <strong>${formatCurrency(totals.totalPrice)}</strong></span>
        <span>Needed: <strong>${formatNeededPriceHtml(totals)}</strong></span>
      </div>
    `;

    card.querySelector(".card-export").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadJson(`${slugify(project.name)}-export.json`, exportProjectsData([project.id]));
    });

    card.querySelector(".card-delete").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Delete project "${project.name}"? This will remove all its parts.`)) {
        deleteProject(project.id);
        render();
      }
    });

    grid.appendChild(card);
  }

  projectsArea.innerHTML = "";
  projectsArea.appendChild(grid);
}

function slugify(str) {
  return (
    str
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

render();
