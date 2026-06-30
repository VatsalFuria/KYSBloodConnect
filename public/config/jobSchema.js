// config/jobSchema.js

import { REQUEST_SCHEMA, getAllRequestSchemaFields } from "./requestSchema.js";

/**
 * Fields owned by the volunteer workflow.
 * These are NOT part of the public request form.
 */
export const JOB_SCHEMA = [
    { key: "status", defaultValue: "open" },

    { key: "claimedBy", defaultValue: null },
    { key: "claimedByUid", defaultValue: null },
    { key: "claimedAt", defaultValue: null },

    { key: "bloodBankId", defaultValue: null },
    { key: "bloodBankName", defaultValue: null },

    // { key: "pcvUnits", defaultValue: 0 },
    // { key: "ffpUnits", defaultValue: 0 },
    // { key: "sdpUnits", defaultValue: 0 },

    { key: "completionNotes", defaultValue: "" },
    { key: "completedAt", defaultValue: null },
    { key: "source", defaultValue: null},
    { key: "createdAt", defaultValue: null},
    { key: "updatedAt", defaultValue: null},

    { key: "rejectedBy", defaultValue: null },
    { key: "rejectedByUid", defaultValue: null },
    { key: "rejectedAt", defaultValue: null },
    { key: "rejectionReason", defaultValue: null },
    { key: "rejectionNote", defaultValue: "" }
];


export function getDefaultJobData(){
    const data = {};

    // Request fields
    for (const field of getAllRequestSchemaFields()) {
        data[field.key] = field.default ?? null;
    }

    // Workflow fields
    for (const field of JOB_SCHEMA) {
        data[field.key] = field.defaultValue;
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