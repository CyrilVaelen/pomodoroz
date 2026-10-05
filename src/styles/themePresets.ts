export type ThemePresetItem = {
  id: string;
  nameKey: string;
  lightPrimary: string;
  lightRgb: string;
  darkPrimary: string;
  darkRgb: string;
};

export const THEME_PRESETS: ThemePresetItem[] = [
  {
    id: "default",
    nameKey: "themePreset.default",
    lightPrimary: "#007bc7",
    lightRgb: "0, 123, 199",
    darkPrimary: "#0098f7",
    darkRgb: "0, 152, 247",
  },
  {
    id: "emerald",
    nameKey: "themePreset.emerald",
    lightPrimary: "#00855f",
    lightRgb: "0, 133, 95",
    darkPrimary: "#07b583",
    darkRgb: "7, 181, 131",
  },
  {
    id: "violet",
    nameKey: "themePreset.violet",
    lightPrimary: "#6941c6",
    lightRgb: "105, 65, 198",
    darkPrimary: "#9b74f5",
    darkRgb: "155, 116, 245",
  },
  {
    id: "sunset",
    nameKey: "themePreset.sunset",
    lightPrimary: "#d9531e",
    lightRgb: "217, 83, 30",
    darkPrimary: "#f76b3b",
    darkRgb: "247, 107, 59",
  },
  {
    id: "ocean",
    nameKey: "themePreset.ocean",
    lightPrimary: "#088395",
    lightRgb: "8, 131, 149",
    darkPrimary: "#0eb5cd",
    darkRgb: "14, 181, 205",
  },
];

export const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? null : { r, g, b };
  }
  return null;
};

export const getRelativeLuminance = (
  r: number,
  g: number,
  b: number
): number => {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
};

export const rgbToHsl = (
  r: number,
  g: number,
  b: number
): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h, s, l };
};

