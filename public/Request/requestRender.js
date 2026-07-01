import { REQUEST_SCHEMA } from "../config/requestSchema.js";

const container = document.getElementById("formContainer");

const renderers = {
  text: renderText,
  number: renderNumber,
  phone: renderPhone,
  select: renderSelect,
  counter: renderCounter,
  datetime: renderDateTime,
  textarea: renderTextarea,
  file: renderFile,
};

function renderForm(schema, container) {
  const form = document.createElement("form");
  form.id = "request-form";

  schema.sections.forEach((section) => {
    const sectionDiv = document.createElement("div");

    sectionDiv.innerHTML = `<h3>${section.title}</h3><br>`;

    section.fields.forEach((field) => {
      const element = renderField(field);

      if (element){
        // console.log("element", element);
        sectionDiv.appendChild(element);
      } 
    });

    form.appendChild(sectionDiv);
  });

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Submit Request";
  submitButton.className = "btn btn-primary btn-block";

  form.appendChild(submitButton);

  container.replaceChildren(form);
}

function createFieldWrapper(field, inputHtml) {
  const div = document.createElement("div");
  // div.className = "request-card";

  div.innerHTML = `
        <label class="field-label">${field.label}
        ${field.required ? '<span class="required">*</span>' : ""}
        ${inputHtml}
        </label>
        `;

  return div;
}

function renderText(field) {
  return createFieldWrapper(
    field,
    `
        <input
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            type="text"
            value="${field.default ?? ""}"
            maxlength="${field.maxLength ?? 100}"
            placeholder="${field.placeholder ?? field.id}"
            ${field.required ? "required" : ""}
            autocomplete="off"
        />
    `,
  );
}

function renderNumber(field) {
  return createFieldWrapper(
    field,
    `
        <input
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            type="number"
            value="${field.default ?? ""}"
            min="${field.min ?? 0}"
            max="${field.max ?? 150}"
            step="${field.step ?? 1}"
            ${field.required ? "required" : ""}
        />
    `,
  );
}

function renderPhone(field) {
  return createFieldWrapper(
    field,
    `
        <input
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            type="tel"
            value="${field.default ?? ""}"
            maxlength="10"
            inputmode="tel"
            pattern="[0-9]{10}"
            placeholder="9999999999"
            ${field.required ? "required" : ""}
        />
    `,
  );
}

function renderSelect(field) {
  const options = [
    `<option value="">Select...</option>`,
    ...field.options.map(
      (option) => `<option value="${option}">${option}</option>`,
    ),
  ].join("");

  return createFieldWrapper(
    field,
    `
        <select
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            ${field.required ? "required" : ""}
        >
            ${options}
        </select>
    `,
  );
}

function renderCounter(field) {
  return createFieldWrapper(
    field,
    `
    <div class="counter">
      <button type="button" 
                class="counter-btn counter-minus"
                data-counter-field="${field.id}" 
                data-counter-action="minus">−</button>
      <span id="${field.id}"
            name="${field.id}" 
            class="counter-value">${field.default ?? 0}</span>
      <button type="button" class="counter-btn counter-plus"
              data-counter-field="${field.id}" data-counter-action="plus">+</button>
    </div>
  `,
  );
}

function renderDateTime(field) {
  return createFieldWrapper(
    field,
    `
        <input
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            type="datetime-local"
            ${field.required ? "required" : ""}
        />
    `,
  );
}

function renderTextarea(field) {
  return createFieldWrapper(
    field,
    `
        <textarea
            id="${field.id}"
            name="${field.id}"
            class="textarea"
            rows="${field.rows ?? 4}"
            maxlength="${field.maxLength ?? 500}"
            placeholder="${field.placeholder ?? ""}"
        >${field.default ?? ""}</textarea>
    `,
  );
}

function renderFile(field) {
  return createFieldWrapper(
    field,
    `
        <input
            id="${field.id}"
            name="${field.id}"
            class="text-input"
            type="file"
            accept="${field.accept ?? ".pdf,.jpg,.jpeg,.png"}"
        />
    `,
  );
}

function renderField(field) {
  const renderer = renderers[field.type];
  if (!renderer) {
    console.warn(
      `Unsupported field type: "${field.type}" on field "${field.id}" — skipped.`,
    );
    return null;
  }
  return renderer(field);
}

renderForm(REQUEST_SCHEMA, container);
