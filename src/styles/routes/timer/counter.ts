import styled, { css } from "styled-components";
import type { CSSProperties } from "react";
import { TimerStatus } from "store/timer/types";
import { ProgressSVG } from "assets/icons";

export type ProgressProps = {
  offset: number;
  animate: "true" | "false";
  type?: TimerStatus;
};

const getProgressStyle = (offset: number): CSSProperties =>
  ({
    "--counter-progress-offset": `${offset}px`,
  }) as CSSProperties;

export const StyledCounterProgress = styled(
  ProgressSVG
).attrs<ProgressProps>((p) => ({
  style: getProgressStyle(p.offset),
}))<ProgressProps>`
  #progress {
    stroke: ${(p) =>
      (p.type === TimerStatus.SHORT_BREAK && "var(--color-green)") ||
      (p.type === TimerStatus.LONG_BREAK && "var(--color-yellow)") ||
      (p.type === TimerStatus.SPECIAL_BREAK && "var(--color-yellow)") ||
      "var(--color-primary-border)"};
    stroke-width: 0.6rem;
    stroke-linecap: round;
    stroke-dasharray: 674px;
    stroke-dashoffset: var(--counter-progress-offset);
    transition: ${(p) =>
      p.animate === "true" && "stroke-dashoffset 1s linear"};
  }
`;

export const StyledCounterWrapper = styled.div`
  width: 100%;
  height: 100%;

  position: absolute;
  top: 0;
  left: 0;

  display: grid;
  align-content: center;
  justify-content: center;
  justify-items: center;

  margin-top: -0.8rem;
`;

type CounterContainerProps = {
  fullscreen?: boolean;
};

export const StyledCounterContainer = styled.div<CounterContainerProps>`
  --counter-circle-size: min(22rem, calc(100vw - 4rem));

  width: 100%;
  min-height: 0;

  flex: 1 1;

  padding: 2rem;

  background-color: var(--color-bg-primary);

  position: relative;
  overflow: hidden;

  @supports (width: 1cqw) {
    container-type: size;
    --counter-circle-size: min(22rem, calc(100cqw - 4rem));
  }

  ${(p) =>
    p.fullscreen &&
    css`
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 1000 !important;

      &::before,
      ${StyledCounterProgress} {
        margin-top: -2.3rem !important;
      }

      ${StyledCounterWrapper} {
        margin-top: -3.1rem !important;
      }
    `}

  &::before,
  ${StyledCounterProgress} {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotateY(-180deg) rotateZ(-90deg);

    width: var(--counter-circle-size);
    height: var(--counter-circle-size);
  }

  &::before {
    content: "";

    border-radius: 50%;
    border: 6px solid var(--color-border-primary);
  }

  &.compact {
    width: 100%;
    height: 100%;
    min-height: 2.8rem;
    padding: 0 0.8rem;
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    overflow: visible;
    &::before {
      display: ${(p) => (p.fullscreen ? "auto" : "none")};
    }
  }
`;

export const StyledCounterType = styled.div`
  color: #666;
  text-align: center;
  padding-bottom: 0.4rem;

  & > svg {
    width: 4rem;
    height: 4rem;
    fill: currentColor;
  }

  @supports (width: 1cqw) {
    & > svg {
      width: clamp(2.4rem, 12cqw, 4rem);
      height: clamp(2.4rem, 12cqw, 4rem);
    }
  }
`;

type TimerProps = {
  type?: TimerStatus;
  hours: string;
  $hidden?: boolean;
} & CounterContainerProps;

export const StyledCounterTimer = styled.h3<TimerProps>`
  font-size: 4rem;
  font-weight: 400;
  min-height: 1.2em;
  color: ${(p) =>
    (p.type === TimerStatus.SHORT_BREAK && "var(--color-green)") ||
    (p.type === TimerStatus.LONG_BREAK && "var(--color-yellow)") ||
    (p.type === TimerStatus.SPECIAL_BREAK && "var(--color-yellow)") ||
    "var(--color-primary-text)"};

  ${(p) =>
    p.$hidden &&
    css`
      visibility: hidden;
    `}

  line-height: 1.2;

  width: 20rem;

  ${(p) =>
    Number(p.hours) > 0
      ? `
        display: flex;
        justify-content: center;
      `
      : `
        display: grid;
        align-items: center;
        justify-items: start;
        grid-template-columns: 1fr max-content 1fr;
        column-gap: 0.8rem;
      `}
  }}

  & > span:first-of-type {
    justify-self: end;
  }

  &.compact {
    font-size: ${(p) => (p.fullscreen ? "4rem" : "2.3rem")};
    width: unset;
    display: flex;
    gap: 0.25rem;
    white-space: nowrap;
  }

  @supports (width: 1cqw) {
    font-size: clamp(2.8rem, 12cqw, 4rem);
    width: min(20rem, calc(var(--counter-circle-size) - 1.6rem));
    column-gap: clamp(0.2rem, 1.6cqw, 0.8rem);

    &.compact {
      font-size: ${(p) => (p.fullscreen ? "4rem" : "2.3rem")};
      width: unset;
      white-space: nowrap;
    }
  }
`;

export const StyledCounterLabel = styled.p`
  font-size: 1.8rem;
  text-transform: capitalize;

  @supports (width: 1cqw) {
    font-size: clamp(1.2rem, 5cqw, 1.8rem);
  }
`;
