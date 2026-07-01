// config/jobSchema.js

import { REQUEST_SCHEMA, getAllRequestSchemaFields } from "./requestSchema.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Fields owned by the volunteer workflow.
 * These are NOT part of the public request form.
 */
export const JOB_SCHEMA = [
    {
        id: "status",
        label: "Status",
        type: "select",
        dataType: "string",
        required: true,
        default: "open",
        options: [
            "open",
            "claimed",
            "on_the_way",
            "done",
            "rejected"
        ]
    },

    {
        id: "claimedBy",
        label: "Claimed By",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "claimedByUid",
        label: "Claimed By UID",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "claimedAt",
        label: "Claimed At",
        type: "datetime",
        dataType: "timestamp",
        required: false,
        default: null
    },

    {
        id: "bloodBankId",
        label: "Blood Bank ID",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "bloodBankName",
        label: "Blood Bank",
        type: "text",
        dataType: "string",
        required: false,
        default: null,
        options: [
            "BB1",
            "BB2",
            "BB3",
        ]
    },

    {
        id: "completionNotes",
        label: "Completion Notes",
        type: "textarea",
        dataType: "string",
        required: false,
        default: ""
    },

    {
        id: "completedAt",
        label: "Completed At",
        type: "datetime",
        dataType: "timestamp",
        required: false,
        default: null
    },

    {
        id: "source",
        label: "Source",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "createdAt",
        label: "Created At",
        type: "datetime",
        dataType: "timestamp",
        required: false,
        default: null
    },

    {
        id: "updatedAt",
        label: "Updated At",
        type: "datetime",
        dataType: "timestamp",
        required: false,
        default: null
    },

    {
        id: "rejectedBy",
        label: "Rejected By",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "rejectedByUid",
        label: "Rejected By UID",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "rejectedAt",
        label: "Rejected At",
        type: "datetime",
        dataType: "timestamp",
        required: false,
        default: null
    },

    {
        id: "rejectionReason",
        label: "Rejection Reason",
        type: "text",
        dataType: "string",
        required: false,
        default: null
    },

    {
        id: "rejectionNote",
        label: "Rejection Note",
        type: "textarea",
        dataType: "string",
        required: false,
        default: ""
    }
];


export function getDefaultJobData(){
    const data = {};

    // Request fields
    for (const field of getAllRequestSchemaFields()) {
        data[field.id] = field.default ?? null;
    }

    // Workflow fields
    for (const field of JOB_SCHEMA) {
        data[field.id] = field.default;
    }

    return data;
}

/**
 * Converts a Firestore document into a complete Job object.
 */
export function createJob(id, firestoreData) {    
    return {
    id,
    ...getDefaultJobData(),
    ...firestoreData,
    };
}

const testJobData = {    "patientName": "Test_Name",
                "gender": "Male",
                "age": 80,
                "bloodGroup": "A-",
                "primaryMobile": "1234567890",
                "alternateMobile": "",
                "hospitalName": "Test_Hospital",
                "area": "Test_Area",
                "referenceBy": "Test_Reference_Name",

                "pcvUnits": 1,
                "ffpUnits": 1,
                "sdpUnits": 1,

                "remarks": "Test_Remarks",

                "requiredBefore": {
                  "seconds": 1782888120,
                  "nanoseconds": 0
                },
            
                "status": null,
            
                "claimedBy": null,
                "claimedByUid": null,
                "claimedAt": null,
            
                "bloodBankId": null,
                "bloodBankName": null,
            
                "completionNotes": "",
                "completedAt": null,
            
                "source": "blood_request_form",
            
                "createdAt": new Timestamp(1782888000, 0),
                "updatedAt": new Timestamp(1782888000, 0),
            
                "rejectedBy": null,
                "rejectedByUid": null,
                "rejectedAt": null,
                "rejectionReason": null,
                "rejectionNote": ""
            };

export function createTestJob(id, status, claimedBy = null, claimedByUid = null) {
    return {
        ...createJob(id, testJobData),
        status,
        claimedBy,
        claimedByUid,
    }
}