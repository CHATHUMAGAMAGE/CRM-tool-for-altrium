import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material'

import {
  ArrowBackRounded,
  AssignmentTurnedInOutlined,
  DeleteOutlineRounded,
  DescriptionOutlined,
  EngineeringOutlined,
  HistoryRounded,
  PlayArrowRounded,
  RefreshRounded,
  SaveOutlined,
  UploadFileOutlined,
} from '@mui/icons-material'

import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  getCurrentUser,
} from '../services/auth'

import {
  createTechnicalAssessmentRecommendation,
  deleteTechnicalAssessmentRecommendation,
  getSoftwareEngineers,
  getTechnicalAssessment,
  getTechnicalAssessmentDocuments,
  getTechnicalAssessmentHistory,
  getTechnicalAssessmentRecommendations,
  openTechnicalAssessmentDocument,
  startTechnicalAssessment,
  submitTechnicalAssessment,
  updateTechnicalAssessmentWork,
  uploadTechnicalAssessmentDocument,
  type SoftwareEngineer,
  type TechnicalAssessment,
  type TechnicalAssessmentAvailability,
  type TechnicalAssessmentDocument,
  type TechnicalAssessmentHistory,
  type TechnicalAssessmentRecommendation,
  type TechnicalAssessmentStatus,
} from '../services/crm'


function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return date.toLocaleString()
}


function statusColor(
  status: TechnicalAssessmentStatus,
):
  | 'default'
  | 'warning'
  | 'info'
  | 'success' {
  switch (status) {
    case 'REQUESTED':
      return 'warning'

    case 'IN_PROGRESS':
      return 'info'

    case 'SUBMITTED':
      return 'success'

    case 'REVIEWED':
      return 'default'

    default:
      return 'default'
  }
}


function availabilityColor(
  value:
    TechnicalAssessmentAvailability,
):
  | 'success'
  | 'warning'
  | 'error' {
  if (
    value === 'AVAILABLE'
  ) {
    return 'success'
  }

  if (
    value === 'LIMITED'
  ) {
    return 'warning'
  }

  return 'error'
}


function LabelValue({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--eleven-text-secondary)',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt: 0.35,
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--eleven-text)',
        }}
      >
        {value || '—'}
      </Typography>
    </Box>
  )
}


