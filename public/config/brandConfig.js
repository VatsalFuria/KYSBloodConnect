// Single source of truth for NGO identity and color theme.
// Leave logoUrl/bannerUrl empty to keep the built-in fallback mark.
export const BRAND_CONFIG = {
  orgName: "KYS Blood Connect",
  tagline: "KYS Volunteer coordination for blood requests",

  logoUrl: "./icons/badge-72.png",    // e.g. "/branding/logo.png"
  bannerUrl: "../icons/KYS-banner.png",  // e.g. "/branding/banner.jpg" — shown on the public intake page only

  // Keys map 1:1 to the CSS custom properties already defined in app.css :root.
  // Omit a key to keep app.css's default.
  theme: {
    blue: "#1a56db",
    blueLight: "#e8f0fe",
    blueDark: "#1345b7",
    green: "#057a55",
    greenLight: "#def7ec",
    amber: "#92400e",
    amberLight: "#fef3c7",
    red: "#9b1c1c",
    redLight: "#fde8e8",
  },
};