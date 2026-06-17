// CR-80 card at 300 DPI
export const CR80 = { w: 1012, h: 638 };

// Preview scaling factor for the canvas display
export const PREVIEW_SCALE = 0.62;

// Google Fonts import URL
export const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700;800;900&family=Archivo:wght@400;500;600;700;800;900&family=Sora:wght@300;400;500;600;700;800&display=swap";

// Available card fonts
export const FONT_OPTIONS = [
  { label: "Outfit", value: "'Outfit', sans-serif" },
  { label: "Sora", value: "'Sora', sans-serif" },
  { label: "Archivo", value: "'Archivo', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
];

// Built-in element keys (cannot be deleted, only hidden)
export const BUILTIN_KEYS = ["photo", "companyName", "name", "title", "department", "employeeId"];

// Default element positions on the card (landscape)
export const DEFAULT_ELEMENTS = {
  photo:       { x: 36,  y: 80,  w: 200, h: 260, label: "Photo",   visible: true, type: "photo" },
  companyName: { x: 750, y: 16,  w: 220, h: 40,  label: "Company", visible: true, type: "company", align: "left" },
  name:        { x: 280, y: 100, w: 400, h: 60,  label: "Name",    visible: true, type: "name",    align: "left" },
  title:       { x: 280, y: 180, w: 400, h: 36,  label: "Title",   visible: true, type: "title",   align: "left" },
  department:  { x: 280, y: 230, w: 300, h: 30,  label: "Dept",    visible: true, type: "dept",    align: "left" },
  employeeId:  { x: 30,  y: 600, w: 200, h: 28,  label: "ID",      visible: true, type: "id",      align: "left" },
};

// Default design settings
export const DEFAULT_DESIGN = {
  orientation: "landscape",
  fontFamily: "'Outfit', sans-serif",

  // Background
  bgType: "gradient",
  bgColor1: "#0c1220",
  bgColor2: "#1a2744",
  gradientDir: "diagonal",

  // Vector pattern overlay
  bgPattern: "none",
  patternColor: "#ffffff",
  patternOpacity: 0.06,
  patternOffsetX: 0,
  patternOffsetY: 0,
  patternScale: 1.0,

  // Accent bar
  accentColor: "#00d4aa",
  showAccentBar: true,
  accentBarPos: "left",
  accentBarSize: 8,

  // Company name / logo
  companyName: "CardsMadeEasy",
  companyNameColor: "#ff0000de",
  companyNameSize: 26,
  companyNameWeight: "700",
  logoSize: 44,

  // Photo
  showPhoto: true,
  photoShape: "rounded",
  photoRadius: 14,
  photoBorder: false,
  photoCropBias: 0.15,

  // Name text
  nameColor: "#ffffff",
  nameSize: 44,
  nameWeight: "700",

  // Title text
  showTitle: true,
  titleColor: "#ffffffaa",
  titleSize: 24,
  titleWeight: "500",

  // Department text
  showDept: true,
  deptColor: "#ffffff77",
  deptSize: 20,
  deptWeight: "400",

  // Employee ID
  showEmployeeId: true,
  idSize: 18,
  idPrefix: "ID-",

  // Lock mode
  masterPin: "",
};