function TechnicalAssessmentWorkspacePage() {
  const navigate =
    useNavigate()

  const {
    assessmentId,
  } = useParams()

  const id =
    Number(assessmentId)


  const [
    assessment,
    setAssessment,
  ] = useState<
    TechnicalAssessment | null
  >(null)

  const [
    recommendations,
    setRecommendations,
  ] = useState<
    TechnicalAssessmentRecommendation[]
  >([])

  const [
    documents,
    setDocuments,
  ] = useState<
    TechnicalAssessmentDocument[]
  >([])

  const [
    history,
    setHistory,
  ] = useState<
    TechnicalAssessmentHistory[]
  >([])

  const [
    engineers,
    setEngineers,
  ] = useState<
    SoftwareEngineer[]
  >([])


  const [
    technicalComments,
    setTechnicalComments,
  ] = useState('')


  const [
    selectedEngineerId,
    setSelectedEngineerId,
  ] = useState('')

  const [
    availability,
    setAvailability,
  ] = useState<
    TechnicalAssessmentAvailability
  >('AVAILABLE')

  const [
    recommendationNotes,
    setRecommendationNotes,
  ] = useState('')


  const [
    documentTitle,
    setDocumentTitle,
  ] = useState('')

  const [
    documentDescription,
    setDocumentDescription,
  ] = useState('')

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(
    null,
  )


  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isStarting,
    setIsStarting,
  ] = useState(false)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false)

  const [
    isAddingRecommendation,
    setIsAddingRecommendation,
  ] = useState(false)

  const [
    isUploading,
    setIsUploading,
  ] = useState(false)


  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  )

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null,
  )


  const loadWorkspace =
    useCallback(async () => {
      if (
        !Number.isInteger(id) ||
        id <= 0
      ) {
        setError(
          'Invalid technical assessment.',
        )
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const user =
          await getCurrentUser()

        if (
          user.role !==
          'TECH_LEAD'
        ) {
          navigate(
            '/dashboard',
            {
              replace: true,
            },
          )
          return
        }

        const assessmentData =
          await getTechnicalAssessment(
            id,
          )

        if (
          assessmentData.assigned_to !==
          user.id
        ) {
          setAssessment(null)

          setError(
            'This technical assessment is not assigned to you.',
          )

          return
        }

        const [
          recommendationData,
          documentData,
          historyData,
          engineerData,
        ] =
          await Promise.all([
            getTechnicalAssessmentRecommendations(
              id,
            ),
            getTechnicalAssessmentDocuments(
              id,
            ),
            getTechnicalAssessmentHistory(
              id,
            ),
            getSoftwareEngineers(),
          ])

        setAssessment(
          assessmentData,
        )

        setTechnicalComments(
          assessmentData
            .technical_comments ??
            '',
        )

        setRecommendations(
          recommendationData,
        )

        setDocuments(
          documentData,
        )

        setHistory(
          historyData,
        )

        setEngineers(
          engineerData,
        )
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : 'Unable to load the technical assessment.',
        )
      } finally {
        setIsLoading(false)
      }
    }, [
      id,
      navigate,
    ])


  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])


  const availableEngineers =
    useMemo(() => {
      const usedIds =
        new Set(
          recommendations.map(
            (item) =>
              item.engineer,
          ),
        )

      return engineers.filter(
        (engineer) =>
          !usedIds.has(
            engineer.id,
          ),
      )
    }, [
      engineers,
      recommendations,
    ])


  const canStart =
    assessment?.status ===
    'REQUESTED'

  const canEdit =
    assessment?.status ===
    'IN_PROGRESS'


  const handleStart =
    async () => {
      if (!assessment) {
        return
      }

      setIsStarting(true)
      setError(null)
      setSuccess(null)

      try {
        await startTechnicalAssessment(
          assessment.id,
        )

        setSuccess(
          'Technical assessment started.',
        )

        await loadWorkspace()
      } catch (startError) {
        setError(
          startError instanceof
            Error
            ? startError.message
            : 'Unable to start the assessment.',
        )
      } finally {
        setIsStarting(false)
      }
    }


  const handleSave =
    async () => {
      if (!assessment) {
        return
      }

      if (
        !technicalComments.trim()
      ) {
        setError(
          'Add your technical findings before saving.',
        )
        return
      }

      setIsSaving(true)
      setError(null)
      setSuccess(null)

      try {
        await updateTechnicalAssessmentWork(
          assessment.id,
          {
            technical_comments:
              technicalComments.trim(),
          },
        )

        setSuccess(
          'Technical findings saved.',
        )

        await loadWorkspace()
      } catch (saveError) {
        setError(
          saveError instanceof
            Error
            ? saveError.message
            : 'Unable to save technical findings.',
        )
      } finally {
        setIsSaving(false)
      }
    }


  const handleAddRecommendation =
    async () => {
      if (!assessment) {
        return
      }

      const engineerId =
        Number(
          selectedEngineerId,
        )

      if (
        !Number.isInteger(
          engineerId,
        ) ||
        engineerId <= 0
      ) {
        setError(
          'Select a software engineer.',
        )
        return
      }

      setIsAddingRecommendation(
        true,
      )

      setError(null)
      setSuccess(null)

      try {
        await createTechnicalAssessmentRecommendation(
          assessment.id,
          {
            engineer:
              engineerId,

            availability,

            recommendation_notes:
              recommendationNotes.trim(),
          },
        )

        setSelectedEngineerId('')
        setAvailability(
          'AVAILABLE',
        )
        setRecommendationNotes(
          '',
        )

        setSuccess(
          'Software engineer recommendation added.',
        )

        await loadWorkspace()
      } catch (recommendationError) {
        setError(
          recommendationError instanceof
            Error
            ? recommendationError.message
            : 'Unable to add recommendation.',
        )
      } finally {
        setIsAddingRecommendation(
          false,
        )
      }
    }


  const handleRemoveRecommendation =
    async (
      recommendationId: number,
    ) => {
      if (!assessment) {
        return
      }

      setError(null)
      setSuccess(null)

      try {
        await deleteTechnicalAssessmentRecommendation(
          assessment.id,
          recommendationId,
        )

        setSuccess(
          'Recommendation removed.',
        )

        await loadWorkspace()
      } catch (removeError) {
        setError(
          removeError instanceof
            Error
            ? removeError.message
            : 'Unable to remove recommendation.',
        )
      }
    }


  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    setSelectedFile(
      event.target.files?.[0] ??
        null,
    )
  }


  const handleUpload =
    async () => {
      if (!assessment) {
        return
      }

      if (
        !documentTitle.trim()
      ) {
        setError(
          'Enter a document title.',
        )
        return
      }

      if (!selectedFile) {
        setError(
          'Select a file first.',
        )
        return
      }

      setIsUploading(true)
      setError(null)
      setSuccess(null)

      try {
        await uploadTechnicalAssessmentDocument(
          assessment.id,
          {
            title:
              documentTitle.trim(),

            description:
              documentDescription.trim(),

            file:
              selectedFile,
          },
        )

        setDocumentTitle('')
        setDocumentDescription('')
        setSelectedFile(null)

        setSuccess(
          'Document uploaded successfully.',
        )

        await loadWorkspace()
      } catch (uploadError) {
        setError(
          uploadError instanceof
            Error
            ? uploadError.message
            : 'Unable to upload document.',
        )
      } finally {
        setIsUploading(false)
      }
    }


  const handleSubmit =
    async () => {
      if (!assessment) {
        return
      }

      if (
        !technicalComments.trim()
      ) {
        setError(
          'Technical findings are required before submission.',
        )
        return
      }

      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      try {
        if (
          technicalComments.trim() !==
          (
            assessment
              .technical_comments ??
            ''
          ).trim()
        ) {
          await updateTechnicalAssessmentWork(
            assessment.id,
            {
              technical_comments:
                technicalComments.trim(),
            },
          )
        }

        await submitTechnicalAssessment(
          assessment.id,
        )

        setSuccess(
          'Technical assessment submitted to the Sales Manager.',
        )

        await loadWorkspace()
      } catch (submitError) {
        setError(
          submitError instanceof
            Error
            ? submitError.message
            : 'Unable to submit assessment.',
        )
      } finally {
        setIsSubmitting(false)
      }
    }


  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress
          size={32}
        />
      </Box>
    )
  }


  if (!assessment) {
    return (
      <Box
        sx={{
          px: {
            xs: 2,
            md: 4,
          },
          py: 3,
        }}
      >
        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/technical-assessments',
            )
          }
          sx={{
            mb: 2,
            textTransform: 'none',
          }}
        >
          Back to Assessments
        </Button>

        <Alert severity="error">
          {error ??
            'Technical assessment not found.'}
        </Alert>
      </Box>
    )
  }


  return (
    <Box
      sx={{
        px: {
          xs: 2,
          sm: 3,
          lg: 4,
        },
        py: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          justifyContent:
            'space-between',
          alignItems: {
            xs: 'flex-start',
            md: 'center',
          },
          gap: 2,
        }}
      >
        <Box>
          <Button
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate(
                '/technical-assessments',
              )
            }
            sx={{
              px: 0,
              mb: 0.7,
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Back to Assessments
          </Button>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontSize: {
                  xs: 24,
                  md: 28,
                },
                fontWeight: 700,
                color: 'var(--eleven-text)',
              }}
            >
              {
                assessment
                  .lead_company_name
              }
            </Typography>

            <Chip
              size="small"
              label={
                assessment
                  .status_display
              }
              color={
                statusColor(
                  assessment.status,
                )
              }
              variant="outlined"
              sx={{
                fontWeight: 600,
              }}
            />
          </Box>

          <Typography
            sx={{
              mt: 0.4,
              fontSize: 13,
              color: 'var(--eleven-text-secondary)',
            }}
          >
            Technical Assessment #
            {assessment.id}
          </Typography>
        </Box>


        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Button
            variant="outlined"
            startIcon={
              <RefreshRounded />
            }
            onClick={() =>
              void loadWorkspace()
            }
            sx={{
              minHeight: 40,
              textTransform: 'none',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>

          {canStart && (
            <Button
              variant="contained"
              startIcon={
                <PlayArrowRounded />
              }
              disabled={
                isStarting
              }
              onClick={() =>
                void handleStart()
              }
              sx={{
                minHeight: 40,
                textTransform: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                boxShadow: 'none',
              }}
            >
              {isStarting
                ? 'Starting...'
                : 'Start Assessment'}
            </Button>
          )}
        </Box>
      </Box>


      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mt: 2,
          }}
        >
          {success}
        </Alert>
      )}


      {assessment.status ===
        'REQUESTED' && (
        <Alert
          severity="info"
          sx={{
            mt: 2,
          }}
        >
          Start the assessment before adding findings, recommendations or documents.
        </Alert>
      )}

      {assessment.status ===
        'SUBMITTED' && (
        <Alert
          severity="success"
          sx={{
            mt: 2,
          }}
        >
          This assessment has been submitted to the Sales Manager and is now read-only.
        </Alert>
      )}

      {assessment.status ===
        'REVIEWED' && (
        <Alert
          severity="success"
          sx={{
            mt: 2,
          }}
        >
          This assessment has been reviewed by the Sales Manager.
        </Alert>
      )}


      <Box
        sx={{
          mt: 2.5,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1fr) 340px',
          },
          gap: 2,
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Typography
              sx={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--eleven-text)',
              }}
            >
              Lead Requirements
            </Typography>

            <Divider
              sx={{
                my: 1.8,
              }}
            />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(3, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <LabelValue
                label="CONTACT"
                value={
                  assessment
                    .lead_contact_name
                }
              />

              <LabelValue
                label="LEAD STATUS"
                value={
                  assessment
                    .lead_status_display
                }
              />

              <LabelValue
                label="REQUESTED BY"
                value={
                  assessment
                    .requested_by_name
                }
              />
            </Box>

            <Box
              sx={{
                mt: 2.2,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: 'var(--eleven-text-secondary)',
                }}
              >
                ASSESSMENT REQUIREMENTS
              </Typography>

              <Typography
                sx={{
                  mt: 0.7,
                  whiteSpace:
                    'pre-wrap',
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: 'var(--eleven-text-secondary)',
                }}
              >
                {
                  assessment
                    .requirements
                }
              </Typography>
            </Box>
          </Paper>


          <Paper
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },
                justifyContent:
                  'space-between',
                alignItems: {
                  xs: 'flex-start',
                  sm: 'center',
                },
                gap: 1.5,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--eleven-text)',
                  }}
                >
                  Technical Findings
                </Typography>

                <Typography
                  sx={{
                    mt: 0.3,
                    fontSize: 12.5,
                    color: 'var(--eleven-text-secondary)',
                  }}
                >
                  Record technical feasibility, risks, skills, resources and integration constraints.
                </Typography>
              </Box>

              {canEdit && (
                <Button
                  variant="outlined"
                  startIcon={
                    <SaveOutlined />
                  }
                  disabled={
                    isSaving
                  }
                  onClick={() =>
                    void handleSave()
                  }
                  sx={{
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                  }}
                >
                  {isSaving
                    ? 'Saving...'
                    : 'Save Findings'}
                </Button>
              )}
            </Box>

            <TextField
              fullWidth
              multiline
              minRows={11}
              disabled={!canEdit}
              value={
                technicalComments
              }
              onChange={(event) =>
                setTechnicalComments(
                  event.target.value,
                )
              }
              placeholder={
                'Technical feasibility:\n\n' +
                'Technical risks:\n\n' +
                'Required technical skills:\n\n' +
                'Resource requirements:\n\n' +
                'Integration constraints:\n\n' +
                'Overall recommendation:'
              }
              sx={{
                mt: 2,
              }}
            />
          </Paper>


          <Paper
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <EngineeringOutlined
                sx={{
                  color: 'var(--eleven-primary)',
                }}
              />

              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--eleven-text)',
                }}
              >
                Recommended Team Members
              </Typography>
            </Box>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 12.5,
                color: 'var(--eleven-text-secondary)',
              }}
            >
              Check engineer availability and recommend suitable software engineers.
            </Typography>


            {canEdit && (
              <Box
                sx={{
                  mt: 2,
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '220px 170px minmax(200px, 1fr) auto',
                  },
                  gap: 1.2,
                  alignItems: 'start',
                }}
              >
                <FormControl
                  size="small"
                  fullWidth
                >
                  <InputLabel>
                    Software Engineer
                  </InputLabel>

                  <Select
                    value={
                      selectedEngineerId
                    }
                    label=
                      "Software Engineer"
                    onChange={(event) =>
                      setSelectedEngineerId(
                        String(
                          event.target
                            .value,
                        ),
                      )
                    }
                  >
                    {availableEngineers.map(
                      (engineer) => (
                        <MenuItem
                          key={
                            engineer.id
                          }
                          value={
                            String(
                              engineer.id,
                            )
                          }
                        >
                          {engineer.full_name ||
                            engineer.username}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>


                <FormControl
                  size="small"
                  fullWidth
                >
                  <InputLabel>
                    Availability
                  </InputLabel>

                  <Select
                    value={
                      availability
                    }
                    label=
                      "Availability"
                    onChange={(event) =>
                      setAvailability(
                        event.target
                          .value as TechnicalAssessmentAvailability,
                      )
                    }
                  >
                    <MenuItem value="AVAILABLE">
                      Available
                    </MenuItem>

                    <MenuItem value="LIMITED">
                      Limited
                    </MenuItem>

                    <MenuItem value="UNAVAILABLE">
                      Unavailable
                    </MenuItem>
                  </Select>
                </FormControl>


                <TextField
                  size="small"
                  placeholder=
                    "Recommendation notes"
                  value={
                    recommendationNotes
                  }
                  onChange={(event) =>
                    setRecommendationNotes(
                      event.target.value,
                    )
                  }
                />


                <Button
                  variant="contained"
                  disabled={
                    isAddingRecommendation ||
                    !selectedEngineerId
                  }
                  onClick={() =>
                    void handleAddRecommendation()
                  }
                  sx={{
                    minHeight: 40,
                    textTransform: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                  }}
                >
                  {isAddingRecommendation
                    ? 'Adding...'
                    : 'Add'}
                </Button>
              </Box>
            )}


            {canEdit &&
              engineers.length ===
                0 && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 2,
                  }}
                >
                  No Software Engineer accounts are currently available.
                </Alert>
              )}


            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {recommendations.length ===
              0 ? (
                <Typography
                  sx={{
                    py: 2,
                    fontSize: 13,
                    color: 'var(--eleven-text-secondary)',
                  }}
                >
                  No team members have been recommended yet.
                </Typography>
              ) : (
                recommendations.map(
                  (item) => (
                    <Paper
                      key={
                        item.id
                      }
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        borderColor:
                          'var(--eleven-border)',
                        boxShadow: 'none',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: {
                            xs: 'column',
                            sm: 'row',
                          },
                          justifyContent:
                            'space-between',
                          alignItems: {
                            xs: 'flex-start',
                            sm: 'center',
                          },
                          gap: 1.5,
                        }}
                      >
                        <Box>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: 1,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: 'var(--eleven-text)',
                              }}
                            >
                              {
                                item
                                  .engineer_name
                              }
                            </Typography>

                            <Chip
                              size="small"
                              label={
                                item
                                  .availability_display
                              }
                              color={
                                availabilityColor(
                                  item.availability,
                                )
                              }
                              variant="outlined"
                            />
                          </Box>

                          {item
                            .recommendation_notes && (
                            <Typography
                              sx={{
                                mt: 0.5,
                                fontSize: 12.5,
                                color: 'var(--eleven-text-secondary)',
                              }}
                            >
                              {
                                item
                                  .recommendation_notes
                              }
                            </Typography>
                          )}
                        </Box>

                        {canEdit && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={
                              <DeleteOutlineRounded />
                            }
                            onClick={() =>
                              void handleRemoveRecommendation(
                                item.id,
                              )
                            }
                            sx={{
                              textTransform: 'none',
                            }}
                          >
                            Remove
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  ),
                )
              )}
            </Box>
          </Paper>


          <Paper
            variant="outlined"
            sx={{
              p: 2.2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <DescriptionOutlined
                sx={{
                  color: 'var(--eleven-primary)',
                }}
              />

              <Typography
                sx={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--eleven-text)',
                }}
              >
                Assessment Documents
              </Typography>
            </Box>


            {canEdit && (
              <Box
                sx={{
                  mt: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.2,
                }}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: '1fr 1.5fr',
                    },
                    gap: 1.2,
                  }}
                >
                  <TextField
                    size="small"
                    label="Document title"
                    value={
                      documentTitle
                    }
                    onChange={(event) =>
                      setDocumentTitle(
                        event.target.value,
                      )
                    }
                  />

                  <TextField
                    size="small"
                    label="Description"
                    value={
                      documentDescription
                    }
                    onChange={(event) =>
                      setDocumentDescription(
                        event.target.value,
                      )
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: {
                      xs: 'column',
                      sm: 'row',
                    },
                    alignItems: {
                      xs: 'stretch',
                      sm: 'center',
                    },
                    gap: 1.2,
                  }}
                >
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={
                      <UploadFileOutlined />
                    }
                    sx={{
                      textTransform: 'none',
                      borderRadius: '8px',
                    }}
                  >
                    Choose File

                    <input
                      hidden
                      type="file"
                      onChange={
                        handleFileChange
                      }
                    />
                  </Button>

                  <Typography
                    sx={{
                      flexGrow: 1,
                      fontSize: 12.5,
                      color: 'var(--eleven-text-secondary)',
                    }}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : 'No file selected'}
                  </Typography>

                  <Button
                    variant="contained"
                    disabled={
                      isUploading ||
                      !selectedFile
                    }
                    onClick={() =>
                      void handleUpload()
                    }
                    sx={{
                      textTransform: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      boxShadow: 'none',
                    }}
                  >
                    {isUploading
                      ? 'Uploading...'
                      : 'Upload'}
                  </Button>
                </Box>
              </Box>
            )}


            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {documents.length ===
              0 ? (
                <Typography
                  sx={{
                    py: 2,
                    fontSize: 13,
                    color: 'var(--eleven-text-secondary)',
                  }}
                >
                  No technical documents have been uploaded.
                </Typography>
              ) : (
                documents.map(
                  (document) => (
                    <Paper
                      key={
                        document.id
                      }
                      variant="outlined"
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        borderColor:
                          'var(--eleven-border)',
                        boxShadow: 'none',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: {
                            xs: 'column',
                            sm: 'row',
                          },
                          justifyContent:
                            'space-between',
                          alignItems: {
                            xs: 'flex-start',
                            sm: 'center',
                          },
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography
                            sx={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              color: 'var(--eleven-text)',
                            }}
                          >
                            {
                              document.title
                            }
                          </Typography>

                          {document.description && (
                            <Typography
                              sx={{
                                mt: 0.3,
                                fontSize: 12.5,
                                color: 'var(--eleven-text-secondary)',
                              }}
                            >
                              {
                                document.description
                              }
                            </Typography>
                          )}

                          <Typography
                            sx={{
                              mt: 0.4,
                              fontSize: 11.5,
                              color: 'var(--eleven-text-muted)',
                            }}
                          >
                            Uploaded by{' '}
                            {
                              document
                                .uploaded_by_name
                            }{' '}
                            ·{' '}
                            {
                              formatDate(
                                document.uploaded_at,
                              )
                            }
                          </Typography>
                        </Box>

                        <Button
                          size="small"
                          onClick={() => {
                            void openTechnicalAssessmentDocument(
                              assessment.id,
                              document.id,
                            ).catch((openError) => {
                              setError(
                                openError instanceof Error
                                  ? openError.message
                                  : 'Unable to open the document.',
                              )
                            })
                          }}
                          sx={{
                            textTransform: 'none',
                          }}
                        >
                          Open
                        </Button>
                      </Box>
                    </Paper>
                  ),
                )
              )}
            </Box>
          </Paper>


          {canEdit && (
            <Paper
              variant="outlined"
              sx={{
                p: 2.2,
                borderRadius: '10px',
                borderColor: 'var(--eleven-primary-border)',
                backgroundColor: 'var(--eleven-primary-soft)',
                boxShadow: 'none',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    md: 'row',
                  },
                  justifyContent:
                    'space-between',
                  alignItems: {
                    xs: 'stretch',
                    md: 'center',
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--eleven-text)',
                    }}
                  >
                    Submit Technical Assessment
                  </Typography>

                  <Typography
                    sx={{
                      mt: 0.35,
                      fontSize: 12.5,
                      color: 'var(--eleven-text-secondary)',
                    }}
                  >
                    Submission returns the assessment to the Sales Manager for review.
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  startIcon={
                    <AssignmentTurnedInOutlined />
                  }
                  disabled={
                    isSubmitting ||
                    !technicalComments.trim()
                  }
                  onClick={() =>
                    void handleSubmit()
                  }
                  sx={{
                    minHeight: 42,
                    px: 2.2,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    boxShadow: 'none',
                  }}
                >
                  {isSubmitting
                    ? 'Submitting...'
                    : 'Submit Assessment'}
                </Button>
              </Box>
            </Paper>
          )}
        </Box>


        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 700,
                color: 'var(--eleven-text)',
              }}
            >
              Assessment Details
            </Typography>

            <Divider
              sx={{
                my: 1.6,
              }}
            />

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <LabelValue
                label="ASSIGNED TECH LEAD"
                value={
                  assessment
                    .assigned_to_name
                }
              />

              <LabelValue
                label="REQUESTED"
                value={
                  formatDate(
                    assessment.created_at,
                  )
                }
              />

              <LabelValue
                label="SUBMITTED"
                value={
                  formatDate(
                    assessment.submitted_at,
                  )
                }
              />

              <LabelValue
                label="REVIEWED"
                value={
                  formatDate(
                    assessment.reviewed_at,
                  )
                }
              />
            </Box>
          </Paper>


          {assessment.status ===
            'REVIEWED' && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: '10px',
                borderColor: 'var(--eleven-border)',
                boxShadow: 'none',
              }}
            >
              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--eleven-text)',
                }}
              >
                Manager Review
              </Typography>

              <Divider
                sx={{
                  my: 1.5,
                }}
              />

              <LabelValue
                label="REVIEWED BY"
                value={
                  assessment
                    .reviewed_by_name ??
                  'Sales Manager'
                }
              />

              <Typography
                sx={{
                  mt: 1.5,
                  whiteSpace:
                    'pre-wrap',
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: 'var(--eleven-text-secondary)',
                }}
              >
                {
                  assessment
                    .review_notes ||
                  'No review notes provided.'
                }
              </Typography>
            </Paper>
          )}


          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: '10px',
              borderColor: 'var(--eleven-border)',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <HistoryRounded
                sx={{
                  color: 'var(--eleven-primary)',
                  fontSize: 20,
                }}
              />

              <Typography
                sx={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--eleven-text)',
                }}
              >
                Assessment History
              </Typography>
            </Box>

            <Divider
              sx={{
                my: 1.5,
              }}
            />

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {history.length ===
              0 ? (
                <Typography
                  sx={{
                    fontSize: 13,
                    color: 'var(--eleven-text-secondary)',
                  }}
                >
                  No history recorded.
                </Typography>
              ) : (
                history.map(
                  (item) => (
                    <Box
                      key={
                        item.id
                      }
                      sx={{
                        pl: 1.4,
                        borderLeft:
                          '2px solid var(--eleven-primary-border)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: 'var(--eleven-text-secondary)',
                        }}
                      >
                        {
                          item
                            .event_type_display
                        }
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.3,
                          fontSize: 12,
                          lineHeight: 1.5,
                          color: 'var(--eleven-text-secondary)',
                        }}
                      >
                        {
                          item.description
                        }
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.35,
                          fontSize: 11,
                          color: 'var(--eleven-text-muted)',
                        }}
                      >
                        {
                          formatDate(
                            item.created_at,
                          )
                        }
                      </Typography>
                    </Box>
                  ),
                )
              )}
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}


export default TechnicalAssessmentWorkspacePage
