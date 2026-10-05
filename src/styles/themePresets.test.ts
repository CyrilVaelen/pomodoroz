import { describe, expect, it } from "vitest";
import {
  THEME_PRESETS,
  getContrastRatio,
  getContrastTextColor,
  getReadableBorderColorOnBackground,
  getReadableTextColorOnBackground,
  getRelativeLuminance,
  hexToRgb,
  resolvePrimaryColors,
} from "./themePresets";

describe("themePresets - 基础转换与预设解析", () => {
  it("hexToRgb 能正确解析 3 位与 6 位十六进制色值", () => {
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#007bc7")).toEqual({ r: 0, g: 123, b: 199 });
    expect(hexToRgb("invalid")).toBeNull();
  });

  it("默认主题在亮色与暗色模式下返回对应的预设颜色", () => {
    const light = resolvePrimaryColors("default", null, false);
    expect(light.hex).toBe("#007bc7");
    expect(light.rgb).toBe("0, 123, 199");

    const dark = resolvePrimaryColors("default", null, true);
    expect(dark.hex).toBe("#0098f7");
    expect(dark.rgb).toBe("0, 152, 247");
  });

  it("各预设主题均能正确解析", () => {
    for (const preset of THEME_PRESETS) {
      const resLight = resolvePrimaryColors(preset.id, null, false);
      expect(resLight.hex).toBe(preset.lightPrimary);
      expect(resLight.rgb).toBe(preset.lightRgb);

      const resDark = resolvePrimaryColors(preset.id, null, true);
      expect(resDark.hex).toBe(preset.darkPrimary);
      expect(resDark.rgb).toBe(preset.darkRgb);
    }
  });

  it("自定义主色优先级高于预设主题", () => {
    const custom = resolvePrimaryColors("sunset", "#9c27b0", false);
    expect(custom.hex).toBe("#9c27b0");
    expect(custom.rgb).toBe("156, 39, 176");
  });

  it("未知预设回退到 default", () => {
    const fallback = resolvePrimaryColors("unknown", null, false);
    expect(fallback.hex).toBe("#007bc7");
    expect(fallback.buttonText).toBe("#ffffff");
  });
});

