import styled, { css } from "styled-components";
import { themes } from "styles/themes";
import { StyledScrollbar } from "styles/mixins";
import { StyledButton } from "styles";

export const StyledGridWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  width: 100%;
  overflow: hidden;
`;

export const StyledGridToolbar = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: ${(p) => (p.$compact ? "0.55rem 1rem" : "0.8rem 2rem")};
  border-bottom: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  flex-shrink: 0;
`;

export const StyledGridToolbarButton = styled.button<{
  $iconOnly?: boolean;
  $active?: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: ${(p) => (p.$iconOnly ? "0.4rem" : "0.4rem 0.8rem")};
  min-width: ${(p) => (p.$iconOnly ? "2rem" : "auto")};
  border: 1px solid var(--color-border-primary);
  border-radius: 3px;
  background-color: ${(p) =>
    p.$active ? "var(--color-primary)" : "var(--color-bg-primary)"};
  color: ${(p) =>
    p.$active ? "var(--color-bg-primary)" : "var(--color-body-text)"};
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  transition: ${themes.transition};

  svg {
    width: 1rem;
    height: 1rem;
    display: block;
  }

  &:hover {
    color: ${(p) =>
      p.$active
        ? "var(--color-primary-button)"
        : "var(--color-primary-text)"};
    border-color: var(--color-primary-border);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    color: var(--color-disabled-text);
    border-color: var(--color-border-primary);
  }

  &:disabled:hover {
    color: var(--color-disabled-text);
    border-color: var(--color-border-primary);
  }
`;

export const StyledGridCardShell = styled.div`
  position: relative;
  min-width: 0;
`;

export const StyledGridContent = styled.div<{ $compact?: boolean }>`
  flex: 1;
  min-height: 0;
  overflow-y: ${(p) => (p.$compact ? "scroll" : "auto")};
  overflow-x: hidden;
  scrollbar-gutter: stable;
  padding: ${(p) =>
    p.$compact ? "0.5rem 1rem 0.4rem" : "0.9rem 1rem 0.7rem"};
  background-color: var(--color-bg-primary);

  ${StyledScrollbar};
`;

export const StyledGridCards = styled.div<{
  $columns?: number;
  $compact?: boolean;
}>`
  display: grid;
  gap: 0.6rem;
  width: 100%;

  ${(p) =>
    p.$columns
      ? css`
          grid-template-columns: repeat(${p.$columns}, minmax(0, 1fr));
        `
      : css`
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
        `};
`;

export const StyledGridSeparator = styled.div`
  grid-column: 1 / -1;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-heading-text);
  text-transform: uppercase;
  padding: 0.45rem 0 0.25rem;
  border-bottom: 1px solid var(--color-border-primary);
  margin-top: 0.2rem;

  &:first-child {
    margin-top: 0;
  }
`;

export const StyledGridDivider = styled.div`
  grid-column: 1 / -1;
  min-height: 0.3rem;
  border-bottom: 1px solid var(--color-border-primary);
`;

type CardColorVariant = "green" | "red" | "neutral";

export const StyledGridCard = styled.button<{
  $color: CardColorVariant;
  $compact?: boolean;
  $active?: boolean;
  $grouped?: boolean;
  $withPriorityAction?: boolean;
}>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${(p) => (p.$grouped ? "0.2rem" : "0.3rem")};
  padding: ${(p) =>
    p.$grouped
      ? p.$compact
        ? "0.55rem 0.72rem"
        : "0.62rem 0.8rem"
      : "0.78rem 0.95rem"};
  padding-right: ${(p) =>
    p.$withPriorityAction
      ? p.$grouped
        ? p.$compact
          ? "2.35rem"
          : "2.45rem"
        : "2.65rem"
      : undefined};
  border-radius: 4px;
  cursor: pointer;
  transition: ${themes.transition};
  text-align: left;
  width: 100%;
  min-height: ${(p) =>
    p.$grouped ? (p.$compact ? "4rem" : "4.25rem") : "5.4rem"};

  ${(p) => {
    switch (p.$color) {
      case "green":
        return css`
          background: rgba(var(--color-green-rgb), 0.15);
          border: 2px solid var(--color-green);
        `;
      case "red":
        return css`
          background: rgba(var(--color-pink-rgb), 0.15);
          border: 2px solid var(--color-pink);
        `;
      default:
        return css`
          background: var(--color-bg-task-card);
          border: 2px solid var(--color-border-primary);
        `;
    }
  }}

  ${(p) =>
    p.$active &&
    css`
      border-color: rgba(var(--color-primary-rgb), 0.72);
    `}

  &:hover {
    box-shadow: ${(p) =>
      p.$active ? "none" : "0 2px 6px var(--color-shadow-primary)"};

    ${(p) =>
      p.$active &&
      css`
        border-color: var(--color-primary-border);
      `}
  }
`;

