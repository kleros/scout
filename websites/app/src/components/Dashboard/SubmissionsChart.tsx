import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip, Legend } from 'recharts';
import styled, { useTheme, keyframes, css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ChartContainer = styled.div`
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
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
    box-shadow: 0px 8px 32px rgba(125, 75, 255, 0.1);
  }
`;

const ChartTitle = styled.h3`
  color: var(--Secondary-blue, #7186FF);
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

const CHART_COLORS = {
  primary: '#7d4bff',
  tooltip: 'rgba(0, 0, 0, 0.8)',
  cursor: '#7d4bff',
} as const;

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

  const tooltipStyle = useMemo(() => ({
    backgroundColor: CHART_COLORS.tooltip,
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px'
  }), []);

  const cursorStyle = useMemo(() => ({
    stroke: CHART_COLORS.cursor,
    strokeWidth: 1,
    strokeDasharray: '3 3'
  }), []);

  const legendStyle = useMemo(() => ({
    paddingTop: '8px',
    fontSize: '10px'
  }), []);

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
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={CHART_CONFIG.opacity.gradientStart}/>
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={CHART_CONFIG.opacity.gradientEnd}/>
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
            <Legend wrapperStyle={legendStyle} />
            <Area
              type="monotone"
              dataKey="submissions"
              stroke={CHART_COLORS.primary}
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
