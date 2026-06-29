// public/config/requestSchema.js

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
          required: true,
          default: ""
        },

        {
          id: "gender",
          label: "Gender",
          type: "select",
          options: ["Male", "Female"],
          required: true,
          default: ""
        },

        {
          id: "age",
          label: "Age",
          type: "number",
          required: true,
          default: null
        },

        {
          id: "bloodGroup",
          label: "Blood Group",
          type: "select",
          options: [
            "A+","A-",
            "B+","B-",
            "AB+","AB-",
            "O+","O-"
          ],
          required: true,
          default: ""
        },

        {
          id: "primaryMobile",
          label: "Primary Mobile",
          type: "phone",
          required: true,
          default: ""
        },

        {
          id: "alternateMobile",
          label: "Alternate Mobile",
          type: "phone",
          required: false,
          default: ""
        }

      ]
    },

    {
      id: "hospital",
      title: "Hospital Information",

      fields: [
        {
          id: "hospitalName",
          label: "Hospital Name",
          type: "text",
          required: true,
          default: ""
        },

        {
          id: "area",
          label: "Area",
          type: "select",
          options: ["North", "South", "East", "West"], //NEED TO POPULATE OPTIONS
          required: true,
          default: ""
        },

        {
          id: "referenceBy",
          label: "Reference By",
          type: "text",
          required: false,
          default: ""
        }
      ]
    },

    {
      id: "blood",
      title: "Blood Requirement",

      fields: [
        {
          id: "pcvUnits",
          label: "PCV",
          type: "counter",
          required: true,
          default: 0
        },

        {
          id: "ffpUnits",
          label: "FFP",
          type: "counter",
          required: true,
          default: 0
        },

        {
          id: "sdpUnits",
          label: "SDP",
          type: "counter",
          required: true,
          default: 0
        },

        {
          id: "requiredBefore",
          label: "Required Before",
          type: "datetime",
          required: true,
          default: "today"
        }
      ]
    },

    {
      id: "documents",
      title: "Documents",

      fields: [
        {
          id: "hospitalLetter",
          label: "Hospital Letter",
          type: "file",
          required: false,
          default: null
        }
      ]
    },

    {
      id: "remarks",
      title: "Remarks",

      fields: [
        {
          id: "remarks",
          label: "Remarks",
          type: "textarea",
          required: false,
          default: ""
        }
      ]
    }
  ]
};