export const StyledGridPriorityButton = styled(StyledButton)<{
  $active?: boolean;
  $compact?: boolean;
}>`
  position: absolute;
  top: ${(p) => (p.$compact ? "0.32rem" : "0.38rem")};
  right: ${(p) => (p.$compact ? "0.32rem" : "0.38rem")};
  z-index: 1;
  width: ${(p) => (p.$compact ? "1.55rem" : "1.7rem")};
  height: ${(p) => (p.$compact ? "1.55rem" : "1.7rem")};
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  border: none;
  background-color: transparent;
  color: ${(p) =>
    p.$active ? "var(--color-yellow)" : "var(--color-disabled-text)"};
  cursor: pointer;
  transition: ${themes.transition};

  & > svg {
    width: 1.2rem;
    height: 1.2rem;
    margin: 0;
    display: block;
    fill: ${(p) => (p.$active ? "currentColor" : "none")};
    stroke: currentColor;
  }

  &:hover,
  &:focus {
    color: var(--color-yellow);
  }
`;

export const StyledGridCardTitle = styled.span`
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-body-text);
  text-transform: uppercase;
  text-shadow: none;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
`;

export const StyledGridCardTask = styled.span<{
  $done?: boolean;
  $placeholder?: boolean;
}>`
  font-size: 1.08rem;
  font-family: inherit;
  font-weight: 400;
  color: var(--color-body-text);
  line-height: 1.25;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-decoration: ${(p) => (p.$done ? "line-through" : "none")};
  opacity: ${(p) => (p.$done ? 0.72 : 1)};
  font-style: ${(p) => (p.$placeholder ? "italic" : "normal")};
`;

export const StyledGridFooter = styled.div<{ $compact?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${(p) => (p.$compact ? "0.5rem" : "0.8rem")};
  flex-wrap: wrap;
  padding: ${(p) => (p.$compact ? "0.35rem 1rem" : "0.5rem 2rem")};
  border-top: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  flex-shrink: 0;

  @media (max-width: 38rem) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

export const StyledGridStats = styled.span<{ $compact?: boolean }>`
  font-size: ${(p) => (p.$compact ? "1rem" : "1.1rem")};
  color: var(--color-body-text);
  min-width: 0;
`;

export const StyledGridHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  line-height: 1.2;
  color: var(--color-disabled-text);
  font-style: italic;
  margin-left: auto;

  @media (max-width: 38rem) {
    margin-left: 0;
  }
`;

export const StyledGridFooterControls = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-left: auto;
  flex-wrap: wrap;
`;

export const StyledGridColumns = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
`;

export const StyledGridColumnsLabel = styled.label`
  font-size: 0.95rem;
  color: var(--color-disabled-text);
`;

export const StyledGridColumnsSelect = styled.select`
  min-width: 4.4rem;
  padding: 0.2rem 1.4rem 0.2rem 0.45rem;
  border: 1px solid var(--color-border-primary);
  border-radius: 3px;
  background-color: var(--color-bg-primary);
  color: var(--color-body-text);
  font-size: 0.95rem;
  cursor: pointer;
  transition: ${themes.transition};
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image:
    linear-gradient(
      45deg,
      transparent 50%,
      var(--color-disabled-text) 50%
    ),
    linear-gradient(
      135deg,
      var(--color-disabled-text) 50%,
      transparent 50%
    );
  background-position:
    calc(100% - 0.75rem) calc(50% - 0.09rem),
    calc(100% - 0.5rem) calc(50% - 0.09rem);
  background-size:
    0.25rem 0.25rem,
    0.25rem 0.25rem;
  background-repeat: no-repeat;

  option {
    color: var(--color-body-text);
    background-color: var(--color-bg-primary);
  }

  &:hover {
    border-color: var(--color-primary-border);
  }
`;

export const StyledViewToggle = styled.div`
  display: flex;
  gap: 0.2rem;
  padding: 0.6rem 2rem 0;
  background-color: var(--color-bg-primary);
  flex-shrink: 0;
`;

export const StyledViewToggleButton = styled.button<{
  $active?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border-primary);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  font-size: 1.1rem;
  cursor: pointer;
  transition: ${themes.transition};

  ${(p) =>
    p.$active
      ? css`
          background-color: var(--color-bg-secondary);
          color: var(--color-heading-text);
          font-weight: 600;
        `
      : css`
          background-color: transparent;
          color: var(--color-body-text);

          &:hover {
            color: var(--color-heading-text);
            background-color: var(--color-bg-tertiary);
          }
        `}
`;
