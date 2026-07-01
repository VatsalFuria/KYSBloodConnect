// config/jobSchema.js

import { REQUEST_SCHEMA, getAllRequestSchemaFields } from "./requestSchema.js";
import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Fields owned by the volunteer workflow.
 * These are NOT part of the public request form.
 */
export const JOB_SCHEMA = [
    { id: "status", defaultValue: "open" },

    { id: "claimedBy", defaultValue: null },
    { id: "claimedByUid", defaultValue: null },
    { id: "claimedAt", defaultValue: null },

    { id: "bloodBankId", defaultValue: null },
    { id: "bloodBankName", defaultValue: null },

    // { id: "pcvUnits", defaultValue: 0 },
    // { id: "ffpUnits", defaultValue: 0 },
    // { id: "sdpUnits", defaultValue: 0 },

    { id: "completionNotes", defaultValue: "" },
    { id: "completedAt", defaultValue: null },
    { id: "source", defaultValue: null},
    { id: "createdAt", defaultValue: null},
    { id: "updatedAt", defaultValue: null},

    { id: "rejectedBy", defaultValue: null },
    { id: "rejectedByUid", defaultValue: null },
    { id: "rejectedAt", defaultValue: null },
    { id: "rejectionReason", defaultValue: null },
    { id: "rejectionNote", defaultValue: "" }
];


export function getDefaultJobData(){
    const data = {};

    // Request fields
    for (const field of getAllRequestSchemaFields()) {
        data[field.id] = field.default ?? null;
    }

    // Workflow fields
    for (const field of JOB_SCHEMA) {
        data[field.id] = field.defaultValue;
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

export function createTestJob(status, claimedBy = null, claimedByUid = null) {
    return {
        id: "test",

        ...{    "patientName": "Test_Name",
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
            
                "status": status,
            
                "claimedBy": claimedBy,
                "claimedByUid": claimedByUid,
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
            }               
        }
    };