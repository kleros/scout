import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import styled, { useTheme, css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { fadeIn } from 'styles/commonStyles';

const ChartContainer = styled.div`
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  box-shadow: ${({ theme }) => theme.shadowCard};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.6s ease-out;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 20px;
      border-radius: 16px;
    `
  )}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowPurple};
  }
`;

const ChartTitle = styled.h3`
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 12px 0;
  text-align: center;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 20px 0;
    `
  )}
`;

const ChartWrapper = styled.div`
  height: 200px;
  width: 100%;
  position: relative;
  min-height: 200px;

  ${landscapeStyle(
    () => css`
      height: 280px;
      flex: 1;
    `
  )}

  .recharts-wrapper {
    transition: all 0.3s ease;
  }

  .recharts-surface {
    overflow: visible;
  }
`;

interface ChartDataPoint {
  name: string;
  submissions: number;
}

interface SubmissionsChartProps {
  data: ChartDataPoint[];
  title?: string;
}

const CHART_CONFIG = {
  margin: { top: 5, right: 5, left: -5, bottom: 5 },
  strokeWidth: 2,
  opacity: {
    gridOpacity: 0.3,
    gradientStart: 0.8,
    gradientEnd: 0.1,
  },
} as const;

export const SubmissionsChart: React.FC<SubmissionsChartProps> = ({ data, title = "Submissions (Daily)" }) => {
  const theme = useTheme();

  const chartPrimary = theme.secondaryBlue;

  const tooltipStyle = useMemo(() => ({
    backgroundColor: theme.tooltipBackground,
    border: 'none',
    borderRadius: '8px',
    color: theme.white,
    fontSize: '12px'
  }), [theme.tooltipBackground, theme.white]);

  const cursorStyle = useMemo(() => ({
    stroke: chartPrimary,
    strokeWidth: 1,
    strokeDasharray: '3 3'
  }), [chartPrimary]);

  const tickStyle = useMemo(() => ({
    fill: theme.secondaryText,
    fontSize: 9
  }), [theme.secondaryText]);

  return (
    <ChartContainer>
      <ChartTitle>{title}</ChartTitle>
      <ChartWrapper>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_CONFIG.margin}>
            <defs>
              <linearGradient id="submissionsGradientHome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartPrimary} stopOpacity={CHART_CONFIG.opacity.gradientStart}/>
                <stop offset="95%" stopColor={chartPrimary} stopOpacity={CHART_CONFIG.opacity.gradientEnd}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.lightGrey}
              opacity={CHART_CONFIG.opacity.gridOpacity}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              height={40}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              width={40}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={cursorStyle}
            />
            <Area
              type="monotone"
              dataKey="submissions"
              stroke={chartPrimary}
              fillOpacity={1}
              fill="url(#submissionsGradientHome)"
              strokeWidth={CHART_CONFIG.strokeWidth}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </ChartContainer>
  );
};
