import {
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material'

import {
  AutoAwesomeRounded,
  BoltRounded,
  PsychologyRounded,
  RefreshRounded,
} from '@mui/icons-material'

import {
  analyzeLeadRescueRadar,
  type LeadRescueRadarAnalysis,
} from '../../services/crm'


type LeadRescueRadarCardProps = {
  leadId: number
  isClosed: boolean
}


function getRiskColor(
  riskLevel:
    LeadRescueRadarAnalysis['risk_level'],
):
  | 'default'
  | 'success'
  | 'warning'
  | 'error' {
  switch (riskLevel) {
    case 'LOW':
      return 'success'

    case 'MEDIUM':
      return 'warning'

    case 'HIGH':
      return 'error'

    default:
      return 'default'
  }
}


function getScoreColor(
  score: number | null,
) {
  if (score === null) {
    return 'divider'
  }

  if (score >= 75) {
    return 'success.main'
  }

  if (score >= 45) {
    return 'warning.main'
  }

  return 'error.main'
}


function LeadRescueRadarCard({
  leadId,
  isClosed,
}: LeadRescueRadarCardProps) {
  const [
    analysis,
    setAnalysis,
  ] =
    useState<
      LeadRescueRadarAnalysis | null
    >(null)

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')


  const handleAnalyze =
    async () => {
      setIsAnalyzing(true)
      setError('')

      try {
        const result =
          await analyzeLeadRescueRadar(
            leadId,
          )

        setAnalysis(result)
      } catch (
        requestError
      ) {
        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to analyse this lead.',
        )
      } finally {
        setIsAnalyzing(false)
      }
    }


  return (
    <Card
      variant="outlined"
      sx={{
        p: 3,
        height: '100%',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 1,
        }}
      >
        <AutoAwesomeRounded
          color="primary"
        />

        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
          }}
        >
          Lead Rescue Radar
        </Typography>

        <Chip
          label="AI"
          size="small"
          color="primary"
          variant="outlined"
        />
      </Stack>


      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mb: 2.5,
        }}
      >
        AI-assisted analysis of
        communication, follow-up and
        lead activity signals.
      </Typography>


      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
          }}
        >
          {error}
        </Alert>
      )}


      {!analysis && (
        <>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 140,
              height: 140,
              mx: 'auto',
              mb: 2.5,
              borderRadius: '50%',
              border: '10px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <PsychologyRounded
                color="disabled"
                sx={{
                  fontSize: 32,
                }}
              />

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                }}
              >
                Not analysed
              </Typography>
            </Box>
          </Box>


          <Button
            fullWidth
            variant="contained"
            disabled={
              isAnalyzing ||
              isClosed
            }
            onClick={() =>
              void handleAnalyze()
            }
            startIcon={
              isAnalyzing
                ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                )
                : (
                  <BoltRounded />
                )
            }
          >
            {isAnalyzing
              ? 'Analysing Lead...'
              : 'Analyze with AI'}
          </Button>


          {isClosed && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                mt: 1.25,
                textAlign: 'center',
              }}
            >
              Rescue Radar is only
              available for active leads.
            </Typography>
          )}
        </>
      )}


      {analysis && (
        <Stack
          spacing={2}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 140,
              height: 140,
              mx: 'auto',
              borderRadius: '50%',
              border: '10px solid',
              borderColor:
                getScoreColor(
                  analysis.health_score,
                ),
            }}
          >
            <Box
              sx={{
                textAlign: 'center',
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                }}
              >
                {analysis.health_score ??
                  '—'}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Health Score
              </Typography>
            </Box>
          </Box>


          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: 'center',
              flexWrap: 'wrap',
              rowGap: 1,
            }}
          >
            <Chip
              label={
                analysis.risk_level ===
                'CLOSED'
                  ? 'Closed'
                  : `${analysis.risk_level} RISK`
              }
              color={
                getRiskColor(
                  analysis.risk_level,
                )
              }
              sx={{
                fontWeight: 800,
              }}
            />

            <Chip
              label={
                `Confidence ${analysis.confidence}%`
              }
              variant="outlined"
            />
          </Stack>


          <Typography
            variant="body2"
            color="text.secondary"
          >
            {analysis.summary}
          </Typography>


          {analysis.reasons.length >
            0 && (
            <>
              <Divider />

              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    fontWeight: 800,
                  }}
                >
                  Risk Signals
                </Typography>

                <Stack
                  spacing={0.75}
                >
                  {analysis.reasons.map(
                    (
                      reason,
                      index,
                    ) => (
                      <Typography
                        key={
                          `${index}-${reason}`
                        }
                        variant="body2"
                        color="text.secondary"
                      >
                        • {reason}
                      </Typography>
                    ),
                  )}
                </Stack>
              </Box>
            </>
          )}


          <Alert
            severity="info"
            icon={
              <AutoAwesomeRounded />
            }
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                mb: 0.5,
              }}
            >
              Recommended Next Action
            </Typography>

            <Typography
              variant="body2"
            >
              {analysis.recommended_action}
            </Typography>
          </Alert>


          <Button
            fullWidth
            variant="outlined"
            disabled={
              isAnalyzing ||
              isClosed
            }
            onClick={() =>
              void handleAnalyze()
            }
            startIcon={
              isAnalyzing
                ? (
                  <CircularProgress
                    size={18}
                  />
                )
                : (
                  <RefreshRounded />
                )
            }
          >
            {isAnalyzing
              ? 'Re-analysing...'
              : 'Run Analysis Again'}
          </Button>


          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              textAlign: 'center',
            }}
          >
            AI-generated advisory insight.
            Final lead decisions remain
            with the sales team.
          </Typography>
        </Stack>
      )}
    </Card>
  )
}


export default LeadRescueRadarCard