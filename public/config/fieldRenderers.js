// public/config/fieldRenderers.js
export const fieldRenderers = {
  text: renderText,
  number: renderNumber,
  phone: renderPhone,
  select: renderSelect,
  counter: renderCounter,
  datetime: renderDateTime,
  textarea: renderTextarea,
  file: renderFile,
};

export function renderInput(field, value) {
  const renderer = fieldRenderers[field.type];
  if (!renderer) return null;
  return renderer(field, value);
}

function renderText(field, value) {
  return `<input id="edit-${field.id}" class="text-input" type="text"
    value="${esc(value ?? "")}" maxlength="${field.maxLength ?? 100}"
    ${field.required ? "required" : ""}/>`;
}
function renderNumber(field, value) {
  return `<input id="edit-${field.id}" class="text-input" type="number"
    value="${value ?? ""}" min="${field.min ?? 0}" max="${field.max ?? 150}"
    ${field.required ? "required" : ""}/>`;
}
function renderPhone(field, value) {
  return `<input id="edit-${field.id}" class="text-input" type="tel"
    value="${esc(value ?? "")}" maxlength="10" pattern="[0-9]{10}"
    ${field.required ? "required" : ""}/>`;
}
function renderSelect(field, value) {
  const opts = field.options.map(o =>
    `<option value="${o}" ${o === value ? "selected" : ""}>${o}</option>`
  ).join("");
  return `<select id="edit-${field.id}" class="text-input"
    ${field.required ? "required" : ""}><option value="">Select...</option>${opts}</select>`;
}
function renderCounter(field, value) {
  return `<div class="counter">
    <button type="button" class="counter-btn counter-minus" data-edit-counter="${field.id}" data-action="minus">−</button>
    <span id="edit-${field.id}" class="counter-value">${value ?? field.default ?? 0}</span>
    <button type="button" class="counter-btn counter-plus" data-edit-counter="${field.id}" data-action="plus">+</button>
  </div>`;
}
function renderDateTime(field, value) {
  const v = value?.toDate ? toLocalInput(value.toDate()) : "";
  return `<input id="edit-${field.id}" class="text-input" type="datetime-local" value="${v}"
    ${field.required ? "required" : ""}/>`;
}
function renderTextarea(field, value) {
  return `<textarea id="edit-${field.id}" class="textarea" rows="${field.rows ?? 3}"
    maxlength="${field.maxLength ?? 500}">${esc(value ?? "")}</textarea>`;
}
function renderFile() { return null; } // not editable inline

function toLocalInput(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function esc(s="") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}