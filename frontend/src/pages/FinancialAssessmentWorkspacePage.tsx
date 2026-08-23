import {
  useCallback,
  useEffect,
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
  Paper,
  TextField,
  Typography,
} from '@mui/material'

import {
  ArrowBackRounded,
  AssignmentTurnedInOutlined,
  DescriptionOutlined,
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
  getFinancialAssessment,
  getFinancialAssessmentDocuments,
  getFinancialAssessmentHistory,
  startFinancialAssessment,
  submitFinancialAssessment,
  updateFinancialAssessmentWork,
  uploadFinancialAssessmentDocument,
  type FinancialAssessment,
  type FinancialAssessmentDocument,
  type FinancialAssessmentHistory,
  type FinancialAssessmentStatus,
} from '../services/financialCrm'


const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL


function formatDate(
  value: string | null,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      value,
    )

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
  status:
    FinancialAssessmentStatus,
):
  | 'default'
  | 'warning'
  | 'info'
  | 'success' {
  switch (
    status
  ) {
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


function resolveFileUrl(
  path: string,
) {
  if (
    path.startsWith(
      'http://',
    ) ||
    path.startsWith(
      'https://',
    )
  ) {
    return path
  }

  return `${
    API_BASE_URL ?? ''
  }${
    path.startsWith(
      '/',
    )
      ? path
      : `/${path}`
  }`
}


function LabelValue({
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
          fontSize:
            11.5,

          fontWeight:
            600,

          color:
            '#667085',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt:
            0.35,

          fontSize:
            13.5,

          fontWeight:
            600,

          color:
            '#172033',
        }}
      >
        {value ||
          '—'}
      </Typography>
    </Box>
  )
}


