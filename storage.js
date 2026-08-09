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
      projects: Array.isArray(data.projects) ? data.projects : [],
      parts: Array.isArray(data.parts) ? data.parts : [],
    };
  } catch (e) {
    console.error("Failed to load data", e);
    return { projects: [], parts: [] };
  }
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
      return acc;
    },
    { totalPrice: 0, neededPrice: 0 }
  );
}

function formatCurrency(value) {
  const n = Number(value) || 0;
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
