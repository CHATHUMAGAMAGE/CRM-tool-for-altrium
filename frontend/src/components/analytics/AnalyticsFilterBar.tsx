import { useState } from 'react'
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material'
import { toLocalISODate, type AnalyticsFilters, type FilterOptions } from '../../services/analytics'

type Props = {
  value: AnalyticsFilters
  options?: FilterOptions
  showDealStatus?: boolean
  showActions?: boolean
  onApply: (filters: AnalyticsFilters) => void
}

const ALL = '__ALL__'
type DatePreset = 'month' | 'last-month' | 'three-months' | 'year'

function preset(name: DatePreset): Pick<AnalyticsFilters, 'date_from' | 'date_to'> {
  const now = new Date(); const start = new Date(now); const end = new Date(now)
  if (name === 'last-month') {
    start.setMonth(now.getMonth() - 1, 1); end.setDate(0)
  } else if (name === 'three-months') {
    start.setMonth(now.getMonth() - 2, 1)
  } else if (name === 'year') {
    start.setMonth(0, 1)
  } else start.setDate(1)
  return { date_from: toLocalISODate(start), date_to: toLocalISODate(end) }
}

function matchingPreset(filters: AnalyticsFilters): DatePreset | 'custom' {
  const names: DatePreset[] = ['month', 'last-month', 'three-months', 'year']
  return names.find((name) => {
    const dates = preset(name)
    return dates.date_from === filters.date_from && dates.date_to === filters.date_to
  }) || 'custom'
}

export default function AnalyticsFilterBar({ value, options, showDealStatus, showActions = true, onApply }: Props) {
  const [draft, setDraft] = useState(value)
  const [datePreset, setDatePreset] = useState<DatePreset | 'custom'>(() => matchingPreset(value))
  const current = showActions ? draft : value
  const update = (next: AnalyticsFilters) => { if (showActions) setDraft(next); else onApply(next) }
  const set = (key: keyof AnalyticsFilters, next: string) => update({ ...current, [key]: next })
  const reset = () => { const dates = preset('month'); const next = { ...dates } as AnalyticsFilters; setDatePreset('month'); setDraft(next); onApply(next) }

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.25} useFlexGap sx={{ flexWrap: 'wrap' }}>
        <TextField select size="small" label="Date Range" value={datePreset} sx={{ minWidth: 150 }}
          onChange={(event) => { const nextPreset = event.target.value as DatePreset; setDatePreset(nextPreset); update({ ...current, ...preset(nextPreset) }) }}>
          <MenuItem value="month">This Month</MenuItem><MenuItem value="last-month">Last Month</MenuItem>
          <MenuItem value="three-months">Last 3 Months</MenuItem><MenuItem value="year">This Year</MenuItem>
          {datePreset === 'custom' && <MenuItem value="custom" disabled>Custom Range</MenuItem>}
        </TextField>
        <TextField size="small" type="date" label="From" value={current.date_from} onChange={(e) => { setDatePreset('custom'); set('date_from', e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={current.date_to} onChange={(e) => { setDatePreset('custom'); set('date_to', e.target.value) }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField select size="small" label="Sales Rep" value={current.sales_rep || ALL} onChange={(e) => set('sales_rep', e.target.value === ALL ? '' : e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value={ALL}>All Sales Reps</MenuItem>{options?.sales_reps.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
        </TextField>
        {[['source', 'Lead Source', 'All Sources', options?.sources], ['status', 'Lead Status', 'All Statuses', options?.statuses], ['assessment_stage', 'Assessment Stage', 'All Stages', options?.assessment_stages], ['final_decision', 'Final Decision', 'All Decisions', options?.final_decisions]] .map(([key, label, allLabel, items]) => (
          <TextField key={key as string} select size="small" label={label as string} value={current[key as keyof AnalyticsFilters] || ALL} onChange={(e) => set(key as keyof AnalyticsFilters, e.target.value === ALL ? '' : e.target.value)} sx={{ minWidth: 155 }}>
            <MenuItem value={ALL}>{allLabel as string}</MenuItem>{(items as FilterOptions['sources'] | undefined)?.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
        ))}
        {showDealStatus && <TextField select size="small" label="Deal Status" value={current.deal_status || ALL} onChange={(e) => set('deal_status', e.target.value === ALL ? '' : e.target.value)} sx={{ minWidth: 145 }}>
          <MenuItem value={ALL}>All Deal Statuses</MenuItem>{options?.deal_statuses.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
        </TextField>}
        {showActions && <Stack direction="row" spacing={1}><Button variant="contained" onClick={() => onApply(current)}>Apply Filters</Button><Button onClick={reset}>Reset</Button></Stack>}
      </Stack>
    </Box>
  )
}
