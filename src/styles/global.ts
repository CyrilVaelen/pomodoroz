import { createGlobalStyle, css } from "styled-components";
import { darkTheme, lightTheme } from "./themes";
import { resolvePrimaryColors } from "./themePresets";

type GlobalTypes = {
  isDarkMode?: boolean;
  useNativeTitlebar?: boolean;
  themePreset?: string;
  customPrimaryColor?: string | null;
};

export const GlobalStyles = createGlobalStyle<GlobalTypes>`

  :root {
    ${(p) => {
      if (p.isDarkMode) {
        return darkTheme;
      }
      return lightTheme;
    }}

    ${(p) => {
      const {
        hex,
        rgb,
        buttonText,
        textPrimary,
        borderPrimary,
        focusPrimary,
      } = resolvePrimaryColors(
        p.themePreset,
        p.customPrimaryColor,
        Boolean(p.isDarkMode)
      );
      return css`
        --color-primary: ${hex};
        --color-primary-rgb: ${rgb};
        --color-primary-button: ${buttonText};
        --color-primary-text: ${textPrimary};
        --color-primary-border: ${borderPrimary};
        --color-primary-focus: ${focusPrimary};
        --color-bg-ripple-primary: rgba(${rgb}, 0.24);
        --color-border-progress: rgba(${rgb}, 0.16);
      `;
    }}
  }

  *,
  *::before,
  *::after {
    margin: 0;
    padding:0;
    box-sizing: border-box;
    user-select: none;
    font-family: inherit;
    font-size: inherit;
    color: currentColor;
  }

  *:focus-visible {
    outline: 2px solid var(--color-primary-focus);
    outline-offset: 2px;
  }

  html {
    width: 100%;
    height: 100%;
    height: 100dvh;

    font-size: 62.5%;
    font-family: Noto-Sans, san-serif;
    font-weight: normal;

    display: flex;
    align-items: center;
    justify-content: center;
  }

  html,
  body {
    overflow: hidden;
    box-sizing: inherit;

    background-color: var(--color-bg-primary);
  }

  #app {
    width: 100%;
    height: 100%;
  }

  body {
    font-size: 1.3rem;
    font-weight: 400;
    color: var(--color-body-text);

    width: 100%;
    height: 100%;
    height: 100dvh;
    border: ${(p) =>
      !p.useNativeTitlebar
        ? "1px solid var(--color-border-window)"
        : "none"};
    box-shadow: ${(p) =>
      !p.useNativeTitlebar && "0 1px 16px -4px rgba(0, 0, 0, 0.5)"};
    box-sizing: border-box;

    @media (max-width: 768px) {
      border: none;
      box-shadow: none;
    }
  }

  a {
    text-decoration: none;
    color: var(--color-primary-text);
    transition: color 120ms ease;

    &:hover {
      text-decoration: underline;
    }
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 500;
    color: var(--color-heading-text);
  }

  .ripple-hook {
    position: absolute;

    width: .5rem;
    height: .5rem;

    opacity: 0;

    border-radius: 50%;
    background-color: var(--color-bg-ripple-primary);

    animation: rippleEffect 1s;

    @keyframes rippleEffect {
      0% {
        transform: scale(1);
        opacity: 0.4;
      }
      100% {
        transform: scale(100);
        opacity: 0;
      }
    }
  }
`;
