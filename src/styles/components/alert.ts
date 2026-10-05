import styled from "styled-components";
import { themes } from "styles";

export const StyledAlert = styled.div`
  width: 100%;
  min-height: 4rem;

  margin-bottom: 1rem;
  padding: 0.8rem;

  border-radius: 2px;
  border: 1px solid var(--color-primary-border);
  background-color: rgba(var(--color-primary-rgb), 0.1);

  position: relative;

  header {
    h3 {
      color: var(--color-primary-text);
      font-size: 1.4rem;
      margin-bottom: 0.2rem;
    }

    p {
      color: var(--color-heading-text);
    }

    a {
      font-weight: 500;
      color: var(--color-primary-text);

      &:hover {
        text-decoration: underline;
      }
    }
  }
`;

export const StyledAlertCloseButton = styled.button`
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;

  width: 2.4rem;
  height: 2.4rem;

  color: var(--color-primary-text);

  border: none;
  border-radius: 10rem;
  background: transparent;

  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: ${themes.color.close};
  }

  & > svg {
    width: 1.8rem;
    height: 1.8rem;
    fill: currentColor;
  }
`;
