import styled from "styled-components";
import { themes } from "styles/themes";

export const StyledFocusExtensionPrompt = styled.section`
  width: calc(100% - 4rem);
  margin: 0 2rem 0.6rem;
  align-self: center;

  min-height: 3.8rem;
  padding: 0.4rem 0.7rem;

  display: grid;
  grid-template-columns: 1fr max-content max-content;
  align-items: center;
  gap: 0.6rem;

  color: var(--color-heading-text);
  border: 1px solid var(--color-border-primary);
  border-radius: 6px;
  background-color: var(--color-bg-secondary);
  box-shadow: 0 0.8rem 2.4rem -1.2rem var(--color-shadow-primary);

  animation: enterPrompt 160ms ease;

  @keyframes enterPrompt {
    0% {
      opacity: 0;
      transform: translateY(0.8rem);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

export const StyledFocusExtensionText = styled.p`
  min-width: 0;

  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  font-size: 1.2rem;
  font-weight: 500;
`;

export const StyledFocusExtensionButton = styled.button`
  min-width: 5.6rem;
  min-height: 2.6rem;
  padding: 0.35rem 0.7rem;

  color: var(--color-primary-text);
  border: 1px solid var(--color-primary-border);
  border-radius: 3px;
  background-color: var(--color-bg-primary);

  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;

  transition: ${themes.transition};

  &:hover,
  &:focus {
    color: var(--color-primary-button);
    background-color: var(--color-primary);
    box-shadow: 0 0 0 0.2rem rgba(var(--color-primary-rgb), 0.16);
  }
`;

export const StyledTimer = styled.main`
  width: 100%;
  height: 100%;

  flex: 1 1;

  padding-top: 1.2rem;

  display: flex;
  flex-direction: column;
  align-items: end;

  position: relative;

  &.compact {
    padding-top: 0;
    height: 100%;
    min-height: 0;
    flex: 1 1 auto;
    display: grid;
    grid-template-columns: 8rem minmax(0, 1fr);
    grid-template-rows: 7.2rem minmax(0, 1fr);
    align-content: stretch;
    align-items: stretch;

    & > :last-child {
      grid-column: 1 / -1;
      min-height: 0;
      align-self: stretch;
    }

    ${StyledFocusExtensionPrompt} {
      grid-column: 1 / -1;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
      margin: 0.6rem 0 0;
      box-shadow: none;
    }

    ${StyledFocusExtensionText} {
      grid-column: 1 / -1;
      white-space: normal;
      text-align: center;
    }

    ${StyledFocusExtensionButton} {
      min-width: 0;
    }
  }

  animation: enterFromBottom 160ms ease;

  @keyframes enterFromBottom {
    0% {
      opacity: 0;
      transform: translateY(1.2rem);
    }

    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
