import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const EDGE_PATH =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 3008;
const DEBUG_PORT = 9226;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("1. 启动独立 Vite 生产预览 3008 服务...");
  const viteProcess = spawn(
    process.execPath,
    [
      "./node_modules/vite/bin/vite.js",
      "preview",
      "--config",
      "app/renderer/vite.config.mts",
      "--port",
      String(PORT),
      "--strictPort",
    ],
    { cwd: "D:\\工作台\\pomodoroz", stdio: "ignore" }
  );

  let viteReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`);
      if (res.ok) {
        viteReady = true;
        break;
      }
    } catch {}
    await sleep(250);
  }

  if (!viteReady) {
    viteProcess.kill();
    throw new Error("Vite 3008 启动超时");
  }
  console.log("Vite 3008 服务就绪");

  const tempUserDataDir = mkdtempSync(
    join(tmpdir(), "edge-verify-a14-rigorous-")
  );
  console.log("2. 启动 Edge 隔离测试实例，Profile 目录:", tempUserDataDir);

  const edgeProcess = spawn(
    EDGE_PATH,
    [
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${tempUserDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--headless=new",
      `http://localhost:${PORT}/`,
    ],
    { stdio: "ignore" }
  );

  let ws = null;
  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const listRes = await fetch(
          `http://127.0.0.1:${DEBUG_PORT}/json/list`
        );
        if (listRes.ok) {
          const list = await listRes.json();
          const page = list.find((p) => p.type === "page") || list[0];
          if (page && page.webSocketDebuggerUrl) {
            wsUrl = page.webSocketDebuggerUrl;
            break;
          }
        }
      } catch {}
      await sleep(200);
    }

    if (!wsUrl) {
      throw new Error("未获取到 Edge CDP 页面 WebSocket 地址");
    }
    console.log("Edge CDP 页面已连接:", wsUrl);

    ws = new WebSocket(wsUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let msgId = 1;
    const pending = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    const send = (method, params = {}) => {
      const id = msgId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const evalJs = async (expr) => {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(
          "JS 执行异常: " + JSON.stringify(res.exceptionDetails)
        );
      }
      return res.result ? res.result.value : undefined;
    };

    // 键盘 Tab 键物理按键分发
    const pressTab = async () => {
      await send("Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
        key: "Tab",
        code: "Tab",
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        windowsVirtualKeyCode: 9,
        nativeVirtualKeyCode: 9,
        key: "Tab",
        code: "Tab",
      });
      await sleep(120);
    };

    await send("Page.enable");
    await send("DOM.enable");
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });

    // 注入页面辅助测量与对比度算法
    const helperSource = `
      window.__parseColor = function(c) {
        if (!c) return { r: 255, g: 255, b: 255, a: 1 };
        c = c.trim();
        if (c.startsWith('#')) {
          const clean = c.replace('#', '');
          if (clean.length === 3) {
            return {
              r: parseInt(clean[0] + clean[0], 16),
              g: parseInt(clean[1] + clean[1], 16),
              b: parseInt(clean[2] + clean[2], 16),
              a: 1
            };
          }
          return {
            r: parseInt(clean.slice(0, 2), 16),
            g: parseInt(clean.slice(2, 4), 16),
            b: parseInt(clean.slice(4, 6), 16),
            a: 1
          };
        }
        const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/);
        if (m) {
          return {
            r: parseInt(m[1], 10),
            g: parseInt(m[2], 10),
            b: parseInt(m[3], 10),
            a: m[4] !== undefined ? parseFloat(m[4]) : 1
          };
        }
        return { r: 255, g: 255, b: 255, a: 1 };
      };

      window.__getLuminance = function(r, g, b) {
        const [rs, gs, bs] = [r/255, g/255, b/255].map(v =>
          v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        );
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };

      window.__calcContrastRatio = function(fg, bg) {
        const c1 = window.__parseColor(fg);
        const c2 = window.__parseColor(bg);
        const l1 = window.__getLuminance(c1.r, c1.g, c1.b);
        const l2 = window.__getLuminance(c2.r, c2.g, c2.b);
        const max = Math.max(l1, l2);
        const min = Math.min(l1, l2);
        return parseFloat(((max + 0.05) / (min + 0.05)).toFixed(2));
      };

      // 从当前元素向上遍历，逐层合成计算最终真实呈现的不透明有效背景 RGB
      window.__getEffectiveBgColor = function(el) {
        let cur = el;
        const layers = [];
        while (cur && cur !== document.documentElement) {
          const style = getComputedStyle(cur);
          const bg = style.backgroundColor;
          if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
            layers.push(bg);
            if (!bg.startsWith('rgba') || bg.endsWith(', 1)')) {
              break;
            }
          }
          cur = cur.parentElement;
        }
        const bodyBg = getComputedStyle(document.body).backgroundColor || 'rgb(255, 255, 255)';
        layers.push(bodyBg);

        let base = window.__parseColor(layers[layers.length - 1]);
        for (let i = layers.length - 2; i >= 0; i--) {
          const top = window.__parseColor(layers[i]);
          base = {
            r: Math.round(top.r * top.a + base.r * (1 - top.a)),
            g: Math.round(top.g * top.a + base.g * (1 - top.a)),
            b: Math.round(top.b * top.a + base.b * (1 - top.a)),
            a: 1
          };
        }
        return 'rgb(' + base.r + ', ' + base.g + ', ' + base.b + ')';
      };

      window.__setCustomColor = function(hex) {
        const input = document.querySelector('input[type="color"]');
        if (input) {
          const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          if (set) set.call(input, hex);
          else input.value = hex;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };

      window.__setPresetTheme = function(presetId) {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes(presetId));
        if (target) target.click();
      };

      // 真实切换暗色/亮色模式
      window.__setDarkMode = function(enable) {
        const checkbox = document.getElementById('dark-theme');
        if (checkbox && checkbox.checked !== enable) {
          checkbox.click();
        }
      };
    `;

    await send("Page.addScriptToEvaluateOnNewDocument", { source: helperSource });
    await evalJs(helperSource);

    console.log("\n=== 开始全面严格核验 A14 对比度、控件语义与键盘焦点 ===");

    // ==========================================
    // 专项 1: 真实键盘 Tab 键触发 :focus-visible 实测（浅色与暗色模式）
    // ==========================================
    console.log("\n[专项 1: 真实键盘 Tab 键触发 :focus-visible 键盘焦点实测]");
    await evalJs(`window.location.hash = '#/settings';`);
    await sleep(600);
    await evalJs(helperSource);

    // 确保浅色模式且主色为纯白 #ffffff
    await evalJs(`window.__setDarkMode(false);`);
    await sleep(300);
    await evalJs(`window.__setCustomColor('#ffffff');`);
    await sleep(400);

    console.log("  1.1 在浅色模式 + 纯白主色下，使用真实 Tab 键导航并核验焦点描边...");
    // 聚焦至页面起始，然后发送 Tab 键聚焦到主题色卡
    await evalJs(`(() => {
      const colorInput = document.querySelector('input[type="color"]');
      if (colorInput) colorInput.focus();
    })()`);
    await sleep(200);

    // 发送真实键盘 Tab 键
    await pressTab();

    const lightTabFocus = await evalJs(`(() => {
      const active = document.activeElement;
      if (!active) return { error: "无 activeElement" };
      const comp = getComputedStyle(active);
      const bg = window.__getEffectiveBgColor(active.parentElement || active);
      const outlineColor = comp.outlineColor;
      const ratio = window.__calcContrastRatio(outlineColor, bg);
      return {
        tag: active.tagName,
        text: active.textContent?.trim().slice(0, 20),
        outlineStyle: comp.outlineStyle,
        outlineWidth: comp.outlineWidth,
        outlineOffset: comp.outlineOffset,
        outlineColor,
        bg,
        ratio,
        matchesFocusVisible: active.matches(':focus-visible')
      };
    })()`);
    console.log("  浅色模式真实 Tab 聚焦实测结果:", lightTabFocus);
    if (lightTabFocus.error) throw new Error(lightTabFocus.error);
    if (lightTabFocus.ratio < 3.0) {
      throw new Error(`浅色模式下真实 Tab 键盘焦点对比度不足 3.0:1（杜绝白底白描边 1:1），实际为: ${lightTabFocus.ratio}`);
    }

    // 1.2 任务卡片键盘 Tab 聚焦测试
    console.log("  1.2 导航到待办列表，测试任务卡片真实 Tab 键盘聚焦...");
    await evalJs(`window.location.hash = '#/task-list';`);
    await sleep(600);
    await evalJs(helperSource);

    // 切换到列表视图并添加一张卡片
    await evalJs(`(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('列表'));
      if (listBtn) listBtn.click();
    })()`);
    await sleep(300);

    await evalJs(`(() => {
      const addListBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('添加另一个列表'));
      if (addListBtn) addListBtn.click();
    })()`);
    await sleep(200);

    await evalJs(`(() => {
      const input = document.querySelector('form input');
      if (input) {
        input.value = "焦点验证列表";
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    })()`);
    await sleep(400);

    await evalJs(`(() => {
      const addCardBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('卡片'));
      if (addCardBtn) addCardBtn.click();
    })()`);
    await sleep(200);

    await evalJs(`(() => {
      const area = document.querySelector('form textarea');
      if (area) {
        area.value = "键盘焦点测试卡片";
        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    })()`);
    await sleep(500);

    // 找到卡片并使用真实键盘 Tab 聚焦它
    const focusTargetFound = await evalJs(`(() => {
      const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent?.trim() === '键盘焦点测试卡片');
      const card = p ? (p.closest('[tabindex="0"]') || p.parentElement) : null;
      if (!card) return false;
      // 聚焦卡片前一个同级元素或自身，然后按 Tab
      card.focus();
      return true;
    })()`);
    if (!focusTargetFound) throw new Error("未找到可聚焦的任务卡片");
    await pressTab();

    const cardFocusMeasured = await evalJs(`(() => {
      const active = document.activeElement;
      const comp = getComputedStyle(active);
      const bg = window.__getEffectiveBgColor(active.parentElement || active);
      const outlineColor = comp.outlineColor;
      const ratio = window.__calcContrastRatio(outlineColor, bg);
      return {
        tag: active.tagName,
        outlineStyle: comp.outlineStyle,
        outlineWidth: comp.outlineWidth,
        outlineOffset: comp.outlineOffset,
        outlineColor,
        bg,
        ratio,
        matchesFocusVisible: active.matches(':focus-visible')
      };
    })()`);
    console.log("  任务卡片真实 Tab 聚焦实测结果:", cardFocusMeasured);
    if (cardFocusMeasured.ratio < 3.0) {
      throw new Error(`任务卡片键盘焦点对比度不足 3.0:1，实际为: ${cardFocusMeasured.ratio}`);
    }

    // 1.3 切换到暗色模式并测试暗色模式下的真实 Tab 键盘焦点
    console.log("  1.3 真实切换到暗色模式，测试暗色模式下键盘 Tab 焦点描边...");
    await evalJs(`window.location.hash = '#/settings';`);
    await sleep(500);
    await evalJs(helperSource);
    await evalJs(`window.__setDarkMode(true);`);
    await sleep(400);

    const isDarkNow = await evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--color-bg-primary').trim()`);
    console.log("  暗色模式生效验证 (--color-bg-primary):", isDarkNow);
    if (!isDarkNow.includes('17, 29, 37') && !isDarkNow.includes('#111d25')) {
      throw new Error(`暗色模式切换未生效，当前底色为: ${isDarkNow}`);
    }

    // 在暗色模式下测试纯黑主色 #000000 的键盘焦点
    await evalJs(`window.__setCustomColor('#000000');`);
    await sleep(300);

    await evalJs(`(() => {
      const colorInput = document.querySelector('input[type="color"]');
      if (colorInput) colorInput.focus();
    })()`);
    await pressTab();

    const darkTabFocus = await evalJs(`(() => {
      const active = document.activeElement;
      const comp = getComputedStyle(active);
      const bg = window.__getEffectiveBgColor(active.parentElement || active);
      const outlineColor = comp.outlineColor;
      const ratio = window.__calcContrastRatio(outlineColor, bg);
      return {
        tag: active.tagName,
        text: active.textContent?.trim().slice(0, 20),
        outlineStyle: comp.outlineStyle,
        outlineWidth: comp.outlineWidth,
        outlineOffset: comp.outlineOffset,
        outlineColor,
        bg,
        ratio,
        matchesFocusVisible: active.matches(':focus-visible')
      };
    })()`);
    console.log("  暗色模式真实 Tab 聚焦实测结果:", darkTabFocus);
    if (darkTabFocus.ratio < 3.0) {
      throw new Error(`暗色模式下真实 Tab 键盘焦点对比度不足 3.0:1，实际为: ${darkTabFocus.ratio}`);
    }

    // ==========================================
    // 专项 2: 浅色模式全场景真实目标控件实测（#808080、#ffffff、#000000 及预设）
    // ==========================================
    console.log("\n[专项 2: 浅色模式全场景真实目标控件对比度实测]");
    await evalJs(`window.__setDarkMode(false);`);
    await sleep(400);

    const testSchemes = [
      { name: "中灰 #808080", color: "#808080" },
      { name: "纯白 #ffffff", color: "#ffffff" },
      { name: "纯黑 #000000", color: "#000000" },
      { name: "经典蓝 (default)", preset: "default" },
      { name: "翡翠绿 (emerald)", preset: "emerald" },
      { name: "紫罗兰 (violet)", preset: "violet" },
      { name: "日落橙 (sunset)", preset: "sunset" },
      { name: "深海青 (ocean)", preset: "ocean" },
    ];

    for (const scheme of testSchemes) {
      console.log(`  2.x 测试浅色模式方案: ${scheme.name}...`);
      if (scheme.color) {
        await evalJs(`window.__setCustomColor('${scheme.color}');`);
      } else {
        await evalJs(`window.__setPresetTheme('${scheme.preset}');`);
      }
      await sleep(300);

      // 验证次级按钮（导出任务）
      const secBtnMeasure = await evalJs(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('导出'));
        if (!btn) return null;
        const comp = getComputedStyle(btn);
        const bg = window.__getEffectiveBgColor(btn);
        return {
          textColor: comp.color,
          borderColor: comp.borderColor,
          bg,
          textRatio: window.__calcContrastRatio(comp.color, bg),
          borderRatio: window.__calcContrastRatio(comp.borderColor, bg)
        };
      })()`);
      if (secBtnMeasure) {
        if (secBtnMeasure.textRatio < 4.5) {
          throw new Error(`浅色模式 ${scheme.name} 下次级按钮文字对比度不足 4.5:1: ${JSON.stringify(secBtnMeasure)}`);
        }
        if (secBtnMeasure.borderRatio < 3.0) {
          throw new Error(`浅色模式 ${scheme.name} 下次级按钮边框对比度不足 3.0:1: ${JSON.stringify(secBtnMeasure)}`);
        }
      }
    }

    // ==========================================
    // 专项 3: 暗色模式全场景真实目标控件实测（#000000、#ffffff、#808080 及预设）
    // ==========================================
    console.log("\n[专项 3: 暗色模式全场景真实目标控件对比度实测（重点核验 #1c2830 控件底色与合成背景）]");
    await evalJs(`window.__setDarkMode(true);`);
    await sleep(400);

    for (const scheme of testSchemes) {
      console.log(`  3.x 测试暗色模式方案: ${scheme.name}...`);
      if (scheme.color) {
        await evalJs(`window.__setCustomColor('${scheme.color}');`);
      } else {
        await evalJs(`window.__setPresetTheme('${scheme.preset}');`);
      }
      await sleep(300);

      // 1. 验证设置页次级按钮（导出任务）
      const darkSecBtnMeasure = await evalJs(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('导出'));
        if (!btn) return null;
        const comp = getComputedStyle(btn);
        const bg = window.__getEffectiveBgColor(btn);
        return {
          textColor: comp.color,
          borderColor: comp.borderColor,
          bg,
          textRatio: window.__calcContrastRatio(comp.color, bg),
          borderRatio: window.__calcContrastRatio(comp.borderColor, bg)
        };
      })()`);
      if (darkSecBtnMeasure) {
        if (darkSecBtnMeasure.textRatio < 4.5) {
          throw new Error(`暗色模式 ${scheme.name} 下次级按钮文字对比度不足 4.5:1: ${JSON.stringify(darkSecBtnMeasure)}`);
        }
        if (darkSecBtnMeasure.borderRatio < 3.0) {
          throw new Error(`暗色模式 ${scheme.name} 下次级按钮边框对比度不足 3.0:1: ${JSON.stringify(darkSecBtnMeasure)}`);
        }
      }
    }

    // 重点专项核验：暗色模式纯黑主色下，TaskScheduleModal “加载更多周”按钮（底色 #1c2830）与任务卡片 ParentBadge 合成背景
    console.log("\n[专项 4: 重点核验暗色纯黑主色在 #1c2830 控件底色与 ParentBadge 上的实测对比度]");
    await evalJs(`window.__setCustomColor('#000000');`);
    await sleep(400);

    await evalJs(`window.location.hash = '#/task-list';`);
    await sleep(600);
    await evalJs(helperSource);

    // 4.1 打开任务详情并打开计划弹层，实测“加载更多未来周”按钮（底色 #1c2830）
    await evalJs(`window.location.hash = '#/task-list';`);
    await sleep(600);
    await evalJs(helperSource);

    // 切换到列表视图点击任务打开详情
    await evalJs(`(() => {
      const listBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('列表'));
      if (listBtn) listBtn.click();
    })()`);
    await sleep(300);

    await evalJs(`(() => {
      const p = Array.from(document.querySelectorAll('p')).find(el => el.textContent?.trim() === '键盘焦点测试卡片');
      if (p) {
        let c = p.parentElement;
        while (c) {
          const propKey = Object.keys(c).find(k => k.startsWith('__reactProps'));
          if (propKey && c[propKey] && typeof c[propKey].onClick === 'function') {
            c[propKey].onClick({ preventDefault: () => {}, stopPropagation: () => {} });
            return;
          }
          c = c.parentElement;
        }
      }
    })()`);
    await sleep(500);

    // 点击设置计划打开弹层
    await evalJs(`(() => {
      const planBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && (b.textContent.includes('设置计划') || b.textContent.includes('修改计划')));
      if (planBtn) planBtn.click();
    })()`);
    await sleep(500);

    // 读取“加载更多未来周”按钮的实际 computed style 与有效底色
    const moreWeeksBtnMeasure = await evalJs(`(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('加载更多未来周'));
      if (!btn) return { error: "未找到加载更多未来周按钮" };
      const comp = getComputedStyle(btn);
      const effectiveBg = window.__getEffectiveBgColor(btn);
      const textRatio = window.__calcContrastRatio(comp.color, effectiveBg);
      const borderRatio = window.__calcContrastRatio(comp.borderColor, effectiveBg);
      return {
        text: btn.textContent?.trim(),
        textColor: comp.color,
        borderColor: comp.borderColor,
        effectiveBg,
        textRatio,
        borderRatio
      };
    })()`);
    console.log("  暗色纯黑主色下【加载更多未来周】按钮（底色 #1c2830）实测对比度:", moreWeeksBtnMeasure);
    if (moreWeeksBtnMeasure.error) throw new Error(moreWeeksBtnMeasure.error);
    if (moreWeeksBtnMeasure.textRatio < 4.5) {
      throw new Error(`【加载更多未来周】按钮文字对比度不足 4.5:1（当前为 ${moreWeeksBtnMeasure.textRatio}），未满足正文要求`);
    }
    if (moreWeeksBtnMeasure.borderRatio < 3.0) {
      throw new Error(`【加载更多未来周】按钮边框对比度不足 3.0:1（当前为 ${moreWeeksBtnMeasure.borderRatio}）`);
    }

    // 4.2 计划弹层控制按钮测试并点击“保存计划”
    const scheduleModalControlsMeasure = await evalJs(`(() => {
      const activeTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('周计划'));
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('保存计划'));
      const activeTabComp = activeTab ? getComputedStyle(activeTab) : null;
      const saveBtnComp = saveBtn ? getComputedStyle(saveBtn) : null;

      const activeTabRatio = activeTabComp ? window.__calcContrastRatio(activeTabComp.color, activeTabComp.backgroundColor) : null;
      const saveBtnRatio = saveBtnComp ? window.__calcContrastRatio(saveBtnComp.color, saveBtnComp.backgroundColor) : null;

      return {
        activeTabRatio,
        saveBtnRatio
      };
    })()`);
    console.log("  计划弹层控制按钮实测对比度:", scheduleModalControlsMeasure);
    if (scheduleModalControlsMeasure.activeTabRatio < 4.5) {
      throw new Error(`计划弹层 Tab 激活态对比度不足 4.5:1`);
    }
    if (scheduleModalControlsMeasure.saveBtnRatio < 4.5) {
      throw new Error(`保存计划主按钮对比度不足 4.5:1`);
    }

    // 切换到连续天数计划并点击保存计划
    await evalJs(`(() => {
      const dailyTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('连续'));
      if (dailyTab) dailyTab.click();
    })()`);
    await sleep(300);

    await evalJs(`(() => {
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('保存计划'));
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(600);

    // 4.3 切换回 5×5 矩阵视图，读取真实渲染的 ParentBadge DOM 元素
    await evalJs(`(() => {
      const matrixBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('5×5'));
      if (matrixBtn) matrixBtn.click();
    })()`);
    await sleep(600);

    const parentBadgeMeasure = await evalJs(`(() => {
      // 查找包含所属列表名称“焦点验证列表”的 ParentBadge 元素
      const badges = Array.from(document.querySelectorAll('span')).filter(el =>
        el.textContent?.includes('焦点验证列表')
      );
      const target = badges[0];
      if (!target) return { error: "未在 5×5 矩阵中找到真实 ParentBadge DOM 元素" };
      const comp = getComputedStyle(target);
      const effectiveBg = window.__getEffectiveBgColor(target);
      const ratio = window.__calcContrastRatio(comp.color, effectiveBg);
      return {
        text: target.textContent?.trim(),
        color: comp.color,
        effectiveBg,
        ratio
      };
    })()`);
    console.log("  5×5 矩阵中真实渲染的 ParentBadge 实际对比度实测:", parentBadgeMeasure);
    if (parentBadgeMeasure.error) throw new Error(parentBadgeMeasure.error);
    if (parentBadgeMeasure.ratio < 4.5) {
      throw new Error(`ParentBadge 真实文字对比度不足 4.5:1: ${JSON.stringify(parentBadgeMeasure)}`);
    }

    // ==========================================
    // 专项 5: 计时器（Timer）界面真实元素在暗色模式下的实测断言
    // ==========================================
    console.log("\n[专项 5: 计时器界面大数字读数与延长时间按钮暗色实测]");
    await evalJs(`window.location.hash = '#/';`);
    await sleep(600);
    await evalJs(helperSource);

    const timerDarkMeasure = await evalJs(`(() => {
      const h3 = document.querySelector('h3');
      const comp = h3 ? getComputedStyle(h3) : null;
      const bg = h3 ? window.__getEffectiveBgColor(h3) : 'rgb(17, 29, 37)';
      const ratio = comp ? window.__calcContrastRatio(comp.color, bg) : null;
      return {
        timerColor: comp?.color,
        bg,
        ratio
      };
    })()`);
    console.log("  计时器大数字读数暗色实测对比度:", timerDarkMeasure);
    if (!timerDarkMeasure.ratio || timerDarkMeasure.ratio < 4.5) {
      throw new Error(`计时器大数字文字对比度不足 4.5:1: ${JSON.stringify(timerDarkMeasure)}`);
    }

    console.log("\n=== A14 真实键盘 Tab 聚焦、亮/暗模式真实切换、多表面控件与合成背景对比度全部实测通过！===");
  } finally {
    if (ws) {
      try { ws.close(); } catch {}
    }
    try { edgeProcess.kill(); } catch {}
    try { viteProcess.kill(); } catch {}
    await sleep(200);
    try {
      rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error("执行失败:", err);
  process.exit(1);
});
