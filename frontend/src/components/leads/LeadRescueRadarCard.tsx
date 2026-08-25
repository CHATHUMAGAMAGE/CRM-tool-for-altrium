import {
  useEffect,
  useRef,
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
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material'

import {
  AutoAwesomeRounded,
  BoltRounded,
  CheckCircleRounded,
  DataObjectRounded,
  DoneAllRounded,
  InsightsRounded,
  MemoryRounded,
  PsychologyRounded,
  RadioButtonUncheckedRounded,
  RefreshRounded,
  ScheduleRounded,
  TrendingUpRounded,
} from '@mui/icons-material'

import {
  analyzeLeadRescueRadar,
  type LeadRescueRadarAnalysis,
} from '../../services/crm'


type LeadRescueRadarCardProps = {
  leadId: number
  isClosed: boolean
}


type StoredRescueRadarAnalysis = {
  analysis: LeadRescueRadarAnalysis
  durationMilliseconds: number | null
}


const RESCUE_RADAR_STORAGE_PREFIX =
  'eleven-crm:rescue-radar:'


function getRescueRadarStorageKey(
  leadId: number,
) {
  return (
    `${RESCUE_RADAR_STORAGE_PREFIX}${leadId}`
  )
}


function loadStoredRescueRadarAnalysis(
  leadId: number,
): StoredRescueRadarAnalysis | null {
  try {
    const storedValue =
      window.sessionStorage.getItem(
        getRescueRadarStorageKey(
          leadId,
        ),
      )

    if (
      !storedValue
    ) {
      return null
    }

    const parsed =
      JSON.parse(
        storedValue,
      ) as Partial<StoredRescueRadarAnalysis>

    if (
      !parsed.analysis ||
      typeof parsed.analysis !==
        'object'
    ) {
      return null
    }

    return {
      analysis:
        parsed.analysis as LeadRescueRadarAnalysis,

      durationMilliseconds:
        typeof parsed.durationMilliseconds ===
          'number'
          ? parsed.durationMilliseconds
          : null,
    }
  } catch {
    return null
  }
}


function storeRescueRadarAnalysis(
  leadId: number,
  analysis: LeadRescueRadarAnalysis,
  durationMilliseconds: number | null,
) {
  try {
    window.sessionStorage.setItem(
      getRescueRadarStorageKey(
        leadId,
      ),
      JSON.stringify({
        analysis,
        durationMilliseconds,
      }),
    )
  } catch {
    // The analysis still remains available in memory if storage is unavailable.
  }
}


type AnalysisStage = {
  label: string
  description: string
}


const ANALYSIS_STAGES:
AnalysisStage[] = [
  {
    label:
      'Preparing lead data',

    description:
      'Collecting the lead activity signals required for analysis.',
  },

  {
    label:
      'Reviewing communications',

    description:
      'Checking recent communication and engagement patterns.',
  },

  {
    label:
      'Reviewing follow-ups',

    description:
      'Checking upcoming, completed and overdue follow-up activity.',
  },

  {
    label:
      'Evaluating lead health',

    description:
      'Assessing engagement, inactivity and rescue-risk signals.',
  },

  {
    label:
      'Generating NVIDIA NIM insight',

    description:
      'Requesting the advisory assessment from the AI model.',
  },

  {
    label:
      'Validating AI response',

    description:
      'Checking the structured result before presenting it to the sales team.',
  },
]


const delay =
  (
    duration:
      number,
  ) =>
    new Promise<void>(
      (
        resolve,
      ) => {
        window.setTimeout(
          resolve,
          duration,
        )
      },
    )


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
    return 'var(--eleven-text-muted)'
  }

  if (score >= 75) {
    return 'var(--eleven-success)'
  }

  if (score >= 45) {
    return 'var(--eleven-warning)'
  }

  return 'var(--eleven-error)'
}


function getStageFromProgress(
  progress:
    number,
) {
  if (progress < 18) {
    return 0
  }

  if (progress < 34) {
    return 1
  }

  if (progress < 50) {
    return 2
  }

  if (progress < 66) {
    return 3
  }

  if (progress < 84) {
    return 4
  }

  return 5
}


