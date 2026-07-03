// public/config/requestPageConfig.js
// Content for the public request flow's disclaimer and success screens.
// Edit the text here to update either screen — no other file needs to change.

export const REQUEST_PAGE_CONFIG = {
  disclaimer: {
    kicker: "Before you begin",
    title: "Please read before requesting",
    intro:
      "KYS Blood Connect helps route genuine blood requirements to nearby volunteer donors. Please read the points below before continuing.",
    points: [
      "This form is for genuine blood requirement requests only.",
      "Submit only once per requirement — duplicate requests slow down volunteers.",
      "A volunteer may contact you directly on the mobile number you provide.",
      "This is a coordination platform, not a blood bank — availability is never guaranteed.",
      "Spam or false submissions may result in future submissions being blocked.",
    ],
    agreeLabel: "I have read the above and confirm this is a genuine request.",
    continueLabel: "Continue to form",
  },

  success: {
    title: "Request submitted",
    message:
      "Your blood request has been received. Volunteers have been notified and will reach out shortly.",
    steps: [
      "Keep your phone reachable — a volunteer may call or WhatsApp you directly.",
      "Keep hospital details and reports ready in case a donor is arranged.",
      "If your requirement is fulfilled elsewhere, no further action is needed.",
    ],
    supportNote:
      "For urgent help, contact your local KYS Blood Connect coordinator directly.",
    submitAnotherLabel: "Submit another request",
  },
};