import React, { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, ResponsiveContainer, AreaChart, Area, Tooltip, Legend } from 'recharts';
import styled, { useTheme, css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { fadeIn } from 'styles/commonStyles';

const ChartContainer = styled.div`
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: ${({ theme }) => theme.gradientCardSubtle};
  box-shadow: ${({ theme }) => theme.shadowCard};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${fadeIn} 0.6s ease-out;
  
  ${landscapeStyle(
    () => css`
      padding: 24px;
      border-radius: 16px;
    `
  )}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowPurple};
  }
`;

const ChartTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0 0 16px 0;
  text-align: center;
  letter-spacing: -0.3px;
  background: ${({ theme }) => theme.gradientChart};
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  ${landscapeStyle(
    () => css`
      font-size: 18px;
      margin-bottom: 24px;
    `
  )}
`;

const ChartWrapper = styled.div`
  height: 250px;
  width: 100%;
  position: relative;
  
  ${landscapeStyle(
    () => css`
      height: 300px;
    `
  )}
  
  .recharts-wrapper {
    transition: all 0.3s ease;
  }
`;

interface ChartDataPoint {
  name: string;
  submissions: number;
  disputes: number;
}

interface StatsChartProps {
  data: ChartDataPoint[];
  title: string;
}

const CHART_CONFIG = {
  margin: { top: 20, right: 30, left: 20, bottom: 20 },
  strokeWidth: 2,
  opacity: {
    gridOpacity: 0.3,
    gradientStart: 0.8,
    gradientEnd: 0.1,
  },
} as const;

export const StatsChart: React.FC<StatsChartProps> = ({ data, title }) => {
  const theme = useTheme();
  
  const chartColors = useMemo(() => ({
    primary: theme.chartPrimary,
    secondary: theme.chartSecondary,
  }), [theme.chartPrimary, theme.chartSecondary]);

  const tooltipStyle = useMemo(() => ({
    backgroundColor: theme.tooltipBackground,
    border: 'none',
    borderRadius: '8px',
    color: theme.white,
    fontSize: '12px'
  }), [theme.tooltipBackground, theme.white]);

  const cursorStyle = useMemo(() => ({
    stroke: theme.chartPrimary,
    strokeWidth: 1,
    strokeDasharray: '3 3'
  }), [theme.chartPrimary]);

  const legendStyle = useMemo(() => ({
    paddingTop: '20px',
    fontSize: '12px'
  }), []);

  const tickStyle = useMemo(() => ({
    fill: theme.secondaryText,
    fontSize: 12
  }), [theme.secondaryText]);
  
  return (
    <ChartContainer>
      <ChartTitle>{title}</ChartTitle>
      <ChartWrapper>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_CONFIG.margin}>
            <defs>
              <linearGradient id="submissionsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={CHART_CONFIG.opacity.gradientStart}/>
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={CHART_CONFIG.opacity.gradientEnd}/>
              </linearGradient>
              <linearGradient id="disputesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={CHART_CONFIG.opacity.gradientStart}/>
                <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={CHART_CONFIG.opacity.gradientEnd}/>
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
              height={60}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
              width={60}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={cursorStyle}
            />
            <Legend wrapperStyle={legendStyle} />
            <Area
              type="monotone"
              dataKey="submissions"
              stroke={chartColors.primary}
              fillOpacity={1}
              fill="url(#submissionsGradient)"
              strokeWidth={CHART_CONFIG.strokeWidth}
            />
            <Area
              type="monotone"
              dataKey="disputes"
              stroke={chartColors.secondary}
              fillOpacity={1}
              fill="url(#disputesGradient)"
              strokeWidth={CHART_CONFIG.strokeWidth}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </ChartContainer>
  );
};