const params = new URLSearchParams(window.location.search);
const projectId = params.get("id");

if (!projectId || !getProject(projectId)) {
  window.location.href = "index.html";
}

const projectNameEl = document.getElementById("projectName");
const projectDescriptionEl = document.getElementById("projectDescription");
const partsArea = document.getElementById("partsArea");
const statParts = document.getElementById("statParts");
const statTotal = document.getElementById("statTotal");
const statNeeded = document.getElementById("statNeeded");
const statSavings = document.getElementById("statSavings");

const projectDialog = document.getElementById("projectDialog");
const projectForm = document.getElementById("projectForm");
const projectNameInput = document.getElementById("projectNameInput");
const projectDescriptionInput = document.getElementById("projectDescriptionInput");

const partDialog = document.getElementById("partDialog");
const partForm = document.getElementById("partForm");
const partDialogTitle = document.getElementById("partDialogTitle");
const partIdInput = document.getElementById("partId");
const partNameInput = document.getElementById("partName");
const partDescriptionInput = document.getElementById("partDescription");
const partPurchaseUrlInput = document.getElementById("partPurchaseUrl");
const partAltUrlInput = document.getElementById("partAltUrl");
const partFullPriceInput = document.getElementById("partFullPrice");
const partNeededPriceInput = document.getElementById("partNeededPrice");
const partQuantityInput = document.getElementById("partQuantity");

document.getElementById("editProjectBtn").addEventListener("click", () => {
  const project = getProject(projectId);
  projectNameInput.value = project.name;
  projectDescriptionInput.value = project.description;
  projectDialog.showModal();
});

document.getElementById("cancelProjectBtn").addEventListener("click", () => {
  projectDialog.close();
});

projectForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = projectNameInput.value.trim();
  if (!name) return;
  updateProject(projectId, { name, description: projectDescriptionInput.value });
  projectDialog.close();
  render();
});

document.getElementById("addPartBtn").addEventListener("click", () => {
  openPartDialog();
});

document.getElementById("cancelPartBtn").addEventListener("click", () => {
  partDialog.close();
});

function openPartDialog(part) {
  if (part) {
    partDialogTitle.textContent = "Edit Part";
    partIdInput.value = part.id;
    partNameInput.value = part.name;
    partDescriptionInput.value = part.description;
    partPurchaseUrlInput.value = part.purchaseUrl;
    partAltUrlInput.value = part.altUrl;
    partFullPriceInput.value = part.fullPrice;
    partNeededPriceInput.value = part.neededPrice ?? "";
    partQuantityInput.value = part.quantity;
  } else {
    partDialogTitle.textContent = "Add Part";
    partIdInput.value = "";
    partForm.reset();
    partQuantityInput.value = 1;
  }
  partDialog.showModal();
}

partForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = partNameInput.value.trim();
  const purchaseUrl = partPurchaseUrlInput.value.trim();
  const fullPrice = partFullPriceInput.value;
  if (!name || !purchaseUrl || fullPrice === "") return;

  const neededPriceRaw = partNeededPriceInput.value;
  const fields = {
    name,
    description: partDescriptionInput.value,
    purchaseUrl,
    altUrl: partAltUrlInput.value,
    fullPrice: Number(fullPrice),
    neededPrice: neededPriceRaw === "" ? null : Number(neededPriceRaw),
    quantity: Math.max(1, Number(partQuantityInput.value) || 1),
  };

  const id = partIdInput.value;
  if (id) {
    updatePart(id, fields);
  } else {
    createPart(projectId, fields);
  }

  partDialog.close();
  render();
});

function render() {
  const project = getProject(projectId);
  if (!project) {
    window.location.href = "index.html";
    return;
  }

  projectNameEl.textContent = project.name;
  projectDescriptionEl.textContent = project.description || "";

  const parts = getPartsForProject(projectId).sort((a, b) => a.name.localeCompare(b.name));
  const totals = projectTotals(parts);

  statParts.textContent = parts.length;
  statTotal.textContent = formatCurrency(totals.totalPrice);
  statNeeded.textContent = formatCurrency(totals.neededPrice);
  statSavings.textContent = formatCurrency(totals.totalPrice - totals.neededPrice);

  if (parts.length === 0) {
    partsArea.innerHTML = `
      <div class="empty-state">
        <p>No parts yet. Add your first part to start tracking costs.</p>
      </div>
    `;
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");
  table.className = "parts-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Part</th>
        <th>Qty</th>
        <th>Full Price</th>
        <th>Needed Price</th>
        <th>Total</th>
        <th>Links</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  for (const part of parts) {
    const t = partTotals(part);
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <div class="part-name">${escapeHtml(part.name)}</div>
        ${part.description ? `<div class="part-desc">${escapeHtml(part.description)}</div>` : ""}
      </td>
      <td>${part.quantity}</td>
      <td>${formatCurrency(part.fullPrice)}</td>
      <td>${
        t.usedNeeded
          ? formatCurrency(part.neededPrice)
          : `<span class="price-fallback">&mdash;</span>`
      }</td>
      <td>
        <strong>${formatCurrency(t.neededTotal)}</strong>
        ${t.usedNeeded && t.neededTotal !== t.fullTotal ? `<div class="price-fallback">full: ${formatCurrency(t.fullTotal)}</div>` : ""}
      </td>
      <td>
        <div class="links">
          <a href="${escapeAttr(part.purchaseUrl)}" target="_blank" rel="noopener noreferrer">Buy</a>
          ${part.altUrl ? `<a href="${escapeAttr(part.altUrl)}" target="_blank" rel="noopener noreferrer">Alt</a>` : ""}
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="btn secondary small" data-action="edit">Edit</button>
          <button class="btn danger small" data-action="delete">Delete</button>
        </div>
      </td>
    `;

    tr.querySelector('[data-action="edit"]').addEventListener("click", () => openPartDialog(part));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (confirm(`Delete part "${part.name}"?`)) {
        deletePart(part.id);
        render();
      }
    });

    tbody.appendChild(tr);
  }

  wrap.appendChild(table);
  partsArea.innerHTML = "";
  partsArea.appendChild(wrap);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str);
}

render();