export const hslToRgb = (
  h: number,
  s: number,
  l: number
): { r: number; g: number; b: number } => {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

export const getContrastRatio = (
  colorA: string,
  colorB: string
): number => {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return 1;
  const lumA = getRelativeLuminance(rgbA.r, rgbA.g, rgbA.b);
  const lumB = getRelativeLuminance(rgbB.r, rgbB.g, rgbB.b);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getContrastTextColor = (backgroundHex: string): string => {
  const rgb = hexToRgb(backgroundHex);
  if (!rgb) return "#ffffff";
  const whiteRatio = getContrastRatio(backgroundHex, "#ffffff");
  const darkSlateRatio = getContrastRatio(backgroundHex, "#111827");

  // 若与白字的对比度已满足 WCAG AA（>= 4.5:1，如经典蓝、深绿等），优先选用白字保证彩色背景视觉品质
  if (whiteRatio >= 4.5) {
    return "#ffffff";
  }

  // 此时白字对比度不足 4.5:1（例如 #808080 中灰仅 3.95:1、纯白、浅黄、浅灰等）：
  // 必须选用深色以满足文字可读性：
  // 若 #111827 满足至少 4.5:1，使用 #111827；
  // 否则（例如 #808080 时 slate 仅约 4.49:1），选用纯黑 #000000 保证实际对比度达到 5.32:1 >= 4.5:1
  if (darkSlateRatio >= 4.5) {
    return "#111827";
  }
  return "#000000";
};

export const getCompositeColor = (
  fgHex: string,
  alpha: number,
  bgHex: string
): string => {
  const fg = hexToRgb(fgHex) || { r: 0, g: 0, b: 0 };
  const bg = hexToRgb(bgHex) || { r: 255, g: 255, b: 255 };
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return rgbToHex(r, g, b);
};

export const LIGHT_THEME_SURFACES = [
  "#ffffff", // 页面底色、任务卡片底色、输入框底色、Modal 容器底色
  "#fafafa", // 次级底色（主题色卡底色、周计划底色）
  "#f3f3f3", // 三级底色（任务列表底色、hover 态）
];

export const DARK_THEME_SURFACES = [
  "#111d25", // 页面底色
  "#1c2830", // 次级底色（Modal 底色、周计划项、加载更多周按钮）
  "#202c34", // 三级底色（hover 态）
  "#2a363e", // 任务卡片底色、输入框底色、普通按钮底色
  "#2f3b43", // 任务卡片 hover 底色
  "#323e46", // 任务卡片 focus 底色、Popper 底色
];

export const getReadableColorOnSurfaces = (
  foregroundHex: string,
  surfaces: string | string[],
  isDark: boolean,
  targetContrast: number
): string => {
  const surfaceList = (
    Array.isArray(surfaces) ? surfaces : [surfaces]
  ).filter(Boolean);
  if (surfaceList.length === 0) return foregroundHex;

  const allSatisfied = (hex: string) =>
    surfaceList.every(
      (bg) => getContrastRatio(hex, bg) >= targetContrast
    );

  if (allSatisfied(foregroundHex)) {
    return foregroundHex;
  }

  const fgRgb = hexToRgb(foregroundHex);
  if (!fgRgb) return foregroundHex;
  const { h, s, l } = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
  const effectiveS = s === 0 ? 0.35 : s;
  const effectiveH = s === 0 ? 210 / 360 : h; // 纯黑/白/灰赋予中性偏蓝主色调

  if (!isDark) {
    // 浅色模式：沿色相向暗调加深直到所有浅色表面均满足对比度
    let currentL = l;
    while (currentL > 0) {
      currentL -= 0.01;
      const rgb = hslToRgb(
        effectiveH,
        effectiveS,
        Math.max(0, currentL)
      );
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      if (allSatisfied(hex)) {
        return hex;
      }
    }
    return "#000000";
  } else {
    // 暗色模式：沿色相向亮调提亮直到所有暗色表面均满足对比度
    let currentL = l;
    while (currentL < 1) {
      currentL += 0.01;
      const rgb = hslToRgb(
        effectiveH,
        effectiveS,
        Math.min(1, currentL)
      );
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      if (allSatisfied(hex)) {
        return hex;
      }
    }
    return "#ffffff";
  }
};

export const getReadableTextColorOnBackground = (
  foregroundHex: string,
  backgroundHexOrSurfaces: string | string[],
  targetContrast = 4.5
): string => {
  if (Array.isArray(backgroundHexOrSurfaces)) {
    const isDark = backgroundHexOrSurfaces.some((s) => {
      const rgb = hexToRgb(s);
      return rgb
        ? getRelativeLuminance(rgb.r, rgb.g, rgb.b) <= 0.4
        : false;
    });
    return getReadableColorOnSurfaces(
      foregroundHex,
      backgroundHexOrSurfaces,
      isDark,
      targetContrast
    );
  }
  const bgRgb = hexToRgb(backgroundHexOrSurfaces);
  const isDark = bgRgb
    ? getRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b) <= 0.4
    : false;
  return getReadableColorOnSurfaces(
    foregroundHex,
    [backgroundHexOrSurfaces],
    isDark,
    targetContrast
  );
};

export const getReadableBorderColorOnBackground = (
  foregroundHex: string,
  backgroundHexOrSurfaces: string | string[],
  targetContrast = 3.0
): string => {
  return getReadableTextColorOnBackground(
    foregroundHex,
    backgroundHexOrSurfaces,
    targetContrast
  );
};

export const getReadableFocusColorOnBackground = (
  foregroundHex: string,
  backgroundHexOrSurfaces: string | string[],
  targetContrast = 3.5
): string => {
  return getReadableTextColorOnBackground(
    foregroundHex,
    backgroundHexOrSurfaces,
    targetContrast
  );
};

export type ResolvedPrimaryTheme = {
  hex: string;
  rgb: string;
  buttonText: string;
  textPrimary: string;
  borderPrimary: string;
  focusPrimary: string;
};

export const resolvePrimaryColors = (
  presetId: string = "default",
  customColor: string | null = null,
  isDark: boolean = false
): ResolvedPrimaryTheme => {
  let hex: string;
  let rgbStr: string;

  if (customColor) {
    const rgb = hexToRgb(customColor);
    if (rgb) {
      hex = customColor.startsWith("#")
        ? customColor
        : `#${customColor}`;
      rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
    } else {
      const preset =
        THEME_PRESETS.find((p) => p.id === presetId) ||
        THEME_PRESETS[0];
      hex = isDark ? preset.darkPrimary : preset.lightPrimary;
      rgbStr = isDark ? preset.darkRgb : preset.lightRgb;
    }
  } else {
    const preset =
      THEME_PRESETS.find((p) => p.id === presetId) || THEME_PRESETS[0];
    hex = isDark ? preset.darkPrimary : preset.lightPrimary;
    rgbStr = isDark ? preset.darkRgb : preset.lightRgb;
  }

  const buttonText = getContrastTextColor(hex);

  // 构建当前主题下所有需要保障对比度的实际控件表面列表（含合成背景）
  const surfaces = isDark
    ? [
        ...DARK_THEME_SURFACES,
        // 任务卡片上主标题 Badge 叠加主色 12% 后的真实合成背景（以卡片基底 #2a363e 与 focus #323e46 为准）
        getCompositeColor(hex, 0.12, "#2a363e"),
        getCompositeColor(hex, 0.12, "#323e46"),
      ]
    : [
        ...LIGHT_THEME_SURFACES,
        // 浅色任务卡片上主标题 Badge 叠加主色 12% 后的真实合成背景（以白底为准）
        getCompositeColor(hex, 0.12, "#ffffff"),
      ];

  const textPrimary = getReadableColorOnSurfaces(
    hex,
    surfaces,
    isDark,
    4.5
  );
  const borderPrimary = getReadableColorOnSurfaces(
    hex,
    surfaces,
    isDark,
    3.0
  );
  const focusPrimary = getReadableColorOnSurfaces(
    hex,
    surfaces,
    isDark,
    3.5
  );

  return {
    hex,
    rgb: rgbStr,
    buttonText,
    textPrimary,
    borderPrimary,
    focusPrimary,
  };
};
