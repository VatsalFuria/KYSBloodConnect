import { BRAND_CONFIG } from "./config/brandConfig.js";

applyTheme(BRAND_CONFIG.theme);
applyLogo(BRAND_CONFIG.logoUrl);
applyBanner(BRAND_CONFIG.bannerUrl);
applyOrgName();

function applyTheme(theme = {}) {
  const varMap = {
    blue: "--blue",
    blueLight: "--blue-light",
    blueDark: "--blue-dark",
    green: "--green",
    greenLight: "--green-light",
    amber: "--amber",
    amberLight: "--amber-light",
    red: "--red",
    redLight: "--red-light",
  };
  const root = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(varMap)) {
    if (theme[key]) root.setProperty(cssVar, theme[key]);
  }
}

function applyLogo(url) {
  if (!url) return; // keep the fallback SVG already in the markup
  document.querySelectorAll("[data-brand-logo]").forEach((slot) => {
    slot.innerHTML = `<img src="${url}" alt="${escAttr(BRAND_CONFIG.orgName)}" class="brand-logo-img"/>`;
  });
}

function applyBanner(url) {
  document.querySelectorAll("[data-brand-banner]").forEach((slot) => {
    if (!url) return slot.classList.add("hidden");
    slot.innerHTML = `<img src="${url}" alt="" class="brand-banner-img"/>`;
    slot.classList.remove("hidden");
  });
}

function applyOrgName() {
  document.querySelectorAll("[data-brand-name]").forEach((el) => {
    el.textContent = BRAND_CONFIG.orgName;
  });
}

function escAttr(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
