import { useEffect, useState } from 'react'
import { KeyboardArrowDownRounded } from '@mui/icons-material'
import { Box, Button, Stack, Typography } from '@mui/material'

export type WorkspaceSection = {
  id: string
  label: string
  badge?: string | number
}

export default function WorkspaceSectionNav({ sections }: { sections: WorkspaceSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id || '')

  useEffect(() => {
    const nodes = sections.map((section) => document.getElementById(section.id)).filter((node): node is HTMLElement => Boolean(node))
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible) setActiveId(visible.target.id)
    }, { rootMargin: '-150px 0px -60% 0px', threshold: [0, .1] })
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sections])

  const goTo = (id: string) => {
    const target = document.getElementById(id)
    if (!target) return
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 145, behavior: 'smooth' })
  }

  return (
    <Box sx={{ position: 'sticky', top: 72, zIndex: 8, my: 2, px: 1, py: 1, bgcolor: 'rgba(255,255,255,.97)', border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 4px 16px rgba(15,23,42,.06)' }}>
      <Stack direction="row" spacing={.75} sx={{ overflowX: 'auto', scrollbarWidth: 'thin' }}>
        {sections.map((section) => <Button key={section.id} size="small" variant={activeId === section.id ? 'contained' : 'text'} onClick={() => goTo(section.id)} sx={{ flexShrink: 0, textTransform: 'none', borderRadius: 1.5 }}>
          {section.label}{section.badge !== undefined ? ` (${section.badge})` : ''}
        </Button>)}
        <Stack direction="row" sx={{ ml: 'auto', alignItems: 'center', flexShrink: 0, px: 1 }}><Typography color="text.secondary" sx={{ fontSize: 11 }}>More details below</Typography><KeyboardArrowDownRounded color="action" fontSize="small" /></Stack>
      </Stack>
    </Box>
  )
}
