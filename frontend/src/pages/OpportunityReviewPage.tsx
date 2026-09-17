import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

import {
  CheckCircleRounded,
  DoNotDisturbAltRounded,
  GavelRounded,
  HandshakeRounded,
  OpenInNewRounded,
  RefreshRounded,
} from '@mui/icons-material'

import {
  useNavigate,
} from 'react-router'

import {
  getLeads,
  getTechnicalAssessments,
  type Lead,
  type TechnicalAssessment,
} from '../services/crm'

import {
  getFinancialAssessments,
  type FinancialAssessment,
} from '../services/financialCrm'

import {
  convertLeadToDeal,
  createLeadOpportunityDecision,
  getLeadOpportunityDecision,
  type OpportunityDecisionState,
} from '../services/opportunityCrm'


type DecisionAction =
  | 'PROCEED'
  | 'DO_NOT_PROCEED'


type OpportunityReviewItem = {
  lead:
    Lead

  technicalAssessment:
    TechnicalAssessment | null

  financialAssessment:
    FinancialAssessment | null

  opportunityState:
    OpportunityDecisionState | null

  readyForDecision:
    boolean
}


function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return '—'
  }

  return new Date(
    value,
  ).toLocaleString(
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


function getInitials(
  value:
    string,
) {
  return (
    value
      .trim()
      .split(
        /\s+/,
      )
      .filter(
        Boolean,
      )
      .slice(
        0,
        2,
      )
      .map(
        (
          part,
        ) =>
          part
            .charAt(
              0,
            )
            .toUpperCase(),
      )
      .join(
        '',
      ) ||
    'L'
  )
}


function getAssessmentColor(
  status:
    string | undefined,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  switch (
    status
  ) {
    case 'REQUESTED':
      return 'info'

    case 'IN_PROGRESS':
      return 'warning'

    case 'SUBMITTED':
      return 'warning'

    case 'REVIEWED':
      return 'success'

    default:
      return 'default'
  }
}


function getOpportunityLabel(
  item:
    OpportunityReviewItem,
) {
  const state =
    item.opportunityState

  if (
    state?.deal
  ) {
    return 'Converted to Deal'
  }

  if (
    state?.decision
      ?.decision ===
    'PROCEED'
  ) {
    return 'Proceed'
  }

  if (
    state?.decision
      ?.decision ===
    'DO_NOT_PROCEED'
  ) {
    return 'Do Not Proceed'
  }

  if (
    item.readyForDecision
  ) {
    return 'Ready for Decision'
  }

  if (
    !item.financialAssessment
  ) {
    return 'Financial Assessment Required'
  }

  if (
    item
      .financialAssessment
      .status !== 'SUBMITTED' &&
    item.financialAssessment.status !== 'REVIEWED'
  ) {
    return 'Financial Assessment Pending'
  }

  if (item.financialAssessment.outcome === 'FINANCIALLY_UNSUITABLE') {
    return 'Ready for Do Not Proceed'
  }

  if (!item.technicalAssessment) {
    return 'Technical Assessment Required'
  }

  if (
    item.technicalAssessment.status !== 'SUBMITTED' &&
    item.technicalAssessment.status !== 'REVIEWED'
  ) {
    return 'Technical Assessment Pending'
  }

  return 'Not Ready'
}


function getOpportunityColor(
  item:
    OpportunityReviewItem,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  if (
    item
      .opportunityState
      ?.deal
  ) {
    return 'success'
  }

  if (
    item
      .opportunityState
      ?.decision
      ?.decision ===
    'PROCEED'
  ) {
    return 'success'
  }

  if (
    item
      .opportunityState
      ?.decision
      ?.decision ===
    'DO_NOT_PROCEED'
  ) {
    return 'error'
  }

  if (
    item.readyForDecision
  ) {
    return 'info'
  }

  return 'warning'
}


function findLatestTechnicalAssessment(
  assessments:
    TechnicalAssessment[],
  leadId:
    number,
) {
  return (
    assessments
      .filter(
        (
          assessment,
        ) =>
          assessment.lead ===
          leadId,
      )
      .sort(
        (
          first,
          second,
        ) =>
          new Date(
            second.created_at,
          ).getTime() -
          new Date(
            first.created_at,
          ).getTime(),
      )[
        0
      ] ??
    null
  )
}


function findLatestFinancialAssessment(
  assessments:
    FinancialAssessment[],
  leadId:
    number,
) {
  return (
    assessments
      .filter(
        (
          assessment,
        ) =>
          assessment.lead ===
          leadId,
      )
      .sort(
        (
          first,
          second,
        ) =>
          new Date(
            second.created_at,
          ).getTime() -
          new Date(
            first.created_at,
          ).getTime(),
      )[
        0
      ] ??
    null
  )
}


function InformationItem({
  label,
  value,
}: {
  label:
    string

  value:
    string
}) {
  return (
    <Box>
      <Typography
        sx={{
          color:
            'var(--eleven-text-muted)',

          fontSize:
            11,

          fontWeight:
            700,

          textTransform:
            'uppercase',

          letterSpacing:
            '0.045em',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt:
            0.55,

          color:
            'var(--eleven-text)',

          fontSize:
            13,

          fontWeight:
            500,

          lineHeight:
            1.5,

          wordBreak:
            'break-word',
        }}
      >
        {value ||
          '—'}
      </Typography>
    </Box>
  )
}


function OpportunityReviewPage() {
  const navigate =
    useNavigate()


  const [
    leads,
    setLeads,
  ] =
    useState<
      Lead[]
    >(
      [],
    )


  const [
    technicalAssessments,
    setTechnicalAssessments,
  ] =
    useState<
      TechnicalAssessment[]
    >(
      [],
    )


  const [
    financialAssessments,
    setFinancialAssessments,
  ] =
    useState<
      FinancialAssessment[]
    >(
      [],
    )


  const [
    opportunityStates,
    setOpportunityStates,
  ] =
    useState<
      Record<
        number,
        OpportunityDecisionState
      >
    >(
      {},
    )


  const [
    selectedLeadId,
    setSelectedLeadId,
  ] =
    useState<
      number | null
    >(
      null,
    )


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    )


  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    )


  const [
    loadError,
    setLoadError,
  ] =
    useState(
      '',
    )


  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      '',
    )


  const [
    decisionDialogOpen,
    setDecisionDialogOpen,
  ] =
    useState(
      false,
    )


  const [
    decisionAction,
    setDecisionAction,
  ] =
    useState<
      DecisionAction
    >(
      'PROCEED',
    )


  const [
    decisionNotes,
    setDecisionNotes,
  ] =
    useState(
      '',
    )


  const [
    decisionError,
    setDecisionError,
  ] =
    useState(
      '',
    )


  const [
    isSavingDecision,
    setIsSavingDecision,
  ] =
    useState(
      false,
    )


  const [
    isConverting,
    setIsConverting,
  ] =
    useState(
      false,
    )


  const [
    conversionError,
    setConversionError,
  ] =
    useState(
      '',
    )


  const loadWorkspace =
    useCallback(
      async (
        refreshing =
          false,
      ) => {
        if (
          refreshing
        ) {
          setIsRefreshing(
            true,
          )
        } else {
          setIsLoading(
            true,
          )
        }

        setLoadError(
          '',
        )

        try {
          const [
            leadData,
            technicalData,
            financialData,
          ] =
            await Promise.all([
              getLeads(),

              getTechnicalAssessments(),

              getFinancialAssessments(),
            ])


          const opportunityLeads = leadData.filter(
            (lead) => !['WON', 'LOST', 'DISQUALIFIED'].includes(lead.status),
          )


          const stateEntries =
            await Promise.all(
              opportunityLeads.map(
                async (
                  lead,
                ) => {
                  const state =
                    await getLeadOpportunityDecision(
                      lead.id,
                    )

                  return [
                    lead.id,
                    state,
                  ] as const
                },
              ),
            )


          const nextStates:
          Record<
            number,
            OpportunityDecisionState
          > = {}


          for (
            const [
              leadId,
              state,
            ]
            of stateEntries
          ) {
            nextStates[
              leadId
            ] =
              state
          }


          setLeads(
            leadData,
          )

          setTechnicalAssessments(
            technicalData,
          )

          setFinancialAssessments(
            financialData,
          )

          setOpportunityStates(
            nextStates,
          )


          const firstLeadId =
            opportunityLeads[
              0
            ]?.id ??
            null


          setSelectedLeadId(
            (
              current,
            ) => {
              if (
                current !==
                  null &&
                opportunityLeads.some(
                  (
                    lead,
                  ) =>
                    lead.id ===
                    current,
                )
              ) {
                return current
              }

              return firstLeadId
            },
          )
        } catch (
          requestError
        ) {
          setLoadError(
            requestError
              instanceof Error
              ? requestError.message
              : 'Unable to load opportunity review data.',
          )
        } finally {
          setIsLoading(
            false,
          )

          setIsRefreshing(
            false,
          )
        }
      },
      [],
    )


  useEffect(
    () => {
      void loadWorkspace()
    },
    [
      loadWorkspace,
    ],
  )


  const reviewItems =
    useMemo<
      OpportunityReviewItem[]
    >(
      () =>
        leads
          .filter((lead) => !['WON', 'LOST', 'DISQUALIFIED'].includes(lead.status))
          .map(
            (
              lead,
            ) => {
              const technicalAssessment =
                findLatestTechnicalAssessment(
                  technicalAssessments,
                  lead.id,
                )

              const financialAssessment =
                findLatestFinancialAssessment(
                  financialAssessments,
                  lead.id,
                )

              const opportunityState =
                opportunityStates[
                  lead.id
                ] ??
                null

              const financeCompleted =
                financialAssessment?.status === 'SUBMITTED' ||
                financialAssessment?.status === 'REVIEWED'
              const technicalCompleted =
                technicalAssessment?.status === 'SUBMITTED' ||
                technicalAssessment?.status === 'REVIEWED'
              const readyForDecision = Boolean(
                financeCompleted &&
                (
                  financialAssessment?.outcome === 'FINANCIALLY_UNSUITABLE' ||
                  (
                    financialAssessment?.outcome === 'FINANCIALLY_SUITABLE' &&
                    technicalCompleted
                  )
                ) &&
                !opportunityState?.decision,
              )

              return {
                lead,

                technicalAssessment,

                financialAssessment,

                opportunityState,

                readyForDecision,
              }
            },
          )
          .sort(
            (
              first,
              second,
            ) => {
              const firstRank =
                first
                  .opportunityState
                  ?.deal
                  ? 4
                  : first
                      .opportunityState
                      ?.decision
                      ?.decision ===
                      'DO_NOT_PROCEED'
                    ? 3
                    : first
                        .opportunityState
                        ?.decision
                        ?.decision ===
                      'PROCEED'
                      ? 2
                      : first
                          .readyForDecision
                        ? 0
                        : 1

              const secondRank =
                second
                  .opportunityState
                  ?.deal
                  ? 4
                  : second
                      .opportunityState
                      ?.decision
                      ?.decision ===
                      'DO_NOT_PROCEED'
                    ? 3
                    : second
                        .opportunityState
                        ?.decision
                        ?.decision ===
                      'PROCEED'
                      ? 2
                      : second
                          .readyForDecision
                        ? 0
                        : 1

              if (
                firstRank !==
                secondRank
              ) {
                return (
                  firstRank -
                  secondRank
                )
              }

              return (
                new Date(
                  second
                    .lead
                    .updated_at,
                ).getTime() -
                new Date(
                  first
                    .lead
                    .updated_at,
                ).getTime()
              )
            },
          ),
      [
        leads,
        technicalAssessments,
        financialAssessments,
        opportunityStates,
      ],
    )


  const selectedItem =
    useMemo(
      () =>
        reviewItems.find(
          (
            item,
          ) =>
            item
              .lead
              .id ===
            selectedLeadId,
        ) ??
        null,
      [
        reviewItems,
        selectedLeadId,
      ],
    )


  const readyCount =
    reviewItems.filter(
      (
        item,
      ) =>
        item.readyForDecision,
    ).length


  const proceedCount =
    reviewItems.filter(
      (
        item,
      ) =>
        item
          .opportunityState
          ?.decision
          ?.decision ===
        'PROCEED',
    ).length


  const convertedCount =
    reviewItems.filter(
      (
        item,
      ) =>
        Boolean(
          item
            .opportunityState
            ?.deal,
        ),
    ).length


  const doNotProceedCount =
    reviewItems.filter(
      (
        item,
      ) =>
        item
          .opportunityState
          ?.decision
          ?.decision ===
        'DO_NOT_PROCEED',
    ).length


  const openDecisionDialog =
    (
      action:
        DecisionAction,
    ) => {
      if (
        !selectedItem
          ?.readyForDecision
      ) {
        return
      }

      setDecisionAction(
        action,
      )

      setDecisionNotes(
        '',
      )

      setDecisionError(
        '',
      )

      setDecisionDialogOpen(
        true,
      )
    }


  const closeDecisionDialog =
    () => {
      if (
        isSavingDecision
      ) {
        return
      }

      setDecisionDialogOpen(
        false,
      )

      setDecisionError(
        '',
      )
    }


  const handleDecision =
    async () => {
      if (
        !selectedItem ||
        !selectedItem
          .readyForDecision
      ) {
        return
      }

      const notes =
        decisionNotes
          .trim()

      if (decisionAction === 'DO_NOT_PROCEED' && !notes) {
        setDecisionError(
          'A reason is required when choosing Do Not Proceed.',
        )

        return
      }

      setIsSavingDecision(
        true,
      )

      setDecisionError(
        '',
      )

      try {
        const decision =
          await createLeadOpportunityDecision(
            selectedItem
              .lead
              .id,
            {
              decision:
                decisionAction,

              decision_notes:
                notes,
            },
          )


        setOpportunityStates(
          (
            current,
          ) => ({
            ...current,

            [
              selectedItem
                .lead
                .id
            ]:
              {
                decision,

                can_convert:
                  decision
                    .decision ===
                    'PROCEED',

                deal:
                  null,
              },
          }),
        )


        setDecisionDialogOpen(
          false,
        )

        setDecisionNotes(
          '',
        )

        setSuccessMessage(
          decisionAction ===
            'PROCEED'
            ? 'Proceed decision recorded. The Lead is now ready for Deal conversion.'
            : 'Do Not Proceed decision recorded.',
        )
      } catch (
        requestError
      ) {
        setDecisionError(
          requestError
            instanceof Error
              ? requestError.message
              : 'Unable to record the opportunity decision.',
        )
      } finally {
        setIsSavingDecision(
          false,
        )
      }
    }


  const handleConvertToDeal =
    async () => {
      if (
        !selectedItem ||
        !selectedItem
          .opportunityState
          ?.can_convert
      ) {
        return
      }

      setIsConverting(
        true,
      )

      setConversionError(
        '',
      )

      try {
        const result =
          await convertLeadToDeal(
            selectedItem
              .lead
              .id,
          )


        setLeads(
          (
            current,
          ) =>
            current.map(
              (
                lead,
              ) =>
                lead.id ===
                result
                  .lead
                  .id
                  ? result.lead
                  : lead,
            ),
        )


        setOpportunityStates(
          (
            current,
          ) => ({
            ...current,

            [
              result
                .lead
                .id
            ]:
              {
                decision:
                  result
                    .opportunity_decision,

                can_convert:
                  false,

                deal:
                  result.deal,
              },
          }),
        )


        setSuccessMessage(
          `Deal #${result.deal.id} created successfully. The lead has moved to Proposal.`,
        )
      } catch (
        requestError
      ) {
        setConversionError(
          requestError
            instanceof Error
              ? requestError.message
              : 'Unable to convert this opportunity to a Deal.',
        )
      } finally {
        setIsConverting(
          false,
        )
      }
    }


  if (
    isLoading
  ) {
    return (
      <Box
        sx={{
          minHeight:
            520,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <Stack
          spacing={
            1.5
          }
          sx={{
            alignItems:
              'center',
          }}
        >
          <CircularProgress />

          <Typography
            color="text.secondary"
          >
            Loading opportunity review...
          </Typography>
        </Stack>
      </Box>
    )
  }


  return (
    <Box
      sx={{
        px: {
          xs:
            2.5,

          md:
            4,
        },

        py: {
          xs:
            3,

          md:
            3.5,
        },
      }}
    >
      <Box
        sx={{
          width:
            '100%',

          maxWidth:
            1500,

          mx:
            'auto',
        }}
      >
        <Stack
          direction={{
            xs:
              'column',

            md:
              'row',
          }}
          sx={{
            mb:
              3,

            justifyContent:
              'space-between',

            alignItems: {
              xs:
                'flex-start',

              md:
                'center',
            },

            gap:
              2,
          }}
        >
          <Box>
            <Stack
              direction="row"
              spacing={
                1
              }
              sx={{
                alignItems:
                  'center',
              }}
            >
              <GavelRounded
                sx={{
                  color:
                    'var(--eleven-primary)',

                  fontSize:
                    30,
                }}
              />

              <Typography
                sx={{
                  color:
                    'var(--eleven-text)',

                  fontSize: {
                    xs:
                      26,

                    md:
                      30,
                  },

                  fontWeight:
                    700,

                  letterSpacing:
                    '-0.025em',
                }}
              >
                Opportunity Review
              </Typography>
            </Stack>

            <Typography
              sx={{
                mt:
                  0.6,

                color:
                  'var(--eleven-text-secondary)',

                fontSize:
                  13.5,
              }}
            >
              Review specialist evidence, record Proceed or Do Not Proceed, and convert proceeding Leads into Deals.
            </Typography>
          </Box>


          <Button
            variant="outlined"
            startIcon={
              isRefreshing
                ? (
                    <CircularProgress
                      size={
                        17
                      }
                    />
                  )
                : (
                    <RefreshRounded />
                  )
            }
            disabled={
              isRefreshing
            }
            onClick={() =>
              void loadWorkspace(
                true,
              )
            }
            sx={{
              bgcolor:
                'var(--eleven-paper)',
            }}
          >
            Refresh
          </Button>
        </Stack>


        {loadError && (
          <Alert
            severity="error"
            sx={{
              mb:
                2.5,
            }}
          >
            {loadError}
          </Alert>
        )}


        {successMessage && (
          <Alert
            severity="success"
            onClose={() =>
              setSuccessMessage(
                '',
              )
            }
            sx={{
              mb:
                2.5,
            }}
          >
            {successMessage}
          </Alert>
        )}


        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            borderRadius:
              '12px',

            borderColor:
              'var(--eleven-border)',

            boxShadow:
              '0 2px 8px rgba(15, 23, 42, 0.035)',
          }}
        >
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  'repeat(2, minmax(0, 1fr))',

                md:
                  'repeat(4, minmax(0, 1fr))',
              },
            }}
          >
            {[
              [
                'Ready for Decision',
                readyCount,
              ],

              [
                'Proceed',
                proceedCount,
              ],

              [
                'Do Not Proceed',
                doNotProceedCount,
              ],

              [
                'Converted',
                convertedCount,
              ],
            ].map(
              ([
                label,
                value,
              ],
              index,
              ) => (
                <Box
                  key={
                    label
                  }
                  sx={{
                    px:
                      2.5,

                    py:
                      2.2,

                    borderRight: {
                      xs:
                        index %
                          2 ===
                        0
                          ? '1px solid var(--eleven-border)'
                          : 'none',

                      md:
                        index <
                        3
                          ? '1px solid var(--eleven-border)'
                          : 'none',
                    },

                    borderBottom: {
                      xs:
                        index <
                        2
                          ? '1px solid var(--eleven-border)'
                          : 'none',

                      md:
                        'none',
                    },
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        'var(--eleven-text-secondary)',

                      fontSize:
                        12,
                    }}
                  >
                    {label}
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.3,

                      color:
                        'var(--eleven-text)',

                      fontSize:
                        24,

                      fontWeight:
                        700,
                    }}
                  >
                    {value}
                  </Typography>
                </Box>
              ),
            )}
          </Box>
        </Card>


        {reviewItems.length ===
        0 ? (
          <Card
            variant="outlined"
            sx={{
              p:
                5,

              borderRadius:
                '12px',

              borderColor:
                'var(--eleven-border)',

              textAlign:
                'center',
            }}
          >
            <GavelRounded
              sx={{
                mb:
                  1,

                color:
                  'var(--eleven-text-muted)',

                fontSize:
                  40,
              }}
            />

            <Typography
              sx={{
                color:
                  'var(--eleven-text)',

                fontSize:
                  16,

                fontWeight:
                  700,
              }}
            >
              No opportunities to review
            </Typography>

            <Typography
              sx={{
                mt:
                  0.5,

                color:
                  'var(--eleven-text-secondary)',

                fontSize:
                  13,
              }}
            >
              Active leads will appear here as they progress through financial and technical assessment.
            </Typography>
          </Card>
        ) : (
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                lg:
                  '360px minmax(0, 1fr)',
              },

              gap:
                2.5,

              alignItems:
                'start',
            }}
          >
            <Card
              variant="outlined"
              sx={{
                borderRadius:
                  '12px',

                borderColor:
                  'var(--eleven-border)',

                overflow:
                  'hidden',

                boxShadow:
                  '0 2px 8px rgba(15, 23, 42, 0.035)',
              }}
            >
              <Box
                sx={{
                  px:
                    2.25,

                  py:
                    1.9,
                }}
              >
                <Typography
                  sx={{
                    color:
                      'var(--eleven-text)',

                    fontSize:
                      15,

                    fontWeight:
                      700,
                  }}
                >
                  Review Queue
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.25,

                    color:
                      'var(--eleven-text-muted)',

                    fontSize:
                      11.5,
                  }}
                >
                  Evidence-reviewed opportunities ready for a final decision
                </Typography>
              </Box>


              <Divider />


              <Stack
                spacing={
                  0
                }
              >
                {reviewItems.map(
                  (
                    item,
                  ) => {
                    const active =
                      selectedLeadId ===
                      item.lead.id

                    return (
                      <Box
                        key={
                          item.lead.id
                        }
                      >
                        <Button
                          fullWidth
                          onClick={() => {
                            setSelectedLeadId(
                              item.lead.id,
                            )

                            setConversionError(
                              '',
                            )
                          }}
                          sx={{
                            display:
                              'block',

                            px:
                              2.25,

                            py:
                              1.8,

                            borderRadius:
                              0,

                            textAlign:
                              'left',

                            textTransform:
                              'none',

                            bgcolor:
                              active
                                ? 'var(--eleven-primary-soft)'
                                : 'var(--eleven-paper)',

                            '&:hover':
                              {
                                bgcolor:
                                  active
                                    ? 'var(--eleven-primary-soft)'
                                    : 'var(--eleven-surface-soft)',
                              },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={
                              1.25
                            }
                            sx={{
                              alignItems:
                                'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                width:
                                  38,

                                height:
                                  38,

                                flexShrink:
                                  0,

                                display:
                                  'flex',

                                alignItems:
                                  'center',

                                justifyContent:
                                  'center',

                                borderRadius:
                                  '50%',

                                bgcolor:
                                  'var(--eleven-primary-soft)',

                                color:
                                  'var(--eleven-primary)',

                                fontSize:
                                  12,

                                fontWeight:
                                  700,
                              }}
                            >
                              {getInitials(
                                item
                                  .lead
                                  .contact_name,
                              )}
                            </Box>


                            <Box
                              sx={{
                                minWidth:
                                  0,

                                flex:
                                  1,
                              }}
                            >
                              <Typography
                                sx={{
                                  overflow:
                                    'hidden',

                                  color:
                                    'var(--eleven-text)',

                                  fontSize:
                                    13.5,

                                  fontWeight:
                                    700,

                                  textOverflow:
                                    'ellipsis',

                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {item.lead.contact_name}
                              </Typography>

                              <Typography
                                sx={{
                                  mt:
                                    0.15,

                                  overflow:
                                    'hidden',

                                  color:
                                    'var(--eleven-text-secondary)',

                                  fontSize:
                                    11.5,

                                  textOverflow:
                                    'ellipsis',

                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {item.lead.company_name}
                              </Typography>

                              <Chip
                                size="small"
                                label={
                                  getOpportunityLabel(
                                    item,
                                  )
                                }
                                color={
                                  getOpportunityColor(
                                    item,
                                  )
                                }
                                variant="outlined"
                                sx={{
                                  mt:
                                    1,

                                  maxWidth:
                                    '100%',

                                  height:
                                    'auto',

                                  '& .MuiChip-label':
                                    {
                                      py:
                                        0.35,

                                      whiteSpace:
                                        'normal',
                                    },
                                }}
                              />
                            </Box>
                          </Stack>
                        </Button>

                        <Divider />
                      </Box>
                    )
                  },
                )}
              </Stack>
            </Card>


            {selectedItem && (
              <>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius:
                      '12px',

                    borderColor:
                      'var(--eleven-border)',

                    boxShadow:
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      p:
                        2.5,
                    }}
                  >
                    <Stack
                      direction={{
                        xs:
                          'column',

                        md:
                          'row',
                      }}
                      sx={{
                        justifyContent:
                          'space-between',

                        alignItems: {
                          xs:
                            'flex-start',

                          md:
                            'center',
                        },

                        gap:
                          2,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text)',

                            fontSize:
                              22,

                            fontWeight:
                              700,
                          }}
                        >
                          {selectedItem.lead.contact_name}
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.3,

                            color:
                              'var(--eleven-primary)',

                            fontSize:
                              14,

                            fontWeight:
                              600,
                          }}
                        >
                          {selectedItem.lead.company_name}
                        </Typography>
                      </Box>


                      <Stack
                        direction="row"
                        spacing={
                          1
                        }
                        sx={{
                          flexWrap:
                            'wrap',

                          rowGap:
                            1,
                        }}
                      >
                        <Chip
                          label={
                            selectedItem
                              .lead
                              .status_display
                          }
                          color={
                            selectedItem
                              .lead
                              .status ===
                            'PROPOSAL'
                              ? 'warning'
                              : 'success'
                          }
                          variant="outlined"
                        />

                        <Chip
                          label={
                            getOpportunityLabel(
                              selectedItem,
                            )
                          }
                          color={
                            getOpportunityColor(
                              selectedItem,
                            )
                          }
                          variant="outlined"
                        />
                      </Stack>
                    </Stack>


                    <Divider
                      sx={{
                        my:
                          2.25,
                      }}
                    />


                    <Box
                      sx={{
                        display:
                          'grid',

                        gridTemplateColumns: {
                          xs:
                            '1fr',

                          sm:
                            'repeat(2, minmax(0, 1fr))',

                          md:
                            'repeat(4, minmax(0, 1fr))',
                        },

                        gap:
                          2,
                      }}
                    >
                      <InformationItem
                        label="Email"
                        value={
                          selectedItem
                            .lead
                            .email ||
                          'Not provided'
                        }
                      />

                      <InformationItem
                        label="Phone"
                        value={
                          selectedItem
                            .lead
                            .phone
                        }
                      />

                      <InformationItem
                        label="Assigned Rep"
                        value={
                          selectedItem
                            .lead
                            .assigned_to_name ||
                          'Unassigned'
                        }
                      />

                      <InformationItem
                        label="Lead Source"
                        value={
                          selectedItem
                            .lead
                            .source ||
                          'Not provided'
                        }
                      />
                    </Box>


                    <Button
                      size="small"
                      variant="text"
                      endIcon={
                        <OpenInNewRounded />
                      }
                      onClick={() =>
                        navigate(
                          `/leads/${selectedItem.lead.id}`,
                        )
                      }
                      sx={{
                        mt:
                          2,

                        px:
                          0,
                      }}
                    >
                      Open Lead Workspace
                    </Button>
                  </Box>
                </Card>


                <Box
                  sx={{
                    gridColumn: {
                      xs:
                        '1',

                      lg:
                        '1 / -1',
                    },

                    display:
                      'grid',

                    gridTemplateColumns: {
                      xs:
                        '1fr',

                      md:
                        'repeat(2, minmax(0, 1fr))',
                    },

                    gap:
                      2.5,

                    alignItems:
                      'stretch',
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      height:
                        '100%',

                      borderRadius:
                        '12px',

                      borderColor:
                        'var(--eleven-border)',
                    }}
                  >
                    <Box
                      sx={{
                        px:
                          2.5,

                        py:
                          1.9,
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
                            1,
                        }}
                      >
                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text)',

                            fontSize:
                              15,

                            fontWeight:
                              700,
                          }}
                        >
                          Technical Assessment
                        </Typography>

                        {selectedItem
                          .technicalAssessment && (
                          <Chip
                            size="small"
                            label={
                              selectedItem
                                .technicalAssessment
                                .status_display
                            }
                            color={
                              getAssessmentColor(
                                selectedItem
                                  .technicalAssessment
                                  .status,
                              )
                            }
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>


                    <Divider />


                    <Box
                      sx={{
                        p:
                          2.5,
                      }}
                    >
                      {!selectedItem
                        .technicalAssessment ? (
                        <Alert
                          severity="warning"
                          variant="outlined"
                        >
                          No technical assessment has been recorded.
                        </Alert>
                      ) : (
                        <Stack
                          spacing={
                            2
                          }
                        >
                          <Box
                            sx={{
                              display:
                                'grid',

                              gridTemplateColumns: {
                                xs:
                                  '1fr',

                                sm:
                                  'repeat(2, minmax(0, 1fr))',
                              },

                              gap:
                                2,
                            }}
                          >
                            <InformationItem
                              label="Tech Lead"
                              value={
                                selectedItem
                                  .technicalAssessment
                                  .assigned_to_name
                              }
                            />

                            <InformationItem
                              label="Reviewed By"
                              value={
                                selectedItem
                                  .technicalAssessment
                                  .reviewed_by_name ||
                                '—'
                              }
                            />

                            <InformationItem
                              label="Submitted"
                              value={
                                formatDate(
                                  selectedItem
                                    .technicalAssessment
                                    .submitted_at,
                                )
                              }
                            />

                            <InformationItem
                              label="Reviewed"
                              value={
                                formatDate(
                                  selectedItem
                                    .technicalAssessment
                                    .reviewed_at,
                                )
                              }
                            />
                          </Box>


                          {selectedItem
                            .technicalAssessment
                            .technical_comments && (
                            <Box>
                              <Typography
                                sx={{
                                  mb:
                                    0.7,

                                  color:
                                    'var(--eleven-text-secondary)',

                                  fontSize:
                                    11,

                                  fontWeight:
                                    700,

                                  textTransform:
                                    'uppercase',
                                }}
                              >
                                Technical Findings
                              </Typography>

                              <Box
                                sx={{
                                  p:
                                    1.5,

                                  border:
                                    '1px solid var(--eleven-border)',

                                  borderRadius:
                                    '8px',

                                  bgcolor:
                                    'var(--eleven-surface-soft)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color:
                                      'var(--eleven-text-secondary)',

                                    fontSize:
                                      12.5,

                                    lineHeight:
                                      1.6,

                                    whiteSpace:
                                      'pre-wrap',
                                  }}
                                >
                                  {
                                    selectedItem
                                      .technicalAssessment
                                      .technical_comments
                                  }
                                </Typography>
                              </Box>
                            </Box>
                          )}


                          {selectedItem
                            .technicalAssessment
                            .review_notes && (
                            <Alert
                              severity="success"
                              variant="outlined"
                            >
                              {
                                selectedItem
                                  .technicalAssessment
                                  .review_notes
                              }
                            </Alert>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Card>


                  <Card
                    variant="outlined"
                    sx={{
                      height:
                        '100%',

                      borderRadius:
                        '12px',

                      borderColor:
                        'var(--eleven-border)',
                    }}
                  >
                    <Box
                      sx={{
                        px:
                          2.5,

                        py:
                          1.9,
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
                            1,
                        }}
                      >
                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text)',

                            fontSize:
                              15,

                            fontWeight:
                              700,
                          }}
                        >
                          Financial Assessment
                        </Typography>

                        {selectedItem
                          .financialAssessment && (
                          <Chip
                            size="small"
                            label={
                              selectedItem
                                .financialAssessment
                                .status_display
                            }
                            color={
                              getAssessmentColor(
                                selectedItem
                                  .financialAssessment
                                  .status,
                              )
                            }
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </Box>


                    <Divider />


                    <Box
                      sx={{
                        p:
                          2.5,
                      }}
                    >
                      {!selectedItem
                        .financialAssessment ? (
                        <Alert
                          severity="warning"
                          variant="outlined"
                        >
                          No financial assessment has been recorded.
                        </Alert>
                      ) : (
                        <Stack
                          spacing={
                            2
                          }
                        >
                          <Box
                            sx={{
                              display:
                                'grid',

                              gridTemplateColumns: {
                                xs:
                                  '1fr',

                                sm:
                                  'repeat(2, minmax(0, 1fr))',
                              },

                              gap:
                                2,
                            }}
                          >
                            <InformationItem
                              label="Financial Officer"
                              value={
                                selectedItem
                                  .financialAssessment
                                  .assigned_to_name
                              }
                            />

                            <InformationItem
                              label="Reviewed By"
                              value={
                                selectedItem
                                  .financialAssessment
                                  .reviewed_by_name ||
                                '—'
                              }
                            />

                            <InformationItem
                              label="Submitted"
                              value={
                                formatDate(
                                  selectedItem
                                    .financialAssessment
                                    .submitted_at,
                                )
                              }
                            />

                            <InformationItem
                              label="Reviewed"
                              value={
                                formatDate(
                                  selectedItem
                                    .financialAssessment
                                    .reviewed_at,
                                )
                              }
                            />
                          </Box>


                          {selectedItem
                            .financialAssessment
                            .financial_comments && (
                            <Box>
                              <Typography
                                sx={{
                                  mb:
                                    0.7,

                                  color:
                                    'var(--eleven-text-secondary)',

                                  fontSize:
                                    11,

                                  fontWeight:
                                    700,

                                  textTransform:
                                    'uppercase',
                                }}
                              >
                                Financial Findings
                              </Typography>

                              <Box
                                sx={{
                                  p:
                                    1.5,

                                  border:
                                    '1px solid var(--eleven-border)',

                                  borderRadius:
                                    '8px',

                                  bgcolor:
                                    'var(--eleven-surface-soft)',
                                }}
                              >
                                <Typography
                                  sx={{
                                    color:
                                      'var(--eleven-text-secondary)',

                                    fontSize:
                                      12.5,

                                    lineHeight:
                                      1.6,

                                    whiteSpace:
                                      'pre-wrap',
                                  }}
                                >
                                  {
                                    selectedItem
                                      .financialAssessment
                                      .financial_comments
                                  }
                                </Typography>
                              </Box>
                            </Box>
                          )}


                          {selectedItem
                            .financialAssessment
                            .review_notes && (
                            <Alert
                              severity="success"
                              variant="outlined"
                            >
                              {
                                selectedItem
                                  .financialAssessment
                                  .review_notes
                              }
                            </Alert>
                          )}
                        </Stack>
                      )}
                    </Box>
                  </Card>
                </Box>


                <Card
                  variant="outlined"
                  sx={{
                    gridColumn: {
                      xs:
                        '1',

                      lg:
                        '1 / -1',
                    },

                    borderRadius:
                      '12px',

                    borderColor:
                      selectedItem
                        .readyForDecision
                        ? 'var(--eleven-info-border)'
                        : 'var(--eleven-border)',

                    boxShadow:
                      '0 2px 8px rgba(15, 23, 42, 0.035)',
                  }}
                >
                  <Box
                    sx={{
                      px:
                        2.5,

                      py:
                        2,
                    }}
                  >
                    <Stack
                      direction={{
                        xs:
                          'column',

                        sm:
                          'row',
                      }}
                      sx={{
                        justifyContent:
                          'space-between',

                        alignItems: {
                          xs:
                            'flex-start',

                          sm:
                            'center',
                        },

                        gap:
                          1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text)',

                            fontSize:
                              16,

                            fontWeight:
                              700,
                          }}
                        >
                          Opportunity Decision
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              'var(--eleven-text-muted)',

                            fontSize:
                              12,
                          }}
                        >
                          Final Sales Manager decision before Deal creation
                        </Typography>
                      </Box>


                      <Chip
                        label={
                          getOpportunityLabel(
                            selectedItem,
                          )
                        }
                        color={
                          getOpportunityColor(
                            selectedItem,
                          )
                        }
                        variant="outlined"
                      />
                    </Stack>
                  </Box>


                  <Divider />


                  <Box
                    sx={{
                      p:
                        2.5,
                    }}
                  >
                    {conversionError && (
                      <Alert
                        severity="error"
                        sx={{
                          mb:
                            2,
                        }}
                      >
                        {conversionError}
                      </Alert>
                    )}


                    {selectedItem
                      .opportunityState
                      ?.deal ? (
                      <Stack
                        spacing={
                          2
                        }
                      >
                        <Alert
                          severity="success"
                        >
                          This opportunity has been converted into a Deal successfully.
                        </Alert>


                        <Box
                          sx={{
                            display:
                              'grid',

                            gridTemplateColumns: {
                              xs:
                                '1fr',

                              sm:
                                'repeat(2, minmax(0, 1fr))',

                              md:
                                'repeat(4, minmax(0, 1fr))',
                            },

                            gap:
                              2,
                          }}
                        >
                          <InformationItem
                            label="Deal"
                            value={
                              `#${selectedItem.opportunityState.deal.id} — ${selectedItem.opportunityState.deal.name}`
                            }
                          />

                          <InformationItem
                            label="Deal Status"
                            value={
                              selectedItem
                                .opportunityState
                                .deal
                                .status_display
                            }
                          />

                          <InformationItem
                            label="Assigned To"
                            value={
                              selectedItem
                                .opportunityState
                                .deal
                                .assigned_to_name ||
                              'Unassigned'
                            }
                          />

                          <InformationItem
                            label="Created"
                            value={
                              formatDate(
                                selectedItem
                                  .opportunityState
                                  .deal
                                  .created_at,
                              )
                            }
                          />
                        </Box>


                        <Alert
                          severity="info"
                          variant="outlined"
                        >
                          Lead status is now Proposal. No Customer record has been created at this stage.
                        </Alert>
                      </Stack>
                    ) : selectedItem
                        .opportunityState
                        ?.decision ? (
                      <Stack
                        spacing={
                          2
                        }
                      >
                        <Alert
                          severity={
                            selectedItem
                              .opportunityState
                              .decision
                              .decision ===
                            'PROCEED'
                              ? 'success'
                              : 'error'
                          }
                        >
                          Opportunity{' '}
                          {
                            selectedItem
                              .opportunityState
                              .decision
                              .decision_display
                              .toLowerCase()
                          }{' '}
                          by{' '}
                          {
                            selectedItem
                              .opportunityState
                              .decision
                              .decided_by_name
                          }.
                        </Alert>


                        <Box>
                          <Typography
                            sx={{
                              mb:
                                0.7,

                              color:
                                'var(--eleven-text-secondary)',

                              fontSize:
                                11,

                              fontWeight:
                                700,

                              textTransform:
                                'uppercase',
                            }}
                          >
                            Decision Notes
                          </Typography>

                          <Box
                            sx={{
                              p:
                                1.5,

                              border:
                                '1px solid var(--eleven-border)',

                              borderRadius:
                                '8px',

                              bgcolor:
                                'var(--eleven-surface-soft)',
                            }}
                          >
                            <Typography
                              sx={{
                                color:
                                  'var(--eleven-text-secondary)',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.6,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {
                                selectedItem
                                  .opportunityState
                                  .decision
                                  .decision_notes
                              }
                            </Typography>
                          </Box>
                        </Box>


                        <Typography
                          sx={{
                            color:
                              'var(--eleven-text-muted)',

                            fontSize:
                              11.5,
                          }}
                        >
                          Decision recorded{' '}
                          {formatDate(
                            selectedItem
                              .opportunityState
                              .decision
                              .decided_at,
                          )}
                        </Typography>


                        {selectedItem
                          .opportunityState
                          .can_convert && (
                          <Button
                            variant="contained"
                            startIcon={
                              isConverting
                                ? (
                                    <CircularProgress
                                      size={
                                        18
                                      }
                                      color="inherit"
                                    />
                                  )
                                : (
                                    <HandshakeRounded />
                                  )
                            }
                            disabled={
                              isConverting
                            }
                            onClick={() =>
                              void handleConvertToDeal()
                            }
                            sx={{
                              alignSelf:
                                'flex-start',
                            }}
                          >
                            {isConverting
                              ? 'Converting...'
                              : 'Convert to Deal'}
                          </Button>
                        )}


                        {selectedItem
                          .opportunityState
                          .decision
                          .decision ===
                          'DO_NOT_PROCEED' && (
                          <Alert
                            severity="warning"
                            variant="outlined"
                          >
                            Opportunities marked Do Not Proceed cannot be converted into Deals.
                          </Alert>
                        )}
                      </Stack>
                    ) : selectedItem
                        .readyForDecision ? (
                      <Stack
                        spacing={
                          2
                        }
                      >
                        <Alert
                          severity="info"
                          variant="outlined"
                        >
                          The required specialist evidence is complete. This Lead is ready for the final Sales Manager decision.
                        </Alert>


                        <Stack
                          direction={{
                            xs:
                              'column',

                            sm:
                              'row',
                          }}
                          spacing={
                            1
                          }
                        >
                          {selectedItem.financialAssessment?.outcome === 'FINANCIALLY_SUITABLE' && (<Button
                            variant="contained"
                            color="success"
                            startIcon={
                              <CheckCircleRounded />
                            }
                            onClick={() =>
                              openDecisionDialog(
                                'PROCEED',
                              )
                            }
                          >
                            Proceed
                          </Button>)}


                          <Button
                            variant="outlined"
                            color="error"
                            startIcon={
                              <DoNotDisturbAltRounded />
                            }
                            onClick={() =>
                              openDecisionDialog(
                                'DO_NOT_PROCEED',
                              )
                            }
                          >
                            Do Not Proceed
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Alert
                        severity="warning"
                        variant="outlined"
                      >
                        This Lead is not ready for a final decision. Finance must complete first; a suitable result also requires a completed Technical Assessment.
                      </Alert>
                    )}
                  </Box>
                </Card>
              </>
            )}
          </Box>
        )}


        <Dialog
          open={
            decisionDialogOpen
          }
          onClose={
            closeDecisionDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {decisionAction ===
            'PROCEED'
              ? 'Proceed'
              : 'Do Not Proceed'}
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={
                2
              }
              sx={{
                mt:
                  1,
              }}
            >
              {decisionError && (
                <Alert
                  severity="error"
                >
                  {decisionError}
                </Alert>
              )}


              <Alert
                severity={
                  decisionAction ===
                    'PROCEED'
                    ? 'success'
                    : 'warning'
                }
                variant="outlined"
              >
                {decisionAction ===
                'PROCEED'
                  ? 'Proceed confirms that the available specialist evidence supports Deal creation.'
                  : 'Do Not Proceed records that this opportunity will not continue to Deal conversion.'}
              </Alert>


              {selectedItem && (
                <Card
                  variant="outlined"
                  sx={{
                    p:
                      2,

                    borderRadius:
                      '10px',

                    bgcolor:
                      'var(--eleven-surface-soft)',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        'var(--eleven-text)',

                      fontSize:
                        14,

                      fontWeight:
                        700,
                    }}
                  >
                    {selectedItem.lead.contact_name}
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.25,

                      color:
                        'var(--eleven-text-secondary)',

                      fontSize:
                        12.5,
                    }}
                  >
                    {selectedItem.lead.company_name}
                  </Typography>
                </Card>
              )}


              <TextField
                required={decisionAction === 'DO_NOT_PROCEED'}
                multiline
                minRows={
                  5
                }
                label={
                  decisionAction ===
                    'PROCEED'
                    ? 'Decision notes (optional)'
                    : 'Do Not Proceed reason'
                }
                placeholder={
                  decisionAction ===
                    'PROCEED'
                    ? 'Optionally record why the opportunity should proceed...'
                    : 'Record why the opportunity should not proceed...'
                }
                value={
                  decisionNotes
                }
                onChange={(
                  event,
                ) =>
                  setDecisionNotes(
                    event.target.value,
                  )
                }
              />
            </Stack>
          </DialogContent>


          <DialogActions
            sx={{
              px:
                3,

              pb:
                3,
            }}
          >
            <Button
              onClick={
                closeDecisionDialog
              }
              disabled={
                isSavingDecision
              }
            >
              Cancel
            </Button>


            <Button
              variant="contained"
              color={
                decisionAction ===
                  'PROCEED'
                  ? 'success'
                  : 'error'
              }
              disabled={
                isSavingDecision ||
                (
                  decisionAction === 'DO_NOT_PROCEED' &&
                  !decisionNotes.trim()
                )
              }
              onClick={() =>
                void handleDecision()
              }
            >
              {isSavingDecision ? (
                <CircularProgress
                  size={
                    22
                  }
                  color="inherit"
                />
              ) : decisionAction ===
                'PROCEED' ? (
                'Confirm Proceed'
              ) : (
                'Confirm Do Not Proceed'
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  )
}


export default OpportunityReviewPage
