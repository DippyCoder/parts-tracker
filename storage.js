const STORAGE_KEY = "ppct:data";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [], parts: [] };
    const data = JSON.parse(raw);
    return {
      projects: Array.isArray(data.projects) ? data.projects.filter((p) => p && typeof p === "object") : [],
      parts: Array.isArray(data.parts) ? data.parts.filter((p) => p && typeof p === "object").map(normalizePart) : [],
    };
  } catch (e) {
    console.error("Failed to load data", e);
    return { projects: [], parts: [] };
  }
}

// Older saved data predates the optional/bought flags; default them to false.
function normalizePart(part) {
  return { ...part, optional: Boolean(part.optional), bought: Boolean(part.bought) };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getProject(id) {
  return loadData().projects.find((p) => p.id === id) || null;
}

function getPartsForProject(projectId) {
  return loadData().parts.filter((p) => p.projectId === projectId);
}

function createProject({ name, description }) {
  const data = loadData();
  const project = {
    id: uid(),
    name: name.trim(),
    description: (description || "").trim(),
    createdAt: Date.now(),
  };
  data.projects.push(project);
  saveData(data);
  return project;
}

function updateProject(id, { name, description }) {
  const data = loadData();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return null;
  project.name = name.trim();
  project.description = (description || "").trim();
  saveData(data);
  return project;
}

function deleteProject(id) {
  const data = loadData();
  data.projects = data.projects.filter((p) => p.id !== id);
  data.parts = data.parts.filter((p) => p.projectId !== id);
  saveData(data);
}

function createPart(projectId, fields) {
  const data = loadData();
  const part = {
    id: uid(),
    projectId,
    name: fields.name.trim(),
    description: (fields.description || "").trim(),
    purchaseUrl: fields.purchaseUrl.trim(),
    altUrl: (fields.altUrl || "").trim(),
    fullPrice: fields.fullPrice,
    neededPrice: fields.neededPrice,
    quantity: fields.quantity,
    optional: Boolean(fields.optional),
    bought: Boolean(fields.bought),
  };
  data.parts.push(part);
  saveData(data);
  return part;
}

function updatePart(id, fields) {
  const data = loadData();
  const part = data.parts.find((p) => p.id === id);
  if (!part) return null;
  part.name = fields.name.trim();
  part.description = (fields.description || "").trim();
  part.purchaseUrl = fields.purchaseUrl.trim();
  part.altUrl = (fields.altUrl || "").trim();
  part.fullPrice = fields.fullPrice;
  part.neededPrice = fields.neededPrice;
  part.quantity = fields.quantity;
  part.optional = Boolean(fields.optional);
  part.bought = Boolean(fields.bought);
  saveData(data);
  return part;
}

function deletePart(id) {
  const data = loadData();
  data.parts = data.parts.filter((p) => p.id !== id);
  saveData(data);
}

// A part's "resolved" unit price is the needed-quantity price when set,
// otherwise it falls back to the full (normal) price.
function partTotals(part) {
  const qty = Number(part.quantity) || 0;
  const fullPrice = Number(part.fullPrice) || 0;
  const hasNeeded = part.neededPrice !== null && part.neededPrice !== undefined && part.neededPrice !== "";
  const neededUnit = hasNeeded ? Number(part.neededPrice) : fullPrice;
  return {
    fullTotal: qty * fullPrice,
    neededTotal: qty * neededUnit,
    usedNeeded: hasNeeded,
  };
}

function projectTotals(parts) {
  return parts.reduce(
    (acc, part) => {
      const t = partTotals(part);
      acc.totalPrice += t.fullTotal;
      acc.neededPrice += t.neededTotal;
      if (part.optional) acc.hasOptional = true;
      else acc.requiredNeededPrice += t.neededTotal;
      if (!part.bought) acc.remainingPrice += t.neededTotal;
      return acc;
    },
    { totalPrice: 0, neededPrice: 0, requiredNeededPrice: 0, remainingPrice: 0, hasOptional: false }
  );
}

// Builds a self-contained JSON snapshot (each project nests its own parts)
// for the given project ids, or all projects if none are given.
function exportProjectsData(projectIds) {
  const data = loadData();
  const projects = projectIds
    ? data.projects.filter((p) => projectIds.includes(p.id))
    : data.projects;

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    projects: projects.map((project) => ({
      name: project.name,
      description: project.description,
      parts: data.parts
        .filter((part) => part.projectId === project.id)
        .map((part) => ({
          name: part.name,
          description: part.description,
          purchaseUrl: part.purchaseUrl,
          altUrl: part.altUrl,
          fullPrice: part.fullPrice,
          neededPrice: part.neededPrice,
          quantity: part.quantity,
          optional: Boolean(part.optional),
          bought: Boolean(part.bought),
        })),
    })),
  };
}

// Accepts the shape produced by exportProjectsData (or a single project
// object from that array). Always creates new projects/parts with fresh
// ids, so importing never overwrites existing data.
function importProjectsData(parsed) {
  const incoming = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.projects) ? parsed.projects : [parsed];

  const data = loadData();
  let projectCount = 0;
  let partCount = 0;

  for (const incomingProject of incoming) {
    if (!incomingProject || typeof incomingProject.name !== "string") continue;

    const project = {
      id: uid(),
      name: incomingProject.name.trim(),
      description: (incomingProject.description || "").trim(),
      createdAt: Date.now(),
    };
    data.projects.push(project);
    projectCount++;

    const parts = Array.isArray(incomingProject.parts) ? incomingProject.parts : [];
    for (const incomingPart of parts) {
      if (!incomingPart || typeof incomingPart.name !== "string" || typeof incomingPart.purchaseUrl !== "string") continue;

      data.parts.push({
        id: uid(),
        projectId: project.id,
        name: incomingPart.name.trim(),
        description: (incomingPart.description || "").trim(),
        purchaseUrl: incomingPart.purchaseUrl.trim(),
        altUrl: (incomingPart.altUrl || "").trim(),
        fullPrice: Number(incomingPart.fullPrice) || 0,
        neededPrice:
          incomingPart.neededPrice === null || incomingPart.neededPrice === undefined || incomingPart.neededPrice === ""
            ? null
            : Number(incomingPart.neededPrice),
        quantity: Math.max(1, Number(incomingPart.quantity) || 1),
        optional: Boolean(incomingPart.optional),
        bought: Boolean(incomingPart.bought),
      });
      partCount++;
    }
  }

  saveData(data);
  return { projectCount, partCount };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// "required (with optional)" when the project has optional parts.
function formatNeededPriceHtml(totals) {
  if (!totals.hasOptional) return formatCurrency(totals.neededPrice);
  return `${formatCurrency(totals.requiredNeededPrice)} <span class="price-optional">(${formatCurrency(totals.neededPrice)})</span>`;
}

function formatCurrency(value) {
  const n = Number(value) || 0;
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
