import React, { useCallback, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { DayPicker, DateRange as DayPickerDateRange } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/style.css';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`;

const SelectedRangeLabel = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  text-align: center;
  padding: 6px 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.secondaryBlue}0D;
  border: 1px solid ${({ theme }) => theme.secondaryBlue}20;

  span {
    color: ${({ theme }) => theme.secondaryBlue};
    font-weight: 600;
  }
`;

const StyledDayPickerWrapper = styled.div`
  /* Root */
  .rdp-root {
    --rdp-outside-opacity: 0.4;
  }

  /* Caption / header area */
  .rdp-month_caption {
    padding: 0 4px 8px;
  }

  /* Dropdowns */
  .rdp-dropdowns {
    display: flex;
    gap: 12px;
  }

  .rdp-dropdown_root {
    position: relative;

    select {
      appearance: none;
      -webkit-appearance: none;
      background: ${({ theme }) => theme.backgroundFour};
      border: 1px solid ${({ theme }) => theme.stroke};
      border-radius: 8px;
      color: ${({ theme }) => theme.primaryText};
      font-family: "Open Sans", sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 28px 6px 12px;
      cursor: pointer;
      transition: all 0.15s ease;

      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237186FF' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;

      &:hover {
        border-color: ${({ theme }) => theme.secondaryBlue}80;
        background-color: ${({ theme }) => theme.backgroundThree};
      }

      &:focus {
        outline: none;
        border-color: ${({ theme }) => theme.secondaryBlue};
        box-shadow: 0 0 0 2px ${({ theme }) => theme.secondaryBlue}18;
      }

      option {
        background: ${({ theme }) => theme.backgroundThree};
        color: ${({ theme }) => theme.primaryText};
      }
    }
  }

  /* Weekday headers */
  .rdp-weekday {
    color: ${({ theme }) => theme.tertiaryText};
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding-bottom: 4px;
  }

  /* Day cells */
  .rdp-day {
    transition: all 0.1s ease;
  }

  .rdp-day_button {
    border-radius: 8px;
    font-weight: 500;
    transition: all 0.1s ease;

    &:hover {
      background: ${({ theme }) => theme.secondaryBlue}20 !important;
    }
  }

  /* Today */
  .rdp-today .rdp-day_button {
    font-weight: 700;
    border: 1.5px solid ${({ theme }) => theme.secondaryBlue}60;
  }

  /* Disabled / future dates */
  .rdp-disabled .rdp-day_button {
    opacity: 0.25;

    &:hover {
      background: transparent !important;
    }
  }

  /* Range selection */
  .rdp-range_start .rdp-day_button,
  .rdp-range_end .rdp-day_button {
    font-weight: 700;
  }
`;

interface DateRangeCalendarProps {
  from: string | null;
  to: string | null;
  onChange: (from: string | null, to: string | null) => void;
}

const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({ from, to, onChange }) => {
  const theme = useTheme();

  const handleSelect = useCallback((range: DayPickerDateRange | undefined) => {
    const fromStr = range?.from ? format(range.from, 'yyyy-MM-dd') : null;
    const toStr = range?.to ? format(range.to, 'yyyy-MM-dd') : null;
    onChange(fromStr, toStr);
  }, [onChange]);

  const calendarRange = useMemo((): DayPickerDateRange | undefined => {
    const fromDate = from ? new Date(from + 'T00:00:00') : undefined;
    const toDate = to ? new Date(to + 'T00:00:00') : undefined;
    if (!fromDate) return undefined;
    return { from: fromDate, to: toDate };
  }, [from, to]);

  return (
    <Container>
      {(from || to) && (
        <SelectedRangeLabel>
          {from && <span>{format(new Date(from + 'T00:00:00'), 'MMM d, yyyy')}</span>}
          {from && to && ' \u2013 '}
          {to && <span>{format(new Date(to + 'T00:00:00'), 'MMM d, yyyy')}</span>}
          {from && !to && <span style={{ color: theme.secondaryText, fontWeight: 400 }}> {'\u2013'} select end date</span>}
        </SelectedRangeLabel>
      )}
      <StyledDayPickerWrapper>
        <DayPicker
          mode="range"
          captionLayout="dropdown"
          selected={calendarRange}
          onSelect={handleSelect}
          numberOfMonths={1}
          startMonth={new Date(2020, 0)}
          endMonth={new Date()}
          disabled={{ after: new Date() }}
          style={{
            '--rdp-accent-color': theme.secondaryBlue,
            '--rdp-accent-background-color': theme.secondaryBlue + '18',
            '--rdp-range_middle-background-color': theme.secondaryBlue + '10',
            '--rdp-range_middle-color': theme.primaryText,
            '--rdp-range_start-color': '#fff',
            '--rdp-range_end-color': '#fff',
            '--rdp-range_start-date-background-color': theme.secondaryBlue,
            '--rdp-range_end-date-background-color': theme.secondaryBlue,
            '--rdp-today-color': theme.secondaryBlue,
            '--rdp-day_button-border-radius': '8px',
            '--rdp-day-height': '40px',
            '--rdp-day-width': '40px',
            '--rdp-day_button-height': '36px',
            '--rdp-day_button-width': '36px',
            color: theme.primaryText,
            fontSize: '14px',
            fontFamily: '"Open Sans", sans-serif',
          } as React.CSSProperties}
        />
      </StyledDayPickerWrapper>
    </Container>
  );
};

export default DateRangeCalendar;
