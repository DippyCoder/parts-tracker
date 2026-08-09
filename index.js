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
      <button class="card-delete" title="Delete project" aria-label="Delete project">&times;</button>
      <h3>${escapeHtml(project.name)}</h3>
      <p class="desc">${escapeHtml(project.description || "")}</p>
      <div class="card-stats">
        <span>${parts.length} part${parts.length === 1 ? "" : "s"}</span>
        <span>Total: <strong>${formatCurrency(totals.totalPrice)}</strong></span>
        <span>Needed: <strong>${formatCurrency(totals.neededPrice)}</strong></span>
      </div>
    `;

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

render();
