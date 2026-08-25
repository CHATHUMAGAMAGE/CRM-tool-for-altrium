import {
  useMemo,
  useState,
  type MouseEvent,
} from 'react'

import {
  CalendarMonthRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  ScheduleRounded,
} from '@mui/icons-material'

import {
  Box,
  Button,
  ButtonBase,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material'


type DateTimePickerFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  minDateTime?: Date
  disabled?: boolean
  required?: boolean
}


const WEEKDAYS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
]


function pad(value: number): string {
  return String(value).padStart(2, '0')
}


function toLocalValue(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}


function parseValue(value: string): Date | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed
}


function startOfDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
}


function getMonthGrid(viewDate: Date): Date[] {
  const firstDay = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1,
  )

  const mondayOffset = (firstDay.getDay() + 6) % 7
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
}


function formatDisplayValue(value: string): string {
  const parsed = parseValue(value)

  if (!parsed) {
    return ''
  }

  return parsed.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


function DateTimePickerField({
  label,
  value,
  onChange,
  minDateTime,
  disabled = false,
  required = false,
}: DateTimePickerFieldProps) {
  const selectedDate = parseValue(value)

  const [anchorEl, setAnchorEl] =
    useState<HTMLElement | null>(null)

  const [viewDate, setViewDate] =
    useState<Date>(() => selectedDate || minDateTime || new Date())

  const monthDays = useMemo(
    () => getMonthGrid(viewDate),
    [viewDate],
  )

  const open = Boolean(anchorEl)

  const minimum = minDateTime || null

  const selectedHour24 = selectedDate?.getHours() ?? 9
  const selectedMinute = selectedDate?.getMinutes() ?? 0
  const selectedPeriod = selectedHour24 >= 12 ? 'PM' : 'AM'
  const selectedHour12 = selectedHour24 % 12 || 12

  const minuteOptions = useMemo(() => {
    const values = new Set<number>(
      Array.from({ length: 12 }, (_, index) => index * 5),
    )

    values.add(selectedMinute)

    return [...values].sort((a, b) => a - b)
  }, [selectedMinute])

  const updateDate = (nextDate: Date) => {
    const base = selectedDate
      ? new Date(selectedDate)
      : new Date(nextDate)

    base.setFullYear(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
    )

    if (!selectedDate) {
      const defaultTime = new Date(Date.now() + 60 * 60 * 1000)
      base.setHours(
        defaultTime.getHours(),
        Math.ceil(defaultTime.getMinutes() / 5) * 5 % 60,
        0,
        0,
      )
    }

    if (minimum && base < minimum) {
      base.setHours(
        minimum.getHours(),
        minimum.getMinutes(),
        0,
        0,
      )

      base.setMinutes(base.getMinutes() + 5)
    }

    onChange(toLocalValue(base))
    setViewDate(nextDate)
  }

  const updateTime = (
    hour12: number,
    minute: number,
    period: 'AM' | 'PM',
  ) => {
    const base = selectedDate
      ? new Date(selectedDate)
      : new Date(Date.now() + 60 * 60 * 1000)

    let hour24 = hour12 % 12

    if (period === 'PM') {
      hour24 += 12
    }

    base.setHours(hour24, minute, 0, 0)
    onChange(toLocalValue(base))
  }

  const chooseToday = () => {
    const now = new Date()
    const target = new Date(now.getTime() + 60 * 60 * 1000)
    target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5, 0, 0)
    onChange(toLocalValue(target))
    setViewDate(target)
  }

  const isBeforeMinimum = (date: Date) => {
    if (!minimum) {
      return false
    }

    return startOfDay(date) < startOfDay(minimum)
  }

  const valueIsTooEarly = Boolean(
    selectedDate && minimum && selectedDate <= minimum,
  )

  return (
    <>
      <TextField
        fullWidth
        required={required}
        label={label}
        value={formatDisplayValue(value)}
        disabled={disabled}
        error={valueIsTooEarly}
        helperText={
          valueIsTooEarly
            ? 'Choose a future date and time.'
            : 'Select a date and exact time.'
        }
        onClick={(event: MouseEvent<HTMLElement>) => {
          if (!disabled) {
            setAnchorEl(event.currentTarget)
            setViewDate(selectedDate || minimum || new Date())
          }
        }}
        slotProps={{
          input: {
            readOnly: true,
            startAdornment: (
              <InputAdornment position="start">
                <CalendarMonthRounded color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <ScheduleRounded color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          cursor: disabled ? 'default' : 'pointer',
          '& input': {
            cursor: disabled ? 'default' : 'pointer',
          },
        }}
      />

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 360,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'var(--eleven-shadow-lg)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <IconButton
              size="small"
              onClick={() => {
                setViewDate(
                  new Date(
                    viewDate.getFullYear(),
                    viewDate.getMonth() - 1,
                    1,
                  ),
                )
              }}
            >
              <ChevronLeftRounded />
            </IconButton>

            <Typography sx={{ fontWeight: 800 }}>
              {viewDate.toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })}
            </Typography>

            <IconButton
              size="small"
              onClick={() => {
                setViewDate(
                  new Date(
                    viewDate.getFullYear(),
                    viewDate.getMonth() + 1,
                    1,
                  ),
                )
              }}
            >
              <ChevronRightRounded />
            </IconButton>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 0.5,
            }}
          >
            {WEEKDAYS.map((weekday) => (
              <Typography
                key={weekday}
                variant="caption"
                color="text.secondary"
                sx={{
                  py: 0.5,
                  textAlign: 'center',
                  fontWeight: 800,
                }}
              >
                {weekday}
              </Typography>
            ))}

            {monthDays.map((date) => {
              const isCurrentMonth =
                date.getMonth() === viewDate.getMonth()

              const isSelected = Boolean(
                selectedDate &&
                date.getFullYear() === selectedDate.getFullYear() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getDate() === selectedDate.getDate(),
              )

              const disabledDay = isBeforeMinimum(date)

              return (
                <ButtonBase
                  key={date.toISOString()}
                  disabled={disabledDay}
                  onClick={() => updateDate(date)}
                  sx={{
                    width: 40,
                    height: 40,
                    mx: 'auto',
                    borderRadius: '50%',
                    fontSize: 13,
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected
                      ? 'primary.contrastText'
                      : isCurrentMonth
                        ? 'text.primary'
                        : 'text.disabled',
                    bgcolor: isSelected
                      ? 'primary.main'
                      : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected
                        ? 'primary.dark'
                        : 'action.hover',
                    },
                  }}
                >
                  {date.getDate()}
                </ButtonBase>
              )
            })}
          </Box>
        </Box>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 800 }}
          >
            TIME
          </Typography>

          <Stack
            direction="row"
            spacing={1}
            sx={{ mt: 1, alignItems: 'center' }}
          >
            <TextField
              select
              size="small"
              label="Hour"
              value={selectedHour12}
              onChange={(event) =>
                updateTime(
                  Number(event.target.value),
                  selectedMinute,
                  selectedPeriod,
                )
              }
              sx={{ flex: 1 }}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (hour) => (
                  <MenuItem key={hour} value={hour}>
                    {pad(hour)}
                  </MenuItem>
                ),
              )}
            </TextField>

            <Typography sx={{ fontWeight: 800 }}>:</Typography>

            <TextField
              select
              size="small"
              label="Minute"
              value={selectedMinute}
              onChange={(event) =>
                updateTime(
                  selectedHour12,
                  Number(event.target.value),
                  selectedPeriod,
                )
              }
              sx={{ flex: 1 }}
            >
              {minuteOptions.map((minute) => (
                <MenuItem key={minute} value={minute}>
                  {pad(minute)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Period"
              value={selectedPeriod}
              onChange={(event) =>
                updateTime(
                  selectedHour12,
                  selectedMinute,
                  event.target.value as 'AM' | 'PM',
                )
              }
              sx={{ width: 95 }}
            >
              <MenuItem value="AM">AM</MenuItem>
              <MenuItem value="PM">PM</MenuItem>
            </TextField>
          </Stack>

          <Stack
            direction="row"
            sx={{
              mt: 2,
              justifyContent: 'space-between',
            }}
          >
            <Button
              size="small"
              onClick={() => onChange('')}
            >
              Clear
            </Button>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={chooseToday}
              >
                Today
              </Button>

              <Button
                size="small"
                variant="contained"
                onClick={() => setAnchorEl(null)}
                disabled={!value || valueIsTooEarly}
              >
                Done
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Popover>
    </>
  )
}


export default DateTimePickerField
