import styled from "styled-components";

type LayoutProps = { noTransition?: boolean };

export const StyledLayout = styled.div<LayoutProps>`
  width: 100%;
  height: 100%;
  min-height: 100%;

  display: flex;
  flex-direction: column;
  justify-items: center;
  background-color: var(--color-bg-primary);
  overflow: hidden;

  & > main {
    flex: 1 1 auto;
    min-height: 0;
    height: 100%;
    animation: ${(p) => p.noTransition && "none"};
    &.compact {
      height: 100%;
      min-height: 0;
      flex: 1 1 auto;
    }
  }
`;
