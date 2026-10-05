import styled, { css } from "styled-components";
import { StyledScrollbar } from "styles/mixins";
import { themes } from "styles/themes";

export const StyledStatistics = styled.main`
  width: 100%;
  height: 100%;

  padding-left: 2rem;
  padding-right: 1.4rem;
  padding-bottom: 2rem;

  flex: 1 1;
  overflow: hidden scroll;

  animation: 320ms ${themes.enterFromRight} ease;

  ${StyledScrollbar};
`;

export const StyledStatisticsProgressPanel = styled.section`
  display: grid;
  gap: 1rem;

  padding: 1.2rem;

  border-radius: 3px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
`;

export const StyledStatisticsProgressHeader = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  small {
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--color-disabled-text);
  }
`;

export const StyledStatisticsProgressTrack = styled.div`
  display: grid;
  gap: 0.5rem;
`;

export const StyledStatisticsProgressMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
`;

export const StyledStatisticsProgressMetric = styled.div`
  display: grid;
  gap: 0.5rem;
  min-height: 5.8rem;
  padding: 0.8rem;

  border-radius: 3px;
  background-color: var(--color-bg-primary);

  span {
    font-size: 1rem;
    color: var(--color-disabled-text);
    text-transform: uppercase;
  }

  strong {
    min-width: 0;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--color-heading-text);
    overflow-wrap: anywhere;
  }
`;

export const StyledStatisticsMilestones = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  min-height: 2.4rem;
  align-items: center;
`;

export const StyledStatisticsMilestone = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  padding: 0 0.7rem;

  border-radius: 99px;
  color: var(--color-primary-text);
  border: 1px solid var(--color-primary-border);
  background-color: rgba(var(--color-primary-rgb), 0.08);
  font-size: 1rem;
  font-weight: 500;
  justify-self: center;
  line-height: 1.2;
  text-align: center;
`;

export const StyledStatisticsSummary = styled.section`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.8rem;
`;

export const StyledStatisticsCard = styled.article`
  min-height: 7.8rem;
  padding: 1rem;

  border-radius: 3px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
`;

export const StyledStatisticsCardLabel = styled.p`
  font-size: 1rem;
  color: var(--color-disabled-text);
  text-transform: uppercase;
`;

export const StyledStatisticsCardValue = styled.h4`
  margin-top: 0.6rem;

  font-size: 2rem;
  font-weight: 500;
  color: var(--color-heading-text);
`;

export const StyledStatisticsSection = styled.section`
  margin-top: 1.6rem;

  &:first-of-type {
    margin-top: 1rem;
  }
`;

export const StyledStatisticsSectionHeading = styled.h4`
  margin-bottom: 1rem;

  font-size: 1rem;
  font-weight: 500;
  color: var(--color-disabled-text);
  text-transform: uppercase;
`;

export const StyledStatisticsPeriodControl = styled.div`
  display: grid;
  max-width: 100%;
  margin-bottom: 1rem;
`;

export const StyledStatisticsHeatmap = styled.div`
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.5rem;
`;

const heatmapColors = [
  "var(--color-border-primary)",
  "rgba(var(--color-primary-rgb), 0.18)",
  "rgba(var(--color-primary-rgb), 0.32)",
  "rgba(var(--color-primary-rgb), 0.48)",
  "rgba(var(--color-primary-rgb), 0.68)",
  "rgba(var(--color-primary-rgb), 0.88)",
];

export const StyledStatisticsHeatmapCell = styled.span<{
  $intensity: number;
}>`
  aspect-ratio: 1;
  min-width: 0;
  border-radius: 3px;
  background-color: ${(p) =>
    heatmapColors[Math.min(Math.max(p.$intensity, 0), 5)]};
`;

export const StyledStatisticsWeekBars = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.7rem;
  align-items: end;
`;

export const StyledStatisticsWeekBar = styled.div`
  min-width: 0;
  display: grid;
  grid-template-rows: 6rem 1.6rem;
  gap: 0.5rem;
  align-items: end;

  span {
    width: 100%;
    min-height: 0.2rem;
    align-self: end;
    border-radius: 3px 3px 0 0;
    background-color: var(--color-primary);
  }

  small {
    color: var(--color-disabled-text);
    font-size: 0.9rem;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const StyledStatisticsRows = styled.div`
  display: grid;
  gap: 0.8rem;
`;

export const StyledStatisticsRow = styled.div`
  display: grid;
  align-items: center;
  gap: 0.6rem;
`;

export const StyledStatisticsRowMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  color: var(--color-heading-text);
`;

export const StyledStatisticsRowLabel = styled.p`
  max-width: 65%;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledStatisticsRowValue = styled.span`
  font-weight: 500;
  color: var(--color-heading-text);
`;

export const StyledStatisticsBar = styled.div`
  width: 100%;
  height: 0.8rem;

  border-radius: 99px;
  background-color: var(--color-border-primary);
  overflow: hidden;
`;

type StatisticsBarFillProps = {
  $variant: "focus" | "break" | "idle";
};

export const StyledStatisticsBarFill = styled.div<StatisticsBarFillProps>`
  height: 100%;
  border-radius: 99px;

  background-color: ${(p) =>
    p.$variant === "focus"
      ? "var(--color-primary)"
      : p.$variant === "break"
        ? "var(--color-yellow)"
        : "var(--color-disabled-text)"};
`;

export const StyledStatisticsStackedBar = styled.div`
  width: 100%;
  height: 0.9rem;

  display: flex;
  border-radius: 99px;
  overflow: hidden;
  background-color: var(--color-border-primary);
`;

export const StyledStatisticsCycleBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-width: 2rem;
  height: 2rem;
  padding: 0 0.6rem;

  border-radius: 99px;
  color: var(--color-primary-text);
  border: 1px solid var(--color-primary-border);
  background-color: rgba(var(--color-primary-rgb), 0.08);
  font-size: 1.1rem;
  font-weight: 500;
`;

export const StyledStatisticsActions = styled.div`
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.8rem;
`;

export const StyledStatisticsEmpty = styled.p`
  color: var(--color-disabled-text);
`;

export const StyledStatisticsLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1.4rem;

  margin-bottom: 1rem;
`;

const StatisticsLegendDot = css`
  content: "";
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 50%;
`;

export const StyledStatisticsLegendItem = styled.span<{
  $variant: "focus" | "break" | "idle";
}>`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-body-text);

  &::before {
    ${StatisticsLegendDot};
    background-color: ${(p) =>
      p.$variant === "focus"
        ? "var(--color-primary)"
        : p.$variant === "break"
          ? "var(--color-yellow)"
          : "var(--color-disabled-text)"};
  }
`;

export const StyledPeriodNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-top: 0.8rem;
`;

export const StyledPeriodLabel = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--color-heading-text);
  padding: 0 0.4rem;
`;

export const StyledPeriodButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.8rem;
  font-size: 1.1rem;
  border-radius: 3px;
  border: 1px solid var(--color-border-primary);
  background-color: var(--color-bg-secondary);
  color: var(--color-body-text);
  cursor: pointer;

  &:hover {
    background-color: var(--color-border-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