function FinancialAssessmentWorkspacePage() {
  const navigate =
    useNavigate()

  const {
    assessmentId,
  } =
    useParams()

  const id =
    Number(
      assessmentId,
    )


  const [
    assessment,
    setAssessment,
  ] =
    useState<
      FinancialAssessment | null
    >(
      null,
    )

  const [
    documents,
    setDocuments,
  ] =
    useState<
      FinancialAssessmentDocument[]
    >([])

  const [
    history,
    setHistory,
  ] =
    useState<
      FinancialAssessmentHistory[]
    >([])


  const [
    financialComments,
    setFinancialComments,
  ] =
    useState(
      '',
    )


  const [
    documentTitle,
    setDocumentTitle,
  ] =
    useState(
      '',
    )

  const [
    documentDescription,
    setDocumentDescription,
  ] =
    useState(
      '',
    )

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<
      File | null
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
    isStarting,
    setIsStarting,
  ] =
    useState(
      false,
    )

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(
      false,
    )

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(
      false,
    )

  const [
    isUploading,
    setIsUploading,
  ] =
    useState(
      false,
    )


  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null,
    )

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null,
    )


  const loadWorkspace =
    useCallback(
      async () => {
        if (
          !Number.isInteger(
            id,
          ) ||
          id <= 0
        ) {
          setError(
            'Invalid financial assessment.',
          )

          setIsLoading(
            false,
          )

          return
        }

        setIsLoading(
          true,
        )

        setError(
          null,
        )

        try {
          const user =
            await getCurrentUser()

          if (
            user.role !==
            'FINANCIAL_OFFICER'
          ) {
            navigate(
              '/dashboard',
              {
                replace:
                  true,
              },
            )

            return
          }

          const assessmentData =
            await getFinancialAssessment(
              id,
            )

          if (
            assessmentData.assigned_to !==
            user.id
          ) {
            setAssessment(
              null,
            )

            setError(
              'This financial assessment is not assigned to you.',
            )

            return
          }

          const [
            documentData,
            historyData,
          ] =
            await Promise.all([
              getFinancialAssessmentDocuments(
                id,
              ),

              getFinancialAssessmentHistory(
                id,
              ),
            ])

          setAssessment(
            assessmentData,
          )

          setFinancialComments(
            assessmentData
              .financial_comments ??
              '',
          )

          setDocuments(
            documentData,
          )

          setHistory(
            historyData,
          )
        } catch (
          loadError
        ) {
          setError(
            loadError
              instanceof Error
              ? loadError.message
              : 'Unable to load the financial assessment.',
          )
        } finally {
          setIsLoading(
            false,
          )
        }
      },
      [
        id,
        navigate,
      ],
    )


  useEffect(
    () => {
      void loadWorkspace()
    },
    [
      loadWorkspace,
    ],
  )


  const canStart =
    assessment?.status ===
    'REQUESTED'


  const canEdit =
    assessment?.status ===
    'IN_PROGRESS'


  const handleStart =
    async () => {
      if (
        !assessment
      ) {
        return
      }

      setIsStarting(
        true,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      try {
        await startFinancialAssessment(
          assessment.id,
        )

        setSuccess(
          'Financial assessment started.',
        )

        await loadWorkspace()
      } catch (
        startError
      ) {
        setError(
          startError
            instanceof Error
            ? startError.message
            : 'Unable to start the assessment.',
        )
      } finally {
        setIsStarting(
          false,
        )
      }
    }


  const handleSave =
    async () => {
      if (
        !assessment
      ) {
        return
      }

      if (
        !financialComments
          .trim()
      ) {
        setError(
          'Add your financial findings before saving.',
        )

        return
      }

      setIsSaving(
        true,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      try {
        await updateFinancialAssessmentWork(
          assessment.id,
          {
            financial_comments:
              financialComments
                .trim(),
          },
        )

        setSuccess(
          'Financial findings saved.',
        )

        await loadWorkspace()
      } catch (
        saveError
      ) {
        setError(
          saveError
            instanceof Error
            ? saveError.message
            : 'Unable to save financial findings.',
        )
      } finally {
        setIsSaving(
          false,
        )
      }
    }


  const handleFileChange =
    (
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
      if (
        !assessment
      ) {
        return
      }

      if (
        !documentTitle
          .trim()
      ) {
        setError(
          'Enter a document title.',
        )

        return
      }

      if (
        !selectedFile
      ) {
        setError(
          'Select a file first.',
        )

        return
      }

      setIsUploading(
        true,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      try {
        await uploadFinancialAssessmentDocument(
          assessment.id,
          {
            title:
              documentTitle
                .trim(),

            description:
              documentDescription
                .trim(),

            file:
              selectedFile,
          },
        )

        setDocumentTitle(
          '',
        )

        setDocumentDescription(
          '',
        )

        setSelectedFile(
          null,
        )

        setSuccess(
          'Document uploaded successfully.',
        )

        await loadWorkspace()
      } catch (
        uploadError
      ) {
        setError(
          uploadError
            instanceof Error
            ? uploadError.message
            : 'Unable to upload document.',
        )
      } finally {
        setIsUploading(
          false,
        )
      }
    }


  const handleSubmit =
    async () => {
      if (
        !assessment
      ) {
        return
      }

      if (
        !financialComments
          .trim()
      ) {
        setError(
          'Financial findings are required before submission.',
        )

        return
      }

      setIsSubmitting(
        true,
      )

      setError(
        null,
      )

      setSuccess(
        null,
      )

      try {
        if (
          financialComments.trim() !==
          (
            assessment
              .financial_comments ??
            ''
          ).trim()
        ) {
          await updateFinancialAssessmentWork(
            assessment.id,
            {
              financial_comments:
                financialComments
                  .trim(),
            },
          )
        }

        await submitFinancialAssessment(
          assessment.id,
        )

        setSuccess(
          'Financial assessment submitted to the Sales Manager.',
        )

        await loadWorkspace()
      } catch (
        submitError
      ) {
        setError(
          submitError
            instanceof Error
            ? submitError.message
            : 'Unable to submit the assessment.',
        )
      } finally {
        setIsSubmitting(
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
            500,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <CircularProgress
          size={
            32
          }
        />
      </Box>
    )
  }


  if (
    !assessment
  ) {
    return (
      <Box
        sx={{
          px: {
            xs:
              2,

            md:
              4,
          },

          py:
            3,
        }}
      >
        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/financial-assessments',
            )
          }
          sx={{
            mb:
              2,

            textTransform:
              'none',
          }}
        >
          Back to Assessments
        </Button>

        <Alert
          severity="error"
        >
          {error ??
            'Financial assessment not found.'}
        </Alert>
      </Box>
    )
  }


  return (
    <Box
      sx={{
        px: {
          xs:
            2,

          sm:
            3,

          lg:
            4,
        },

        py:
          3,
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          flexDirection: {
            xs:
              'column',

            md:
              'row',
          },

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
          <Button
            startIcon={
              <ArrowBackRounded />
            }
            onClick={() =>
              navigate(
                '/financial-assessments',
              )
            }
            sx={{
              px:
                0,

              mb:
                0.7,

              textTransform:
                'none',

              fontSize:
                13,

              fontWeight:
                600,
            }}
          >
            Back to Assessments
          </Button>

          <Box
            sx={{
              display:
                'flex',

              alignItems:
                'center',

              flexWrap:
                'wrap',

              gap:
                1,
            }}
          >
            <Typography
              component="h1"
              sx={{
                fontSize: {
                  xs:
                    24,

                  md:
                    28,
                },

                fontWeight:
                  700,

                color:
                  '#172033',
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
                fontWeight:
                  600,
              }}
            />
          </Box>

          <Typography
            sx={{
              mt:
                0.4,

              fontSize:
                13,

              color:
                '#667085',
            }}
          >
            Financial Assessment #
            {assessment.id}
          </Typography>
        </Box>


        <Box
          sx={{
            display:
              'flex',

            gap:
              1,

            flexWrap:
              'wrap',
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
              minHeight:
                40,

              textTransform:
                'none',

              borderRadius:
                '8px',

              fontWeight:
                600,
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
                minHeight:
                  40,

                textTransform:
                  'none',

                borderRadius:
                  '8px',

                fontWeight:
                  600,

                boxShadow:
                  'none',
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
            mt:
              2,
          }}
        >
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{
            mt:
              2,
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
            mt:
              2,
          }}
        >
          Start the assessment before adding financial findings or documents.
        </Alert>
      )}

      {assessment.status ===
        'SUBMITTED' && (
        <Alert
          severity="success"
          sx={{
            mt:
              2,
          }}
        >
          This financial assessment has been submitted to the Sales Manager and is now read-only.
        </Alert>
      )}

      {assessment.status ===
        'REVIEWED' && (
        <Alert
          severity="success"
          sx={{
            mt:
              2,
          }}
        >
          This financial assessment has been reviewed by the Sales Manager.
        </Alert>
      )}


      <Box
        sx={{
          mt:
            2.5,

          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            lg:
              'minmax(0, 1fr) 340px',
          },

          gap:
            2,

          alignItems:
            'start',
        }}
      >
        <Box
          sx={{
            minWidth:
              0,

            display:
              'flex',

            flexDirection:
              'column',

            gap:
              2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p:
                2.2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Typography
              sx={{
                fontSize:
                  16,

                fontWeight:
                  700,

                color:
                  '#172033',
              }}
            >
              Lead Requirements
            </Typography>

            <Divider
              sx={{
                my:
                  1.8,
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
                    'repeat(3, minmax(0, 1fr))',
                },

                gap:
                  2,
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
                mt:
                  2.2,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    11.5,

                  fontWeight:
                    600,

                  color:
                    '#667085',
                }}
              >
                FINANCIAL ASSESSMENT REQUIREMENTS
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.7,

                  whiteSpace:
                    'pre-wrap',

                  fontSize:
                    13.5,

                  lineHeight:
                    1.65,

                  color:
                    '#344054',
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
              p:
                2.2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Typography
              sx={{
                fontSize:
                  16,

                fontWeight:
                  700,

                color:
                  '#172033',
              }}
            >
              Technical Assessment Context
            </Typography>

            <Typography
              sx={{
                mt:
                  0.35,

                fontSize:
                  12.5,

                color:
                  '#667085',
              }}
            >
              Review the completed technical assessment before preparing the financial assessment.
            </Typography>

            <Divider
              sx={{
                my:
                  1.8,
              }}
            />

            <LabelValue
              label="TECHNICAL ASSESSMENT STATUS"
              value={
                assessment
                  .technical_assessment_status_display
              }
            />

            <Box
              sx={{
                mt:
                  2,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    11.5,

                  fontWeight:
                    600,

                  color:
                    '#667085',
                }}
              >
                TECHNICAL FINDINGS
              </Typography>

              <Box
                sx={{
                  mt:
                    0.7,

                  p:
                    1.5,

                  border:
                    '1px solid #e4e9f1',

                  borderRadius:
                    '8px',

                  backgroundColor:
                    '#fafbfc',
                }}
              >
                <Typography
                  sx={{
                    whiteSpace:
                      'pre-wrap',

                    fontSize:
                      13,

                    lineHeight:
                      1.6,

                    color:
                      '#344054',
                  }}
                >
                  {
                    assessment
                      .technical_comments ||
                    'No technical findings were recorded.'
                  }
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                mt:
                  2,
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    11.5,

                  fontWeight:
                    600,

                  color:
                    '#667085',
                }}
              >
                SALES MANAGER TECHNICAL REVIEW
              </Typography>

              <Box
                sx={{
                  mt:
                    0.7,

                  p:
                    1.5,

                  border:
                    '1px solid #e4e9f1',

                  borderRadius:
                    '8px',

                  backgroundColor:
                    '#fafbfc',
                }}
              >
                <Typography
                  sx={{
                    whiteSpace:
                      'pre-wrap',

                    fontSize:
                      13,

                    lineHeight:
                      1.6,

                    color:
                      '#344054',
                  }}
                >
                  {
                    assessment
                      .technical_review_notes ||
                    'No technical review notes were provided.'
                  }
                </Typography>
              </Box>
            </Box>
          </Paper>


          <Paper
            variant="outlined"
            sx={{
              p:
                2.2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                flexDirection: {
                  xs:
                    'column',

                  sm:
                    'row',
                },

                justifyContent:
                  'space-between',

                alignItems: {
                  xs:
                    'flex-start',

                  sm:
                    'center',
                },

                gap:
                  1.5,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontSize:
                      16,

                    fontWeight:
                      700,

                    color:
                      '#172033',
                  }}
                >
                  Financial Findings
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.3,

                    fontSize:
                      12.5,

                    color:
                      '#667085',
                  }}
                >
                  Record cost, budget, risk and overall financial viability.
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
                    textTransform:
                      'none',

                    borderRadius:
                      '8px',

                    fontWeight:
                      600,
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
              minRows={
                12
              }
              disabled={
                !canEdit
              }
              value={
                financialComments
              }
              onChange={(
                event,
              ) =>
                setFinancialComments(
                  event.target.value,
                )
              }
              placeholder={
                'Budget and cost estimate:\n\n' +
                'Pricing assumptions:\n\n' +
                'Financial risks:\n\n' +
                'Profitability / margin considerations:\n\n' +
                'Payment and cash-flow considerations:\n\n' +
                'Financial viability:\n\n' +
                'Overall recommendation:'
              }
              sx={{
                mt:
                  2,
              }}
            />
          </Paper>


          <Paper
            variant="outlined"
            sx={{
              p:
                2.2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1,
              }}
            >
              <DescriptionOutlined
                sx={{
                  color:
                    '#0b5cff',
                }}
              />

              <Typography
                sx={{
                  fontSize:
                    16,

                  fontWeight:
                    700,

                  color:
                    '#172033',
                }}
              >
                Financial Documents
              </Typography>
            </Box>

            <Typography
              sx={{
                mt:
                  0.4,

                color:
                  '#667085',

                fontSize:
                  12.5,
              }}
            >
              Attach estimates, costing sheets or other supporting financial documents.
            </Typography>


            {canEdit && (
              <Box
                sx={{
                  mt:
                    2,

                  display:
                    'flex',

                  flexDirection:
                    'column',

                  gap:
                    1.2,
                }}
              >
                <Box
                  sx={{
                    display:
                      'grid',

                    gridTemplateColumns: {
                      xs:
                        '1fr',

                      md:
                        '1fr 1.5fr',
                    },

                    gap:
                      1.2,
                  }}
                >
                  <TextField
                    size="small"
                    label="Document title"
                    value={
                      documentTitle
                    }
                    onChange={(
                      event,
                    ) =>
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
                    onChange={(
                      event,
                    ) =>
                      setDocumentDescription(
                        event.target.value,
                      )
                    }
                  />
                </Box>

                <Box
                  sx={{
                    display:
                      'flex',

                    flexDirection: {
                      xs:
                        'column',

                      sm:
                        'row',
                    },

                    alignItems: {
                      xs:
                        'stretch',

                      sm:
                        'center',
                    },

                    gap:
                      1.2,
                  }}
                >
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={
                      <UploadFileOutlined />
                    }
                    sx={{
                      textTransform:
                        'none',

                      borderRadius:
                        '8px',
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
                      flexGrow:
                        1,

                      fontSize:
                        12.5,

                      color:
                        '#667085',
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
                      textTransform:
                        'none',

                      borderRadius:
                        '8px',

                      fontWeight:
                        600,

                      boxShadow:
                        'none',
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
                mt:
                  2,

                display:
                  'flex',

                flexDirection:
                  'column',

                gap:
                  1,
              }}
            >
              {documents.length ===
              0 ? (
                <Typography
                  sx={{
                    py:
                      2,

                    fontSize:
                      13,

                    color:
                      '#667085',
                  }}
                >
                  No financial documents have been uploaded.
                </Typography>
              ) : (
                documents.map(
                  (
                    document,
                  ) => (
                    <Paper
                      key={
                        document.id
                      }
                      variant="outlined"
                      sx={{
                        p:
                          1.5,

                        borderRadius:
                          '8px',

                        borderColor:
                          '#e4e9f1',

                        boxShadow:
                          'none',
                      }}
                    >
                      <Box
                        sx={{
                          display:
                            'flex',

                          flexDirection: {
                            xs:
                              'column',

                            sm:
                              'row',
                          },

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
                              fontSize:
                                13.5,

                              fontWeight:
                                700,

                              color:
                                '#172033',
                            }}
                          >
                            {
                              document
                                .title
                            }
                          </Typography>

                          {document.description && (
                            <Typography
                              sx={{
                                mt:
                                  0.3,

                                fontSize:
                                  12.5,

                                color:
                                  '#667085',
                              }}
                            >
                              {
                                document
                                  .description
                              }
                            </Typography>
                          )}

                          <Typography
                            sx={{
                              mt:
                                0.4,

                              fontSize:
                                11.5,

                              color:
                                '#98a2b3',
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
                                document
                                  .uploaded_at,
                              )
                            }
                          </Typography>
                        </Box>

                        <Button
                          component="a"
                          size="small"
                          href={
                            resolveFileUrl(
                              document.file,
                            )
                          }
                          target="_blank"
                          rel="noreferrer"
                          sx={{
                            textTransform:
                              'none',
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
                p:
                  2.2,

                borderRadius:
                  '10px',

                borderColor:
                  '#d8e3ff',

                backgroundColor:
                  '#f8faff',

                boxShadow:
                  'none',
              }}
            >
              <Box
                sx={{
                  display:
                    'flex',

                  flexDirection: {
                    xs:
                      'column',

                    md:
                      'row',
                  },

                  justifyContent:
                    'space-between',

                  alignItems: {
                    xs:
                      'stretch',

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
                      fontSize:
                        15,

                      fontWeight:
                        700,

                      color:
                        '#172033',
                    }}
                  >
                    Submit Financial Assessment
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.35,

                      fontSize:
                        12.5,

                      color:
                        '#667085',
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
                    !financialComments
                      .trim()
                  }
                  onClick={() =>
                    void handleSubmit()
                  }
                  sx={{
                    minHeight:
                      42,

                    px:
                      2.2,

                    borderRadius:
                      '8px',

                    textTransform:
                      'none',

                    fontWeight:
                      600,

                    whiteSpace:
                      'nowrap',

                    boxShadow:
                      'none',
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
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              2,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p:
                2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Typography
              sx={{
                fontSize:
                  15,

                fontWeight:
                  700,

                color:
                  '#172033',
              }}
            >
              Assessment Details
            </Typography>

            <Divider
              sx={{
                my:
                  1.6,
              }}
            />

            <Box
              sx={{
                display:
                  'flex',

                flexDirection:
                  'column',

                gap:
                  1.5,
              }}
            >
              <LabelValue
                label="ASSIGNED FINANCIAL OFFICER"
                value={
                  assessment
                    .assigned_to_name
                }
              />

              <LabelValue
                label="TECHNICAL ASSESSMENT"
                value={
                  `#${assessment.technical_assessment}`
                }
              />

              <LabelValue
                label="REQUESTED"
                value={
                  formatDate(
                    assessment
                      .created_at,
                  )
                }
              />

              <LabelValue
                label="SUBMITTED"
                value={
                  formatDate(
                    assessment
                      .submitted_at,
                  )
                }
              />

              <LabelValue
                label="REVIEWED"
                value={
                  formatDate(
                    assessment
                      .reviewed_at,
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
                p:
                  2,

                borderRadius:
                  '10px',

                borderColor:
                  '#e4e9f1',

                boxShadow:
                  'none',
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    15,

                  fontWeight:
                    700,

                  color:
                    '#172033',
                }}
              >
                Manager Review
              </Typography>

              <Divider
                sx={{
                  my:
                    1.5,
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
                  mt:
                    1.5,

                  whiteSpace:
                    'pre-wrap',

                  fontSize:
                    13,

                  lineHeight:
                    1.6,

                  color:
                    '#344054',
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
              p:
                2,

              borderRadius:
                '10px',

              borderColor:
                '#e4e9f1',

              boxShadow:
                'none',
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1,
              }}
            >
              <HistoryRounded
                sx={{
                  color:
                    '#0b5cff',

                  fontSize:
                    20,
                }}
              />

              <Typography
                sx={{
                  fontSize:
                    15,

                  fontWeight:
                    700,

                  color:
                    '#172033',
                }}
              >
                Assessment History
              </Typography>
            </Box>

            <Divider
              sx={{
                my:
                  1.5,
              }}
            />

            <Box
              sx={{
                display:
                  'flex',

                flexDirection:
                  'column',

                gap:
                  1.5,
              }}
            >
              {history.length ===
              0 ? (
                <Typography
                  sx={{
                    fontSize:
                      13,

                    color:
                      '#667085',
                  }}
                >
                  No history recorded.
                </Typography>
              ) : (
                history.map(
                  (
                    item,
                  ) => (
                    <Box
                      key={
                        item.id
                      }
                      sx={{
                        pl:
                          1.4,

                        borderLeft:
                          '2px solid #dbe5f7',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize:
                            12.5,

                          fontWeight:
                            700,

                          color:
                            '#344054',
                        }}
                      >
                        {
                          item
                            .event_type_display
                        }
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            0.3,

                          fontSize:
                            12,

                          lineHeight:
                            1.5,

                          color:
                            '#667085',
                        }}
                      >
                        {
                          item
                            .description
                        }
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            0.35,

                          fontSize:
                            11,

                          color:
                            '#98a2b3',
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


export default FinancialAssessmentWorkspacePage