// ../config/requestSchema.js
/*
const renderers = {
    text: renderText,
    number: renderNumber,
    phone: renderPhone,
    select: renderSelect,
    counter: renderCounter,
    datetime: renderDateTime,
    textarea: renderTextarea,
    file: renderFile
};

*/

export const REQUEST_SCHEMA = {
  version: 1,

  sections: [
    {
      id: "patient",
      title: "Patient Information",

      fields: [
        {
          id: "patientName",
          label: "Patient Name",
          type: "text",
          dataType: "string",
          required: true,
          default: "",
          placeholder: "Full name of the patient",
        },

        {
          id: "gender",
          label: "Gender",
          type: "select",
          dataType: "string",
          options: ["Male", "Female"],
          required: true,
          default: "",
        },

        {
          id: "age",
          label: "Age",
          type: "number",
          dataType: "int",
          required: true,
          default: null,
        },

        {
          id: "bloodGroup",
          label: "Blood Group",
          type: "select",
          dataType: "string",
          options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
          required: true,
          default: "",
        },

        {
          id: "primaryMobile",
          label: "Primary Mobile",
          type: "phone",
          dataType: "string",
          required: true,
          default: "",
          placeholder: "10-digit mobile number, preferably Whatsapp",
        },

        {
          id: "alternateMobile",
          label: "Alternate Mobile",
          type: "phone",
          dataType: "string",
          required: false,
          default: "",
        },
      ],
    },

    {
      id: "hospital",
      title: "Hospital Information",

      fields: [
        {
          id: "hospitalName",
          label: "Hospital Name",
          type: "text",
          dataType: "string",
          required: true,
          default: "",
          placeholder: "Name of the hospital where patient is admitted",
        },

        {
          id: "area",
          label: "Area",
          type: "select",
          dataType: "string",
          options: ["North", "South", "East", "West"], //NEED TO POPULATE OPTIONS
          required: true,
          default: "",
        },

        {
          id: "referenceBy",
          label: "Reference By",
          type: "text",
          dataType: "string",
          required: false,
          default: "",
          placeholder: "Name of the person who referred you",
        },
      ],
    },

    {
      id: "blood",
      title: "Blood Requirement",

      fields: [
        {
          id: "pcvUnits",
          label: "PCV",
          type: "counter",
          dataType: "int",
          required: true,
          default: 0,
        },

        {
          id: "ffpUnits",
          label: "FFP",
          type: "counter",
          dataType: "int",
          required: true,
          default: 0,
        },

        {
          id: "sdpUnits",
          label: "SDP",
          type: "counter",
          dataType: "int",
          required: true,
          default: 0,
        },

        {
          id: "requiredBefore",
          label: "Required Before (Date : Time)",
          type: "datetime",
          dataType: "timestamp",
          required: true,
          default: "",
        },
      ],
    },

    // {
    //   id: "documents",
    //   title: "Documents",

    //   fields: [
    //     {
    //       id: "hospitalLetter",
    //       label: "Hospital Letter",
    //       type: "file",
    //       required: false,
    //       default: null,
    //     },
    //   ],
    // },

    {
      id: "remarks",
      title: "Remarks",

      fields: [
        {
          id: "remarks",
          label: "Remarks if any",
          type: "textarea",
          dataType: "string",
          required: false,
          default: "",
        },
      ],
    },
  ],
};

export function getAllRequestSchemaFields() {
    return REQUEST_SCHEMA.sections.reduce(
        (fields, section) => fields.concat(section.fields),
        []
    );
}