describe("themePresets - WCAG 实际对比度断言与颜色语义（A14 专项）", () => {
  const LIGHT_BG = "#ffffff";
  const DARK_BG = "#111d25";

  it("重点核验：#808080 中灰主色实测断言对比度 >= 4.5:1（避免原阈值误配白字 3.95:1）", () => {
    // 1. 验证如果配白字，对比度仅 3.95:1，不合规
    const whiteRatio = getContrastRatio("#808080", "#ffffff");
    expect(whiteRatio).toBeLessThan(4.0);
    expect(whiteRatio).toBeCloseTo(3.95, 1);

    // 2. 验证修复后算法自动为 #808080 选择纯黑字，对比度达到 5.32:1 >= 4.5:1
    const chosenBtnText = getContrastTextColor("#808080");
    expect(chosenBtnText).toBe("#000000");
    const actualBtnRatio = getContrastRatio("#808080", chosenBtnText);
    expect(actualBtnRatio).toBeGreaterThanOrEqual(4.5);
    expect(actualBtnRatio).toBeCloseTo(5.32, 1);

    // 3. 验证 resolvePrimaryColors 在亮色与暗色模式下，主按钮与主色文本对比度均 >= 4.5:1
    const resLight = resolvePrimaryColors("default", "#808080", false);
    const lightBtnRatio = getContrastRatio(
      resLight.hex,
      resLight.buttonText
    );
    expect(lightBtnRatio).toBeGreaterThanOrEqual(4.5);

    const lightTextRatio = getContrastRatio(
      LIGHT_BG,
      resLight.textPrimary
    );
    expect(lightTextRatio).toBeGreaterThanOrEqual(4.5);

    const resDark = resolvePrimaryColors("default", "#808080", true);
    const darkBtnRatio = getContrastRatio(
      resDark.hex,
      resDark.buttonText
    );
    expect(darkBtnRatio).toBeGreaterThanOrEqual(4.5);

    const darkTextRatio = getContrastRatio(
      DARK_BG,
      resDark.textPrimary
    );
    expect(darkTextRatio).toBeGreaterThanOrEqual(4.5);
  });

  it("重点核验：纯白 #ffffff 自定义主色，实测断言主按钮与主色文字对比度 >= 4.5:1（彻底杜绝白字白底）", () => {
    const resLight = resolvePrimaryColors("default", "#ffffff", false);
    // 填充主按钮文字对比度断言
    const btnRatio = getContrastRatio(
      resLight.hex,
      resLight.buttonText
    );
    expect(btnRatio).toBeGreaterThanOrEqual(4.5);
    expect(btnRatio).toBeGreaterThanOrEqual(15.0);

    // 主色文字控件在浅色背景上的对比度断言（杜绝白字白底）
    const textRatio = getContrastRatio(LIGHT_BG, resLight.textPrimary);
    expect(textRatio).toBeGreaterThanOrEqual(4.5);
    expect(resLight.textPrimary.toLowerCase()).not.toBe("#ffffff");

    // 次级边框在浅色背景上的对比度断言 >= 3.0:1
    const borderRatio = getContrastRatio(
      LIGHT_BG,
      resLight.borderPrimary
    );
    expect(borderRatio).toBeGreaterThanOrEqual(3.0);
  });

  it("重点核验：纯黑 #000000 自定义主色，实测断言主按钮与主色文字对比度 >= 4.5:1（彻底杜绝黑字黑底）", () => {
    const resDark = resolvePrimaryColors("default", "#000000", true);
    // 填充主按钮文字对比度断言
    const btnRatio = getContrastRatio(resDark.hex, resDark.buttonText);
    expect(btnRatio).toBeGreaterThanOrEqual(4.5);
    expect(btnRatio).toBeGreaterThanOrEqual(20.0);

    // 主色文字控件在暗色背景上的对比度断言（杜绝黑字黑底）
    const textRatio = getContrastRatio(DARK_BG, resDark.textPrimary);
    expect(textRatio).toBeGreaterThanOrEqual(4.5);
    expect(resDark.textPrimary.toLowerCase()).not.toBe("#000000");

    // 次级边框在暗色背景上的对比度断言 >= 3.0:1
    const borderRatio = getContrastRatio(
      DARK_BG,
      resDark.borderPrimary
    );
    expect(borderRatio).toBeGreaterThanOrEqual(3.0);
  });

  it("重点核验：临界亮度颜色（相对亮度约 0.179 处），实测断言主按钮前景色对比度 >= 4.5:1", () => {
    // 临界灰色测试：#757575 与 #767676 位于相对亮度 0.179 附近
    const criticalColors = ["#757575", "#767676", "#777777"];
    for (const color of criticalColors) {
      const textColor = getContrastTextColor(color);
      const ratio = getContrastRatio(color, textColor);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("重点核验：所有内置预设在亮色与暗色模式下，主按钮与主色文字实际对比度均 >= 4.5:1", () => {
    for (const preset of THEME_PRESETS) {
      // 亮色模式
      const light = resolvePrimaryColors(preset.id, null, false);
      const lightBtnRatio = getContrastRatio(
        light.hex,
        light.buttonText
      );
      expect(lightBtnRatio).toBeGreaterThanOrEqual(4.5);

      const lightTextRatio = getContrastRatio(
        LIGHT_BG,
        light.textPrimary
      );
      expect(lightTextRatio).toBeGreaterThanOrEqual(4.5);

      const lightFocusRatio = getContrastRatio(
        LIGHT_BG,
        light.focusPrimary
      );
      expect(lightFocusRatio).toBeGreaterThanOrEqual(3.0);

      // 暗色模式
      const dark = resolvePrimaryColors(preset.id, null, true);
      const darkBtnRatio = getContrastRatio(dark.hex, dark.buttonText);
      expect(darkBtnRatio).toBeGreaterThanOrEqual(4.5);

      const darkTextRatio = getContrastRatio(DARK_BG, dark.textPrimary);
      expect(darkTextRatio).toBeGreaterThanOrEqual(4.5);

      const darkFocusRatio = getContrastRatio(
        DARK_BG,
        dark.focusPrimary
      );
      expect(darkFocusRatio).toBeGreaterThanOrEqual(3.0);
    }
  });

  it("高亮浅黄 (#ffff00) 自定义主色，实测断言白底上主色文字对比度 >= 4.5:1", () => {
    const resLight = resolvePrimaryColors("default", "#ffff00", false);
    // 主按钮前景色对比度断言
    const btnRatio = getContrastRatio(
      resLight.hex,
      resLight.buttonText
    );
    expect(btnRatio).toBeGreaterThanOrEqual(4.5);

    // 主色文字控件在浅色背景上的对比度断言（杜绝黄字白底看不清）
    const textRatio = getContrastRatio(LIGHT_BG, resLight.textPrimary);
    expect(textRatio).toBeGreaterThanOrEqual(4.5);

    // 键盘焦点描边在浅色背景上的对比度断言 >= 3.0:1
    const focusRatio = getContrastRatio(
      LIGHT_BG,
      resLight.focusPrimary
    );
    expect(focusRatio).toBeGreaterThanOrEqual(3.0);
  });

  it("重点核验（键盘焦点与全控件场景）：纯白、纯黑、中灰及预设在浅色与暗色模式下，键盘焦点与控件文字对比度断言", () => {
    const testCases = [
      { name: "纯白主色", color: "#ffffff" },
      { name: "纯黑主色", color: "#000000" },
      { name: "中灰主色", color: "#808080" },
      { name: "临界灰", color: "#767676" },
      { name: "默认蓝", color: "#007bc7" },
      { name: "紫罗兰", color: "#6941c6" },
    ];

    for (const { name, color } of testCases) {
      // 1. 浅色界面（提示框、统计标记、计时器、任务卡片、链接、次级按钮、键盘焦点）
      const lightTheme = resolvePrimaryColors("default", color, false);
      const lightTextRatio = getContrastRatio(
        LIGHT_BG,
        lightTheme.textPrimary
      );
      const lightBorderRatio = getContrastRatio(
        LIGHT_BG,
        lightTheme.borderPrimary
      );
      const lightFocusRatio = getContrastRatio(
        LIGHT_BG,
        lightTheme.focusPrimary
      );

      // 文字类（提示框/统计标记/计时器大数字/任务卡片文字与图标/链接/次级按钮）>= 4.5:1
      expect(
        lightTextRatio,
        `${name} 浅色界面下文字对比度不足 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);

      // 边框类 >= 3.0:1
      expect(
        lightBorderRatio,
        `${name} 浅色界面下边框对比度不足 3.0:1`
      ).toBeGreaterThanOrEqual(3.0);

      // 键盘焦点指示器 >= 3.0:1（杜绝纯白主色下白底白描边 1:1）
      expect(
        lightFocusRatio,
        `${name} 浅色界面下键盘焦点对比度不足 3.0:1`
      ).toBeGreaterThanOrEqual(3.0);

      // 2. 暗色界面
      const darkTheme = resolvePrimaryColors("default", color, true);
      const darkTextRatio = getContrastRatio(
        DARK_BG,
        darkTheme.textPrimary
      );
      const darkBorderRatio = getContrastRatio(
        DARK_BG,
        darkTheme.borderPrimary
      );
      const darkFocusRatio = getContrastRatio(
        DARK_BG,
        darkTheme.focusPrimary
      );

      expect(
        darkTextRatio,
        `${name} 暗色界面下文字对比度不足 4.5:1`
      ).toBeGreaterThanOrEqual(4.5);

      expect(
        darkBorderRatio,
        `${name} 暗色界面下边框对比度不足 3.0:1`
      ).toBeGreaterThanOrEqual(3.0);

      expect(
        darkFocusRatio,
        `${name} 暗色界面下键盘焦点对比度不足 3.0:1`
      ).toBeGreaterThanOrEqual(3.0);
    }
  });

  it("重点核验（实际控件表面覆盖）：暗色模式下 #000000、#ffffff、#808080 及全部预设在实际控件底色 #1c2830、卡片底色 #2a363e 与徽章合成底色上文字对比度均 >= 4.5:1", () => {
    // 覆盖用户特别指出的问题：暗色黑色自定义主色在 #1c2830（加载更多周按钮等控件底色）上达到 >= 4.5:1
    const darkSurfaces = [
      { name: "次级面板/加载更多周按钮", bg: "#1c2830" },
      { name: "三级面板/hover态", bg: "#202c34" },
      { name: "任务卡片底色", bg: "#2a363e" },
      { name: "卡片hover底色", bg: "#2f3b43" },
      { name: "卡片focus/浮层底色", bg: "#323e46" },
    ];

    const testColors: Array<{
      name: string;
      color: string | null;
      preset?: string;
    }> = [
      { name: "纯黑主色", color: "#000000" },
      { name: "纯白主色", color: "#ffffff" },
      { name: "中灰主色", color: "#808080" },
      ...THEME_PRESETS.map((p) => ({
        name: p.id,
        color: null,
        preset: p.id,
      })),
    ];

    for (const item of testColors) {
      const darkTheme = resolvePrimaryColors(
        item.preset || "default",
        item.color,
        true
      );

      // 1. 在所有预定义暗色控件表面上的对比度断言
      for (const surface of darkSurfaces) {
        const textRatio = getContrastRatio(
          surface.bg,
          darkTheme.textPrimary
        );
        expect(
          textRatio,
          `${item.name} 在暗色控件底色 ${surface.name}(${surface.bg}) 上文字对比度不足 4.5:1，实测为 ${textRatio}`
        ).toBeGreaterThanOrEqual(4.5);

        const borderRatio = getContrastRatio(
          surface.bg,
          darkTheme.borderPrimary
        );
        expect(
          borderRatio,
          `${item.name} 在暗色控件底色 ${surface.name}(${surface.bg}) 上边框对比度不足 3.0:1，实测为 ${borderRatio}`
        ).toBeGreaterThanOrEqual(3.0);

        const focusRatio = getContrastRatio(
          surface.bg,
          darkTheme.focusPrimary
        );
        expect(
          focusRatio,
          `${item.name} 在暗色控件底色 ${surface.name}(${surface.bg}) 上焦点对比度不足 3.0:1，实测为 ${focusRatio}`
        ).toBeGreaterThanOrEqual(3.0);
      }

      // 2. 任务卡片上主标题 Badge 真实合成背景核验（0.12 * primary 叠在卡片基底 #2a363e 上）
      const fgRgb = hexToRgb(darkTheme.hex)!;
      const cardRgb = hexToRgb("#2a363e")!;
      const compR = Math.round(fgRgb.r * 0.12 + cardRgb.r * 0.88);
      const compG = Math.round(fgRgb.g * 0.12 + cardRgb.g * 0.88);
      const compB = Math.round(fgRgb.b * 0.12 + cardRgb.b * 0.88);
      const badgeBg = `#${[compR, compG, compB]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")}`;

      const badgeTextRatio = getContrastRatio(
        badgeBg,
        darkTheme.textPrimary
      );
      expect(
        badgeTextRatio,
        `${item.name} 在任务卡片 ParentBadge 合成背景(${badgeBg}) 上文字对比度不足 4.5:1，实测为 ${badgeTextRatio}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("重点核验（实际控件表面覆盖）：浅色模式下在 #ffffff、次级面板 #fafafa、三级底色 #f3f3f3 与徽章合成底色上文字对比度均 >= 4.5:1", () => {
    const lightSurfaces = [
      { name: "页面底色/白底", bg: "#ffffff" },
      { name: "次级面板", bg: "#fafafa" },
      { name: "三级底色/列表底色", bg: "#f3f3f3" },
    ];

    const testColors: Array<{
      name: string;
      color: string | null;
      preset?: string;
    }> = [
      { name: "纯黑主色", color: "#000000" },
      { name: "纯白主色", color: "#ffffff" },
      { name: "中灰主色", color: "#808080" },
      ...THEME_PRESETS.map((p) => ({
        name: p.id,
        color: null,
        preset: p.id,
      })),
    ];

    for (const item of testColors) {
      const lightTheme = resolvePrimaryColors(
        item.preset || "default",
        item.color,
        false
      );

      for (const surface of lightSurfaces) {
        const textRatio = getContrastRatio(
          surface.bg,
          lightTheme.textPrimary
        );
        expect(
          textRatio,
          `${item.name} 在浅色控件底色 ${surface.name}(${surface.bg}) 上文字对比度不足 4.5:1，实测为 ${textRatio}`
        ).toBeGreaterThanOrEqual(4.5);

        const borderRatio = getContrastRatio(
          surface.bg,
          lightTheme.borderPrimary
        );
        expect(
          borderRatio,
          `${item.name} 在浅色控件底色 ${surface.name}(${surface.bg}) 上边框对比度不足 3.0:1，实测为 ${borderRatio}`
        ).toBeGreaterThanOrEqual(3.0);

        const focusRatio = getContrastRatio(
          surface.bg,
          lightTheme.focusPrimary
        );
        expect(
          focusRatio,
          `${item.name} 在浅色控件底色 ${surface.name}(${surface.bg}) 上焦点对比度不足 3.0:1，实测为 ${focusRatio}`
        ).toBeGreaterThanOrEqual(3.0);
      }

      // 任务卡片上主标题 Badge 真实合成背景核验（0.12 * primary 叠在白底 #ffffff 上）
      const fgRgb = hexToRgb(lightTheme.hex)!;
      const compR = Math.round(fgRgb.r * 0.12 + 255 * 0.88);
      const compG = Math.round(fgRgb.g * 0.12 + 255 * 0.88);
      const compB = Math.round(fgRgb.b * 0.12 + 255 * 0.88);
      const badgeBg = `#${[compR, compG, compB]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")}`;

      const badgeTextRatio = getContrastRatio(
        badgeBg,
        lightTheme.textPrimary
      );
      expect(
        badgeTextRatio,
        `${item.name} 在浅色任务卡片 ParentBadge 合成背景(${badgeBg}) 上文字对比度不足 4.5:1，实测为 ${badgeTextRatio}`
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