function formatElapsedTime(
  milliseconds:
    number,
) {
  return (
    milliseconds /
    1000
  ).toFixed(
    1,
  )
}


function formatGeneratedAt(
  value:
    string,
) {
  const date =
    new Date(
      value,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return 'Just now'
  }

  return date.toLocaleString(
    'en-GB',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  )
}


function getModelLabel(
  model:
    string | null,
) {
  if (
    !model
  ) {
    return 'NVIDIA NIM'
  }

  if (
    model.includes(
      'nemotron',
    )
  ) {
    return 'NVIDIA Nemotron'
  }

  return model
}


function LeadRescueRadarCard({
  leadId,
  isClosed,
}: LeadRescueRadarCardProps) {
  const initialStoredAnalysis =
    useRef(
      loadStoredRescueRadarAnalysis(
        leadId,
      ),
    ).current


  const [
    analysis,
    setAnalysis,
  ] =
    useState<
      LeadRescueRadarAnalysis | null
    >(
      initialStoredAnalysis
        ?.analysis ??
      null,
    )


  const [
    isAnalyzing,
    setIsAnalyzing,
  ] =
    useState(
      false,
    )


  const [
    error,
    setError,
  ] =
    useState(
      '',
    )


  const [
    analysisProgress,
    setAnalysisProgress,
  ] =
    useState(
      0,
    )


  const [
    analysisStepIndex,
    setAnalysisStepIndex,
  ] =
    useState(
      0,
    )


  const [
    elapsedMilliseconds,
    setElapsedMilliseconds,
  ] =
    useState(
      0,
    )


  const [
    lastAnalysisDuration,
    setLastAnalysisDuration,
  ] =
    useState<
      number | null
    >(
      initialStoredAnalysis
        ?.durationMilliseconds ??
      null,
    )


  const analysisStartedAtRef =
    useRef<
      number | null
    >(
      null,
    )


  const activeLeadIdRef =
    useRef(
      leadId,
    )


  useEffect(
    () => {
      if (
        activeLeadIdRef.current ===
        leadId
      ) {
        return
      }

      activeLeadIdRef.current =
        leadId

      const stored =
        loadStoredRescueRadarAnalysis(
          leadId,
        )

      setAnalysis(
        stored?.analysis ??
          null,
      )

      setLastAnalysisDuration(
        stored
          ?.durationMilliseconds ??
          null,
      )

      setError(
        '',
      )

      setAnalysisProgress(
        0,
      )

      setAnalysisStepIndex(
        0,
      )

      setElapsedMilliseconds(
        0,
      )
    },
    [
      leadId,
    ],
  )


  useEffect(
    () => {
      if (
        !isAnalyzing
      ) {
        return
      }

      const elapsedTimer =
        window.setInterval(
          () => {
            if (
              analysisStartedAtRef
                .current ===
              null
            ) {
              return
            }

            setElapsedMilliseconds(
              Date.now() -
                analysisStartedAtRef
                  .current,
            )
          },
          100,
        )


      const progressTimer =
        window.setInterval(
          () => {
            setAnalysisProgress(
              (
                current,
              ) => {
                if (
                  current >=
                  92
                ) {
                  return 92
                }

                const increment =
                  current <
                    30
                    ? 5
                    : current <
                        60
                      ? 3
                      : current <
                          80
                        ? 2
                        : 1

                return Math.min(
                  92,
                  current +
                    increment,
                )
              },
            )
          },
          320,
        )


      return () => {
        window.clearInterval(
          elapsedTimer,
        )

        window.clearInterval(
          progressTimer,
        )
      }
    },
    [
      isAnalyzing,
    ],
  )


  useEffect(
    () => {
      if (
        !isAnalyzing
      ) {
        return
      }

      setAnalysisStepIndex(
        getStageFromProgress(
          analysisProgress,
        ),
      )
    },
    [
      analysisProgress,
      isAnalyzing,
    ],
  )


  const handleAnalyze =
    async () => {
      setIsAnalyzing(
        true,
      )

      setError(
        '',
      )

      setAnalysisProgress(
        4,
      )

      setAnalysisStepIndex(
        0,
      )

      setElapsedMilliseconds(
        0,
      )

      analysisStartedAtRef.current =
        Date.now()


      try {
        const [
          result,
        ] =
          await Promise.all([
            analyzeLeadRescueRadar(
              leadId,
            ),

            delay(
              1400,
            ),
          ])


        const completedAt =
          Date.now()

        const startedAt =
          analysisStartedAtRef
            .current ??
          completedAt


        const analysisDuration =
          completedAt -
          startedAt


        setLastAnalysisDuration(
          analysisDuration,
        )

        setElapsedMilliseconds(
          analysisDuration,
        )

        setAnalysisStepIndex(
          ANALYSIS_STAGES.length -
            1,
        )

        setAnalysisProgress(
          100,
        )


        storeRescueRadarAnalysis(
          leadId,
          result,
          analysisDuration,
        )


        await delay(
          450,
        )


        setAnalysis(
          result,
        )
      } catch (
        requestError
      ) {
        setAnalysisProgress(
          0,
        )

        setAnalysisStepIndex(
          0,
        )

        setError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to analyse this lead.',
        )
      } finally {
        analysisStartedAtRef.current =
          null

        setIsAnalyzing(
          false,
        )
      }
    }


  const scoreColor =
    getScoreColor(
      analysis?.health_score ??
        null,
    )


  return (
    <Card
      variant="outlined"
      sx={{
        position:
          'relative',

        overflow:
          'hidden',

        height:
          '100%',

        borderRadius:
          '14px',

        borderColor:
          'var(--eleven-primary-border)',

        background:
          (
            'linear-gradient('
            + '180deg, '
            + 'color-mix(in srgb, var(--eleven-primary) 5%, var(--eleven-paper)) 0%, '
            + 'var(--eleven-paper) 34%'
            + ')'
          ),

        boxShadow:
          'var(--eleven-shadow-primary)',

        '&::before':
          {
            content:
              '""',

            position:
              'absolute',

            top:
              0,

            left:
              0,

            right:
              0,

            height:
              3,

            background:
              (
                'linear-gradient('
                + '90deg, '
                + 'var(--eleven-primary) 0%, '
                + 'var(--eleven-purple) 50%, '
                + 'var(--eleven-info) 100%'
                + ')'
              ),
          },
      }}
    >
      <Box
        sx={{
          p:
            2.5,
        }}
      >
        {/*
          HERO HEADER
        */}

        <Stack
          direction="row"
          sx={{
            alignItems:
              'flex-start',

            justifyContent:
              'space-between',

            gap:
              1.5,

            mb:
              1.25,
          }}
        >
          <Stack
            direction="row"
            spacing={1.1}
            sx={{
              alignItems:
                'center',

              minWidth:
                0,
            }}
          >
            <Box
              sx={{
                width:
                  36,

                height:
                  36,

                flexShrink:
                  0,

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                borderRadius:
                  '10px',

                bgcolor:
                  'var(--eleven-primary-soft)',

                color:
                  'var(--eleven-primary)',

                border:
                  '1px solid var(--eleven-primary-border)',
              }}
            >
              <AutoAwesomeRounded
                sx={{
                  fontSize:
                    21,
                }}
              />
            </Box>


            <Box
              sx={{
                minWidth:
                  0,
              }}
            >
              <Typography
                sx={{
                  color:
                    'var(--eleven-text)',

                  fontSize:
                    18,

                  fontWeight:
                    800,

                  lineHeight:
                    1.25,

                  letterSpacing:
                    '-0.02em',
                }}
              >
                Lead Rescue Radar
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.25,

                  color:
                    'var(--eleven-text-secondary)',

                  fontSize:
                    11.5,

                  lineHeight:
                    1.4,
                }}
              >
                AI-Powered Opportunity Health Analysis
              </Typography>
            </Box>
          </Stack>


          <Chip
            size="small"
            icon={
              <MemoryRounded
                sx={{
                  fontSize:
                    '15px !important',
                }}
              />
            }
            label="Powered by NVIDIA NIM"
            variant="outlined"
            sx={{
              flexShrink:
                0,

              bgcolor:
                'var(--eleven-primary-soft)',

              borderColor:
                'var(--eleven-primary-border)',

              color:
                'var(--eleven-text-secondary)',

              fontSize:
                10.5,

              fontWeight:
                700,

              '& .MuiChip-icon':
                {
                  color:
                    'var(--eleven-primary)',
                },
            }}
          />
        </Stack>


        <Typography
          sx={{
            mb:
              2,

            color:
              'var(--eleven-text-secondary)',

            fontSize:
              12.5,

            lineHeight:
              1.6,
          }}
        >
          Smart advisory analysis of communication,
          follow-up and engagement signals to identify
          leads that may need rescue attention.
        </Typography>


        {error && (
          <Alert
            severity="error"
            sx={{
              mb:
                2,
            }}
          >
            {error}
          </Alert>
        )}


        {/*
          LIVE ANALYSIS EXPERIENCE
        */}

        {isAnalyzing && (
          <Box
            sx={{
              p:
                2,

              border:
                '1px solid var(--eleven-primary-border)',

              borderRadius:
                '12px',

              bgcolor:
                'color-mix(in srgb, var(--eleven-primary) 5%, var(--eleven-paper))',
            }}
          >
            <Stack
              direction="row"
              sx={{
                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                gap:
                  2,

                mb:
                  1.25,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color:
                      'var(--eleven-text)',

                    fontSize:
                      13.5,

                    fontWeight:
                      800,
                  }}
                >
                  AI Analysis in progress
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.2,

                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      11,
                  }}
                >
                  NVIDIA NIM is evaluating this lead.
                </Typography>
              </Box>


              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  alignItems:
                    'center',

                  flexShrink:
                    0,
                }}
              >
                <ScheduleRounded
                  sx={{
                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      16,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      11.5,

                    fontWeight:
                      700,

                    fontVariantNumeric:
                      'tabular-nums',
                  }}
                >
                  {formatElapsedTime(
                    elapsedMilliseconds,
                  )}s
                </Typography>
              </Stack>
            </Stack>


            <LinearProgress
              variant="determinate"
              value={
                analysisProgress
              }
              sx={{
                height:
                  9,

                mb:
                  0.7,

                borderRadius:
                  999,

                bgcolor:
                  'var(--eleven-ring-track)',

                '& .MuiLinearProgress-bar':
                  {
                    borderRadius:
                      999,

                    background:
                      (
                        'linear-gradient('
                        + '90deg, '
                        + 'var(--eleven-primary) 0%, '
                        + 'var(--eleven-purple) 100%'
                        + ')'
                      ),
                  },
              }}
            />


            <Stack
              direction="row"
              sx={{
                justifyContent:
                  'space-between',

                alignItems:
                  'center',

                mb:
                  1.75,
              }}
            >
              <Typography
                sx={{
                  color:
                    'var(--eleven-text-muted)',

                  fontSize:
                    10.5,
                }}
              >
                High-level processing status
              </Typography>

              <Typography
                sx={{
                  color:
                    'var(--eleven-primary)',

                  fontSize:
                    11,

                  fontWeight:
                    800,

                  fontVariantNumeric:
                    'tabular-nums',
                }}
              >
                {Math.round(
                  analysisProgress,
                )}%
              </Typography>
            </Stack>


            <Stack
              spacing={1.05}
            >
              {ANALYSIS_STAGES.map(
                (
                  stage,
                  index,
                ) => {
                  const isComplete =
                    (
                      index <
                      analysisStepIndex
                    )
                    ||
                    (
                      analysisProgress ===
                        100
                    )

                  const isCurrent =
                    index ===
                      analysisStepIndex &&
                    analysisProgress <
                      100


                  return (
                    <Stack
                      key={
                        stage.label
                      }
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems:
                          'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          pt:
                            0.1,

                          color:
                            isComplete
                              ? 'var(--eleven-success)'
                              : isCurrent
                                ? 'var(--eleven-primary)'
                                : 'var(--eleven-text-muted)',
                        }}
                      >
                        {isComplete ? (
                          <CheckCircleRounded
                            sx={{
                              fontSize:
                                18,
                            }}
                          />
                        ) : isCurrent ? (
                          <CircularProgress
                            size={17}
                            thickness={5}
                          />
                        ) : (
                          <RadioButtonUncheckedRounded
                            sx={{
                              fontSize:
                                18,
                            }}
                          />
                        )}
                      </Box>


                      <Box
                        sx={{
                          minWidth:
                            0,
                        }}
                      >
                        <Typography
                          sx={{
                            color:
                              isCurrent
                                ? 'var(--eleven-text)'
                                : isComplete
                                  ? 'var(--eleven-text-secondary)'
                                  : 'var(--eleven-text-muted)',

                            fontSize:
                              11.75,

                            fontWeight:
                              isCurrent ||
                              isComplete
                                ? 700
                                : 500,

                            lineHeight:
                              1.4,
                          }}
                        >
                          {stage.label}
                        </Typography>

                        {isCurrent && (
                          <Typography
                            sx={{
                              mt:
                                0.15,

                              color:
                                'var(--eleven-text-muted)',

                              fontSize:
                                10.5,

                              lineHeight:
                                1.45,
                            }}
                          >
                            {stage.description}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  )
                },
              )}
            </Stack>


            <Typography
              sx={{
                mt:
                  1.75,

                pt:
                  1.25,

                borderTop:
                  '1px solid var(--eleven-border)',

                color:
                  'var(--eleven-text-muted)',

                fontSize:
                  10,

                lineHeight:
                  1.45,
              }}
            >
              These are safe, high-level processing stages.
              Hidden model reasoning is not exposed.
            </Typography>
          </Box>
        )}


        {/*
          EMPTY STATE
        */}

        {!analysis &&
          !isAnalyzing && (
          <>
            <Box
              sx={{
                position:
                  'relative',

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                width:
                  142,

                height:
                  142,

                mx:
                  'auto',

                mb:
                  2.25,

                borderRadius:
                  '50%',

                background:
                  (
                    'conic-gradient(var(--eleven-ring-track) 0deg, var(--eleven-surface-soft) 360deg)'
                  ),

                '&::after':
                  {
                    content:
                      '""',

                    position:
                      'absolute',

                    inset:
                      10,

                    borderRadius:
                      '50%',

                    bgcolor:
                      'var(--eleven-paper)',
                  },
              }}
            >
              <Box
                sx={{
                  zIndex:
                    1,

                  textAlign:
                    'center',
                }}
              >
                <PsychologyRounded
                  sx={{
                    mb:
                      0.35,

                    color:
                      'var(--eleven-text-muted)',

                    fontSize:
                      34,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      11,

                    fontWeight:
                      700,
                  }}
                >
                  Ready for AI
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.15,

                    color:
                      'var(--eleven-text-muted)',

                    fontSize:
                      9.5,
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
                isClosed
              }
              onClick={() =>
                void handleAnalyze()
              }
              startIcon={
                <BoltRounded />
              }
              sx={{
                minHeight:
                  42,

                borderRadius:
                  '9px',

                fontWeight:
                  700,

                boxShadow:
                  'var(--eleven-shadow-primary)',
              }}
            >
              Run AI Analysis
            </Button>


            {isClosed && (
              <Typography
                sx={{
                  display:
                    'block',

                  mt:
                    1.25,

                  color:
                    'var(--eleven-text-muted)',

                  fontSize:
                    10.5,

                  textAlign:
                    'center',
                }}
              >
                Rescue Radar is only available for active leads.
              </Typography>
            )}
          </>
        )}


        {/*
          RESULT
        */}

        {analysis &&
          !isAnalyzing && (
          <Stack
            spacing={2}
          >
            <Box
              sx={{
                p:
                  1.5,

                borderRadius:
                  '10px',

                border:
                  '1px solid var(--eleven-primary-border)',

                bgcolor:
                  'var(--eleven-primary-soft)',
              }}
            >
              <Stack
                direction="row"
                sx={{
                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  gap:
                    1.5,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.8}
                  sx={{
                    alignItems:
                      'center',
                  }}
                >
                  <DoneAllRounded
                    sx={{
                      color:
                        'var(--eleven-success)',

                      fontSize:
                        18,
                    }}
                  />

                  <Box>
                    <Typography
                      sx={{
                        color:
                          'var(--eleven-text)',

                        fontSize:
                          11.5,

                        fontWeight:
                          800,
                      }}
                    >
                      AI Insight Ready
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.1,

                        color:
                          'var(--eleven-text-muted)',

                        fontSize:
                          9.75,
                      }}
                    >
                      {formatGeneratedAt(
                        analysis.generated_at,
                      )}
                    </Typography>
                  </Box>
                </Stack>


                {lastAnalysisDuration !==
                  null && (
                  <Chip
                    size="small"
                    icon={
                      <ScheduleRounded />
                    }
                    label={
                      `${formatElapsedTime(
                        lastAnalysisDuration,
                      )}s`
                    }
                    variant="outlined"
                    sx={{
                      bgcolor:
                        'var(--eleven-paper)',

                      fontSize:
                        10,

                      '& .MuiChip-icon':
                        {
                          fontSize:
                            14,
                        },
                    }}
                  />
                )}
              </Stack>
            </Box>


            <Box
              sx={{
                position:
                  'relative',

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                width:
                  150,

                height:
                  150,

                mx:
                  'auto',

                borderRadius:
                  '50%',

                background:
                  (
                    `conic-gradient(`
                    + `${scoreColor} `
                    + `${Math.max(
                      0,
                      Math.min(
                        100,
                        analysis.health_score ??
                          0,
                      ),
                    ) * 3.6}deg, `
                    + 'var(--eleven-ring-track) 0deg'
                    + ')'
                  ),

                '&::after':
                  {
                    content:
                      '""',

                    position:
                      'absolute',

                    inset:
                      10,

                    borderRadius:
                      '50%',

                    bgcolor:
                      'var(--eleven-paper)',
                  },
              }}
            >
              <Box
                sx={{
                  zIndex:
                    1,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  sx={{
                    color:
                      'var(--eleven-text)',

                    fontSize:
                      34,

                    fontWeight:
                      800,

                    lineHeight:
                      1,
                  }}
                >
                  {analysis.health_score ??
                    '—'}
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.6,

                    color:
                      'var(--eleven-text-secondary)',

                    fontSize:
                      10.5,

                    fontWeight:
                      600,
                  }}
                >
                  Lead Health
                </Typography>
              </Box>
            </Box>


            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent:
                  'center',

                flexWrap:
                  'wrap',

                rowGap:
                  1,
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
                  fontWeight:
                    800,
                }}
              />

              <Chip
                label={
                  `Confidence ${analysis.confidence}%`
                }
                variant="outlined"
                sx={{
                  bgcolor:
                    'var(--eleven-paper)',

                  fontWeight:
                    700,
                }}
              />

              {analysis.risk_level !==
                'LOW' &&
                analysis.risk_level !==
                  'CLOSED' && (
                  <Chip
                    label="Action Recommended"
                    variant="outlined"
                    icon={
                      <TrendingUpRounded />
                    }
                    sx={{
                      bgcolor:
                        'var(--eleven-paper)',

                      fontWeight:
                        700,
                    }}
                  />
                )}
            </Stack>


            <Divider />


            <Box>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  alignItems:
                    'center',

                  mb:
                    0.8,
                }}
              >
                <InsightsRounded
                  sx={{
                    color:
                      'var(--eleven-primary)',

                    fontSize:
                      18,
                  }}
                />

                <Typography
                  sx={{
                    color:
                      'var(--eleven-text)',

                    fontSize:
                      12,

                    fontWeight:
                      800,
                  }}
                >
                  AI Summary
                </Typography>
              </Stack>

              <Typography
                sx={{
                  color:
                    'var(--eleven-text-secondary)',

                  fontSize:
                    12,

                  lineHeight:
                    1.65,
                }}
              >
                {analysis.summary}
              </Typography>
            </Box>


            {analysis.reasons.length >
              0 && (
              <>
                <Divider />

                <Box>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      alignItems:
                        'center',

                      mb:
                        0.9,
                    }}
                  >
                    <DataObjectRounded
                      sx={{
                        color:
                          'var(--eleven-purple)',

                        fontSize:
                          18,
                      }}
                    />

                    <Typography
                      sx={{
                        color:
                          'var(--eleven-text)',

                        fontSize:
                          12,

                        fontWeight:
                          800,
                      }}
                    >
                      Risk Signals
                    </Typography>
                  </Stack>


                  <Stack
                    spacing={0.8}
                  >
                    {analysis.reasons.map(
                      (
                        reason,
                        index,
                      ) => (
                        <Stack
                          key={
                            `${index}-${reason}`
                          }
                          direction="row"
                          spacing={0.85}
                          sx={{
                            alignItems:
                              'flex-start',
                          }}
                        >
                          <Box
                            sx={{
                              width:
                                6,

                              height:
                                6,

                              mt:
                                '6px',

                              flexShrink:
                                0,

                              borderRadius:
                                '50%',

                              bgcolor:
                                getScoreColor(
                                  analysis.health_score,
                                ),
                            }}
                          />

                          <Typography
                            sx={{
                              color:
                                'var(--eleven-text-secondary)',

                              fontSize:
                                11.75,

                              lineHeight:
                                1.55,
                            }}
                          >
                            {reason}
                          </Typography>
                        </Stack>
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
              sx={{
                border:
                  '1px solid var(--eleven-primary-border)',

                bgcolor:
                  'var(--eleven-primary-soft)',
              }}
            >
              <Typography
                sx={{
                  mb:
                    0.45,

                  color:
                    'var(--eleven-text)',

                  fontSize:
                    11.5,

                  fontWeight:
                    800,
                }}
              >
                Recommended Next Action
              </Typography>

              <Typography
                sx={{
                  fontSize:
                    11.75,

                  lineHeight:
                    1.55,
                }}
              >
                {analysis.recommended_action}
              </Typography>
            </Alert>


            <Box
              sx={{
                p:
                  1.25,

                borderRadius:
                  '9px',

                bgcolor:
                  'var(--eleven-surface-soft)',

                border:
                  '1px solid var(--eleven-border)',
              }}
            >
              <Stack
                direction="row"
                sx={{
                  justifyContent:
                    'space-between',

                  alignItems:
                    'center',

                  gap:
                    1.25,
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.7}
                  sx={{
                    alignItems:
                      'center',

                    minWidth:
                      0,
                  }}
                >
                  <MemoryRounded
                    sx={{
                      color:
                        'var(--eleven-primary)',

                      fontSize:
                        16,
                    }}
                  />

                  <Box
                    sx={{
                      minWidth:
                        0,
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          'var(--eleven-text-secondary)',

                        fontSize:
                          9.5,

                        fontWeight:
                          600,
                      }}
                    >
                      AI MODEL
                    </Typography>

                    <Typography
                      sx={{
                        mt:
                          0.1,

                        color:
                          'var(--eleven-text-secondary)',

                        fontSize:
                          10.5,

                        fontWeight:
                          700,

                        overflow:
                          'hidden',

                        textOverflow:
                          'ellipsis',

                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {getModelLabel(
                        analysis.model,
                      )}
                    </Typography>
                  </Box>
                </Stack>


                <Chip
                  size="small"
                  label="Advisory only"
                  variant="outlined"
                  sx={{
                    flexShrink:
                      0,

                    bgcolor:
                      'var(--eleven-paper)',

                    fontSize:
                      9.5,
                  }}
                />
              </Stack>
            </Box>


            <Button
              fullWidth
              variant="outlined"
              disabled={
                isClosed
              }
              onClick={() =>
                void handleAnalyze()
              }
              startIcon={
                <RefreshRounded />
              }
              sx={{
                minHeight:
                  40,

                borderRadius:
                  '9px',

                fontWeight:
                  700,
              }}
            >
              Re-analyze with AI
            </Button>


            <Typography
              sx={{
                color:
                  'var(--eleven-text-muted)',

                fontSize:
                  9.75,

                lineHeight:
                  1.5,

                textAlign:
                  'center',
              }}
            >
              AI-generated advisory insight. Final qualification,
              assignment and opportunity decisions remain with the sales team.
            </Typography>
          </Stack>
        )}
      </Box>
    </Card>
  )
}


export default LeadRescueRadarCard
