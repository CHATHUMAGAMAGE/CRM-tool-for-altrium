import { useEffect, useState } from 'react'
import { ArrowUpwardRounded, KeyboardArrowDownRounded } from '@mui/icons-material'
import { Box, Fab, Fade, Paper, Stack, Typography } from '@mui/material'
import { useLocation } from 'react-router'

const TOP_THRESHOLD = 120
const FAB_THRESHOLD = 650
const BOTTOM_TOLERANCE = 40

export default function PageScrollAssist() {
  const { pathname } = useLocation()
  const [progress, setProgress] = useState(0)
  const [canScroll, setCanScroll] = useState(false)
  const [showCue, setShowCue] = useState(false)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const root = document.documentElement
        const scrollable = Math.max(root.scrollHeight - window.innerHeight, 0)
        const scrollY = Math.max(window.scrollY, 0)
        const hasMore = scrollable > BOTTOM_TOLERANCE
        const nearBottom = scrollable - scrollY <= BOTTOM_TOLERANCE

        setCanScroll(hasMore)
        setProgress(scrollable ? Math.min((scrollY / scrollable) * 100, 100) : 0)
        setShowCue(hasMore && scrollY < TOP_THRESHOLD && !nearBottom)
        setShowTop(scrollY > FAB_THRESHOLD)
      })
    }

    update()
    const delayedUpdate = window.setTimeout(update, 250)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)

    const observer = new ResizeObserver(update)
    observer.observe(document.body)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(delayedUpdate)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [pathname])

  return (
    <>
      {canScroll && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'fixed',
            top: 79,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: 'rgba(37, 99, 235, .08)',
            zIndex: 1301,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              width: `${progress}%`,
              height: '100%',
              bgcolor: 'primary.main',
              transition: 'width 80ms linear',
            }}
          />
        </Box>
      )}

      <Fade in={showCue} unmountOnExit>
        <Paper
          role="status"
          elevation={2}
          sx={{
            position: 'fixed',
            left: '50%',
            bottom: { xs: 18, sm: 24 },
            transform: 'translateX(-50%)',
            zIndex: 20,
            px: 1.5,
            py: .75,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 99,
            pointerEvents: 'none',
          }}
        >
          <Stack direction="row" spacing={.5} sx={{ alignItems: 'center' }}>
            <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}>
              Scroll for more details
            </Typography>
            <KeyboardArrowDownRounded color="primary" fontSize="small" />
          </Stack>
        </Paper>
      </Fade>

      <Fade in={showTop} unmountOnExit>
        <Fab
          size="small"
          color="primary"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{
            position: 'fixed',
            right: { xs: 16, md: 28 },
            bottom: { xs: 16, md: 28 },
            zIndex: 20,
            boxShadow: '0 8px 24px rgba(15, 23, 42, .2)',
          }}
        >
          <ArrowUpwardRounded fontSize="small" />
        </Fab>
      </Fade>
    </>
  )
}
