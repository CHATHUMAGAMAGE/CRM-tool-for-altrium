import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  Alert,
  Avatar,
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
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'

import {
  AddRounded,
  ArrowBackRounded,
  AssignmentIndRounded,
  BusinessRounded,
  CalendarTodayRounded,
  CallRounded,
  ChatBubbleOutlineRounded,
  CheckCircleRounded,
  CloseRounded,
  DoNotDisturbAltRounded,
  EditRounded,
  EventRounded,
  FilterListRounded,
  GroupsRounded,
  MailOutlineRounded,
  PersonOutlineRounded,
} from '@mui/icons-material'

import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router'

import LeadRescueRadarCard
  from '../components/leads/LeadRescueRadarCard'

import {
  getCurrentUser,
  type CurrentUser,
} from '../services/auth'

import {
  createLeadCommunication,
  createLeadFollowUp,
  createTechnicalAssessment,
  getLead,
  getLeadCommunications,
  getLeadFollowUps,
  getLeadHistory,
  getSalesRepresentatives,
  getTechLeads,
  getTechnicalAssessments,
  reviewTechnicalAssessment,
  updateLead,
  type Communication,
  type CommunicationType,
  type FollowUp,
  type FollowUpStatus,
  type Lead,
  type LeadHistory,
  type LeadHistoryEventType,
  type LeadStatus,
  type SalesRepresentative,
  type TechLead,
  type TechnicalAssessment,
  type TechnicalAssessmentStatus,
} from '../services/crm'

import {
  createFinancialAssessment,
  getFinancialAssessments,
  getFinancialOfficers,
  reviewFinancialAssessment,
  type FinancialAssessment,
  type FinancialAssessmentStatus,
  type FinancialOfficer,
} from '../services/financialCrm'


type WorkspaceTab =
  | 'overview'
  | 'communications'
  | 'follow-ups'
  | 'activity'
  | 'history'


type CommunicationFilter =
  | 'ALL'
  | CommunicationType


type CommunicationForm = {
  communicationType:
    CommunicationType

  communicationDate:
    string

  communicationTime:
    string

  summary:
    string

  notes:
    string
}


type FollowUpForm = {
  title:
    string

  description:
    string

  dueDate:
    string
}


type EditLeadForm = {
  contactName:
    string

  companyName:
    string

  email:
    string

  phone:
    string

  source:
    string
}


type QualificationAction =
  | 'QUALIFY'
  | 'DISQUALIFY'


type LeadActivityItem = {
  id:
    string

  type:
    | 'COMMUNICATION'
    | 'FOLLOW_UP'

  date:
    string

  title:
    string

  description:
    string

  performedBy:
    string

  communicationType?:
    CommunicationType

  followUp?:
    FollowUp
}


type OverviewActivityItem = {
  id:
    string

  type:
    | 'COMMUNICATION'
    | 'FOLLOW_UP'
    | 'HISTORY'

  date:
    string

  title:
    string

  description:
    string

  performedBy:
    string

  communicationType?:
    CommunicationType

  historyEventType?:
    LeadHistoryEventType
}


function getWorkspaceTab(
  value:
    string | null,
): WorkspaceTab {
  switch (
    value
  ) {
    case 'communications':
    case 'follow-ups':
    case 'activity':
    case 'history':
    case 'overview':
      return value

    default:
      return 'overview'
  }
}


function getStatusColor(
  status:
    LeadStatus,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  switch (
    status
  ) {
    case 'CONTACTED':
      return 'info'

    case 'PROPOSAL':
      return 'warning'

    case 'QUALIFIED':
    case 'WON':
      return 'success'

    case 'LOST':
    case 'DISQUALIFIED':
      return 'error'

    case 'NEW':
    default:
      return 'default'
  }
}


function getTechnicalAssessmentColor(
  status:
    TechnicalAssessmentStatus,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success' {
  switch (
    status
  ) {
    case 'REQUESTED':
      return 'info'

    case 'IN_PROGRESS':
      return 'warning'

    case 'SUBMITTED':
    case 'REVIEWED':
      return 'success'

    default:
      return 'default'
  }
}


function getFinancialAssessmentColor(
  status:
    FinancialAssessmentStatus,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success' {
  switch (
    status
  ) {
    case 'REQUESTED':
      return 'info'

    case 'IN_PROGRESS':
      return 'warning'

    case 'SUBMITTED':
    case 'REVIEWED':
      return 'success'

    default:
      return 'default'
  }
}


function getCommunicationIcon(
  type:
    CommunicationType,
) {
  switch (
    type
  ) {
    case 'CALL':
      return (
        <CallRounded
          fontSize="small"
        />
      )

    case 'EMAIL':
      return (
        <MailOutlineRounded
          fontSize="small"
        />
      )

    case 'MEETING':
      return (
        <GroupsRounded
          fontSize="small"
        />
      )

    case 'WHATSAPP':
      return (
        <ChatBubbleOutlineRounded
          fontSize="small"
        />
      )

    default:
      return (
        <CallRounded
          fontSize="small"
        />
      )
  }
}


function getFollowUpColor(
  followUp:
    FollowUp,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  if (
    followUp.is_overdue
  ) {
    return 'error'
  }

  switch (
    followUp.status
  ) {
    case 'PENDING':
      return 'info'

    case 'COMPLETED':
      return 'success'

    case 'CANCELLED':
    default:
      return 'default'
  }
}


function getFollowUpLabel(
  followUp:
    FollowUp,
) {
  if (
    followUp.is_overdue
  ) {
    return 'Overdue'
  }

  if (
    followUp.status ===
    'PENDING'
  ) {
    return 'Upcoming'
  }

  return followUp.status_display
}


function getHistoryColor(
  eventType:
    LeadHistoryEventType,
):
  | 'default'
  | 'info'
  | 'warning'
  | 'success'
  | 'error' {
  switch (
    eventType
  ) {
    case 'CREATED':
      return 'info'

    case 'ASSIGNED':
    case 'UNASSIGNED':
    case 'STATUS_CHANGED':
      return 'warning'

    case 'QUALIFIED':
    case 'WON':
      return 'success'

    case 'DISQUALIFIED':
    case 'LOST':
      return 'error'

    case 'UPDATED':
    default:
      return 'default'
  }
}


function getHistoryBackground(
  eventType:
    LeadHistoryEventType,
) {
  switch (
    eventType
  ) {
    case 'CREATED':
      return 'info.main'

    case 'ASSIGNED':
    case 'UNASSIGNED':
    case 'STATUS_CHANGED':
      return 'warning.main'

    case 'QUALIFIED':
    case 'WON':
      return 'success.main'

    case 'DISQUALIFIED':
    case 'LOST':
      return 'error.main'

    case 'UPDATED':
    default:
      return 'primary.main'
  }
}


function getHistoryIcon(
  eventType:
    LeadHistoryEventType,
) {
  switch (
    eventType
  ) {
    case 'CREATED':
      return (
        <AddRounded
          fontSize="small"
        />
      )

    case 'ASSIGNED':
    case 'UNASSIGNED':
      return (
        <AssignmentIndRounded
          fontSize="small"
        />
      )

    case 'QUALIFIED':
    case 'WON':
      return (
        <CheckCircleRounded
          fontSize="small"
        />
      )

    case 'DISQUALIFIED':
    case 'LOST':
      return (
        <DoNotDisturbAltRounded
          fontSize="small"
        />
      )

    case 'UPDATED':
      return (
        <EditRounded
          fontSize="small"
        />
      )

    case 'STATUS_CHANGED':
    default:
      return (
        <CalendarTodayRounded
          fontSize="small"
        />
      )
  }
}


function getHistorySupportingText(
  historyItem:
    LeadHistory,
) {
  const metadata =
    historyItem.metadata

  const qualificationNotes =
    metadata.qualification_notes

  if (
    typeof qualificationNotes ===
      'string' &&
    qualificationNotes.trim()
  ) {
    return qualificationNotes
  }

  const lostReason =
    metadata.lost_reason

  if (
    typeof lostReason ===
      'string' &&
    lostReason.trim()
  ) {
    return lostReason
  }

  const changedFields =
    metadata.changed_fields

  if (
    Array.isArray(
      changedFields,
    ) &&
    changedFields.length >
      0
  ) {
    return `Changed fields: ${changedFields
      .map(String)
      .join(', ')}`
  }

  return ''
}


function sortFollowUps(
  items:
    FollowUp[],
) {
  const statusRank:
  Record<
    FollowUpStatus,
    number
  > = {
    PENDING:
      0,

    COMPLETED:
      1,

    CANCELLED:
      2,
  }

  return [
    ...items,
  ].sort(
    (
      first,
      second,
    ) => {
      const statusDifference =
        statusRank[
          first.status
        ] -
        statusRank[
          second.status
        ]

      if (
        statusDifference !==
        0
      ) {
        return statusDifference
      }

      return (
        new Date(
          first.due_date,
        ).getTime() -
        new Date(
          second.due_date,
        ).getTime()
      )
    },
  )
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


function formatCompactDate(
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
  ).toLocaleDateString(
    'en-GB',
    {
      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    },
  )
}


function getLeadInitials(
  name:
    string,
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)

  return (
    parts
      .map(
        (
          part,
        ) =>
          part
            .charAt(0)
            .toUpperCase(),
      )
      .join('') ||
    'L'
  )
}


function getDefaultCommunicationDateParts() {
  const date =
    new Date(
      Date.now() -
        60_000,
    )

  const localDate =
    new Date(
      date.getTime() -
        date
          .getTimezoneOffset() *
        60_000,
    )

  const localValue =
    localDate.toISOString()

  return {
    date:
      localValue.slice(
        0,
        10,
      ),

    time:
      localValue.slice(
        11,
        16,
      ),
  }
}


function createEmptyCommunicationForm():
CommunicationForm {
  const defaultDateTime =
    getDefaultCommunicationDateParts()

  return {
    communicationType:
      'CALL',

    communicationDate:
      defaultDateTime.date,

    communicationTime:
      defaultDateTime.time,

    summary:
      '',

    notes:
      '',
  }
}


function getDefaultFollowUpDateTime() {
  const date =
    new Date(
      Date.now() +
        60 *
          60 *
          1000,
    )

  const localDate =
    new Date(
      date.getTime() -
        date
          .getTimezoneOffset() *
        60_000,
    )

  return localDate
    .toISOString()
    .slice(
      0,
      16,
    )
}


function createEmptyFollowUpForm():
FollowUpForm {
  return {
    title:
      '',

    description:
      '',

    dueDate:
      getDefaultFollowUpDateTime(),
  }
}


function getEditLeadForm(
  lead:
    Lead,
): EditLeadForm {
  return {
    contactName:
      lead.contact_name,

    companyName:
      lead.company_name,

    email:
      lead.email ||
      '',

    phone:
      lead.phone,

    source:
      lead.source ||
      '',
  }
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
            '#7a8699',

          fontSize:
            11,

          fontWeight:
            600,

          lineHeight:
            1.35,

          textTransform:
            'uppercase',

          letterSpacing:
            '0.04em',
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          mt:
            0.55,

          color:
            '#172033',

          fontSize:
            13,

          fontWeight:
            500,

          lineHeight:
            1.45,

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


function LeadWorkspacePage() {
  const navigate =
    useNavigate()

  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams()

  const {
    leadId,
  } =
    useParams()

  const [
    lead,
    setLead,
  ] =
    useState<
      Lead | null
    >(
      null,
    )

  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<
      CurrentUser | null
    >(
      null,
    )

  const [
    salesRepresentatives,
    setSalesRepresentatives,
  ] =
    useState<
      SalesRepresentative[]
    >(
      [],
    )

  const [
    communications,
    setCommunications,
  ] =
    useState<
      Communication[]
    >(
      [],
    )

  const [
    followUps,
    setFollowUps,
  ] =
    useState<
      FollowUp[]
    >(
      [],
    )

  const [
    history,
    setHistory,
  ] =
    useState<
      LeadHistory[]
    >(
      [],
    )

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      WorkspaceTab
    >(
      getWorkspaceTab(
        searchParams.get(
          'tab',
        ),
      ),
    )

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true,
    )

  const [
    error,
    setError,
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
    isAssigningLead,
    setIsAssigningLead,
  ] =
    useState(
      false,
    )

  const [
    assignmentError,
    setAssignmentError,
  ] =
    useState(
      '',
    )

  const [
    editLeadDialogOpen,
    setEditLeadDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    editLeadForm,
    setEditLeadForm,
  ] =
    useState<
      EditLeadForm
    >({
      contactName:
        '',

      companyName:
        '',

      email:
        '',

      phone:
        '',

      source:
        '',
    })

  const [
    isSavingLead,
    setIsSavingLead,
  ] =
    useState(
      false,
    )

  const [
    editLeadError,
    setEditLeadError,
  ] =
    useState(
      '',
    )

  const [
    qualificationDialogOpen,
    setQualificationDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    qualificationAction,
    setQualificationAction,
  ] =
    useState<
      QualificationAction
    >(
      'QUALIFY',
    )

  const [
    qualificationNotes,
    setQualificationNotes,
  ] =
    useState(
      '',
    )

  const [
    qualificationError,
    setQualificationError,
  ] =
    useState(
      '',
    )

  const [
    isSavingQualification,
    setIsSavingQualification,
  ] =
    useState(
      false,
    )

  const [
    isCreatingCommunication,
    setIsCreatingCommunication,
  ] =
    useState(
      false,
    )

  const [
    communicationDialogOpen,
    setCommunicationDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    communicationForm,
    setCommunicationForm,
  ] =
    useState<
      CommunicationForm
    >(
      createEmptyCommunicationForm,
    )

  const [
    communicationError,
    setCommunicationError,
  ] =
    useState(
      '',
    )

  const [
    communicationFilter,
    setCommunicationFilter,
  ] =
    useState<
      CommunicationFilter
    >(
      'ALL',
    )

  const [
    isCreatingFollowUp,
    setIsCreatingFollowUp,
  ] =
    useState(
      false,
    )

  const [
    followUpDialogOpen,
    setFollowUpDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    followUpForm,
    setFollowUpForm,
  ] =
    useState<
      FollowUpForm
    >(
      createEmptyFollowUpForm,
    )

  const [
    followUpError,
    setFollowUpError,
  ] =
    useState(
      '',
    )

  const [
    followUpSuccessMessage,
    setFollowUpSuccessMessage,
  ] =
    useState(
      '',
    )


  /*
   * TECHNICAL ASSESSMENT STATE
   */

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
    techLeads,
    setTechLeads,
  ] =
    useState<
      TechLead[]
    >(
      [],
    )

  const [
    technicalAssessmentLoadError,
    setTechnicalAssessmentLoadError,
  ] =
    useState(
      '',
    )

  const [
    assessmentDialogOpen,
    setAssessmentDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    selectedTechLeadId,
    setSelectedTechLeadId,
  ] =
    useState(
      '',
    )

  const [
    assessmentRequirements,
    setAssessmentRequirements,
  ] =
    useState(
      '',
    )

  const [
    assessmentError,
    setAssessmentError,
  ] =
    useState(
      '',
    )

  const [
    isCreatingAssessment,
    setIsCreatingAssessment,
  ] =
    useState(
      false,
    )

  const [
    reviewAssessmentDialogOpen,
    setReviewAssessmentDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    reviewAssessmentNotes,
    setReviewAssessmentNotes,
  ] =
    useState(
      '',
    )

  const [
    reviewAssessmentError,
    setReviewAssessmentError,
  ] =
    useState(
      '',
    )

  const [
    isReviewingAssessment,
    setIsReviewingAssessment,
  ] =
    useState(
      false,
    )


  /*
   * FINANCIAL ASSESSMENT STATE
   */

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
    financialOfficers,
    setFinancialOfficers,
  ] =
    useState<
      FinancialOfficer[]
    >(
      [],
    )

  const [
    financialAssessmentLoadError,
    setFinancialAssessmentLoadError,
  ] =
    useState(
      '',
    )

  const [
    financialAssessmentDialogOpen,
    setFinancialAssessmentDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    selectedFinancialOfficerId,
    setSelectedFinancialOfficerId,
  ] =
    useState(
      '',
    )

  const [
    financialAssessmentRequirements,
    setFinancialAssessmentRequirements,
  ] =
    useState(
      '',
    )

  const [
    financialAssessmentError,
    setFinancialAssessmentError,
  ] =
    useState(
      '',
    )

  const [
    isCreatingFinancialAssessment,
    setIsCreatingFinancialAssessment,
  ] =
    useState(
      false,
    )

  const [
    reviewFinancialDialogOpen,
    setReviewFinancialDialogOpen,
  ] =
    useState(
      false,
    )

  const [
    reviewFinancialNotes,
    setReviewFinancialNotes,
  ] =
    useState(
      '',
    )

  const [
    reviewFinancialError,
    setReviewFinancialError,
  ] =
    useState(
      '',
    )

  const [
    isReviewingFinancial,
    setIsReviewingFinancial,
  ] =
    useState(
      false,
    )


  useEffect(
    () => {
      setActiveTab(
        getWorkspaceTab(
          searchParams.get(
            'tab',
          ),
        ),
      )
    },
    [
      searchParams,
    ],
  )


  const selectWorkspaceTab =
    (
      tab:
        WorkspaceTab,
    ) => {
      setActiveTab(
        tab,
      )

      const nextParams =
        new URLSearchParams(
          searchParams,
        )

      if (
        tab ===
        'overview'
      ) {
        nextParams.delete(
          'tab',
        )
      } else {
        nextParams.set(
          'tab',
          tab,
        )
      }

      setSearchParams(
        nextParams,
        {
          replace:
            true,
        },
      )
    }


  useEffect(
    () => {
      let isMounted =
        true

      const loadWorkspace =
        async () => {
          const numericLeadId =
            Number(
              leadId,
            )

          if (
            !leadId ||
            Number.isNaN(
              numericLeadId,
            )
          ) {
            if (
              isMounted
            ) {
              setError(
                'Invalid lead identifier.',
              )

              setIsLoading(
                false,
              )
            }

            return
          }

          try {
            const [
              leadData,
              user,
              communicationData,
              followUpData,
              historyData,
            ] =
              await Promise.all([
                getLead(
                  numericLeadId,
                ),

                getCurrentUser(),

                getLeadCommunications(
                  numericLeadId,
                ),

                getLeadFollowUps(
                  numericLeadId,
                ),

                getLeadHistory(
                  numericLeadId,
                ),
              ])

            if (
              !isMounted
            ) {
              return
            }

            setLead(
              leadData,
            )

            setCurrentUser(
              user,
            )

            setCommunications(
              communicationData,
            )

            setFollowUps(
              sortFollowUps(
                followUpData,
              ),
            )

            setHistory(
              historyData,
            )


            if (
              user.role ===
                'SALES_MANAGER' ||
              user.role ===
                'ADMIN'
            ) {
              try {
                const [
                  assessmentData,
                  techLeadData,
                ] =
                  await Promise.all([
                    getTechnicalAssessments(),
                    getTechLeads(),
                  ])

                if (
                  isMounted
                ) {
                  setTechnicalAssessments(
                    assessmentData,
                  )

                  setTechLeads(
                    techLeadData,
                  )

                  setTechnicalAssessmentLoadError(
                    '',
                  )
                }
              } catch (
                assessmentRequestError
              ) {
                if (
                  isMounted
                ) {
                  setTechnicalAssessmentLoadError(
                    assessmentRequestError
                      instanceof Error
                      ? assessmentRequestError.message
                      : 'Unable to load technical assessment information.',
                  )
                }
              }


              try {
                const [
                  financialAssessmentData,
                  financialOfficerData,
                ] =
                  await Promise.all([
                    getFinancialAssessments(),
                    getFinancialOfficers(),
                  ])

                if (
                  isMounted
                ) {
                  setFinancialAssessments(
                    financialAssessmentData,
                  )

                  setFinancialOfficers(
                    financialOfficerData,
                  )

                  setFinancialAssessmentLoadError(
                    '',
                  )
                }
              } catch (
                financialRequestError
              ) {
                if (
                  isMounted
                ) {
                  setFinancialAssessmentLoadError(
                    financialRequestError
                      instanceof Error
                      ? financialRequestError.message
                      : 'Unable to load financial assessment information.',
                  )
                }
              }
            }


            if (
              user.role ===
                'ADMIN' ||
              user.role ===
                'SALES_MANAGER' ||
              user.role ===
                'PROJECT_MANAGER'
            ) {
              const representativeData =
                await getSalesRepresentatives()

              if (
                isMounted
              ) {
                setSalesRepresentatives(
                  representativeData,
                )
              }
            }
          } catch (
            requestError
          ) {
            if (
              !isMounted
            ) {
              return
            }

            setError(
              requestError
                instanceof Error
                ? requestError.message
                : 'Unable to load this lead.',
            )
          } finally {
            if (
              isMounted
            ) {
              setIsLoading(
                false,
              )
            }
          }
        }

      void loadWorkspace()

      return () => {
        isMounted =
          false
      }
    },
    [
      leadId,
    ],
  )


  const activityItems =
    useMemo<
      LeadActivityItem[]
    >(
      () => [
        ...communications.map(
          (
            communication,
          ) => ({
            id:
              `communication-${communication.id}`,

            type:
              'COMMUNICATION' as const,

            date:
              communication.communication_date,

            title:
              communication.summary,

            description:
              communication.notes,

            performedBy:
              communication.created_by_name,

            communicationType:
              communication.communication_type,
          }),
        ),

        ...followUps.map(
          (
            followUp,
          ) => ({
            id:
              `follow-up-${followUp.id}`,

            type:
              'FOLLOW_UP' as const,

            date:
              followUp.created_at,

            title:
              followUp.title,

            description:
              followUp.description,

            performedBy:
              followUp.created_by_name,

            followUp,
          }),
        ),
      ].sort(
        (
          first,
          second,
        ) =>
          new Date(
            second.date,
          ).getTime() -
          new Date(
            first.date,
          ).getTime(),
      ),
      [
        communications,
        followUps,
      ],
    )


  const overviewActivityItems =
    useMemo<
      OverviewActivityItem[]
    >(
      () => [
        ...communications.map(
          (
            communication,
          ) => ({
            id:
              `overview-communication-${communication.id}`,

            type:
              'COMMUNICATION' as const,

            date:
              communication.communication_date,

            title:
              communication.communication_type_display,

            description:
              communication.summary,

            performedBy:
              communication.created_by_name,

            communicationType:
              communication.communication_type,
          }),
        ),

        ...followUps.map(
          (
            followUp,
          ) => ({
            id:
              `overview-followup-${followUp.id}`,

            type:
              'FOLLOW_UP' as const,

            date:
              followUp.created_at,

            title:
              'Follow-up Scheduled',

            description:
              followUp.title,

            performedBy:
              followUp.created_by_name,
          }),
        ),

        ...history.map(
          (
            historyItem,
          ) => ({
            id:
              `overview-history-${historyItem.id}`,

            type:
              'HISTORY' as const,

            date:
              historyItem.created_at,

            title:
              historyItem.event_type_display,

            description:
              historyItem.description,

            performedBy:
              historyItem.performed_by_name ||
              'System',

            historyEventType:
              historyItem.event_type,
          }),
        ),
      ]
        .sort(
          (
            first,
            second,
          ) =>
            new Date(
              second.date,
            ).getTime() -
            new Date(
              first.date,
            ).getTime(),
        )
        .slice(
          0,
          5,
        ),
      [
        communications,
        followUps,
        history,
      ],
    )


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
        <Stack
          spacing={1.5}
          sx={{
            alignItems:
              'center',
          }}
        >
          <CircularProgress />

          <Typography
            color="text.secondary"
          >
            Loading lead workspace...
          </Typography>
        </Stack>
      </Box>
    )
  }


  if (
    error ||
    !lead
  ) {
    return (
      <Box
        sx={{
          p: {
            xs:
              3,

            md:
              5,
          },
        }}
      >
        <Alert
          severity="error"
          sx={{
            mb:
              3,
          }}
        >
          {error ||
            'Lead not found.'}
        </Alert>

        <Button
          startIcon={
            <ArrowBackRounded />
          }
          onClick={() =>
            navigate(
              '/leads',
            )
          }
        >
          Back to Leads
        </Button>
      </Box>
    )
  }


  const numericLeadId =
    lead.id


  const isSalesRep =
    currentUser?.role ===
    'SALES_REP'


  const canManageLead =
    currentUser?.role ===
      'ADMIN' ||
    currentUser?.role ===
      'SALES_MANAGER' ||
    currentUser?.role ===
      'PROJECT_MANAGER'


  const canWorkLead =
    canManageLead ||
    (
      isSalesRep &&
      lead.assigned_to ===
        currentUser?.id
    )


  const canAssignLead =
    canManageLead


  const isClosedLead =
    lead.status ===
      'WON' ||
    lead.status ===
      'LOST' ||
    lead.status ===
      'DISQUALIFIED'


  const canEditLead =
    canManageLead &&
    !isClosedLead


  const canReviewLead =
    canManageLead &&
    !isClosedLead


  const canAddCommunication =
    canWorkLead &&
    !isClosedLead


  const canScheduleFollowUp =
    canWorkLead &&
    !isClosedLead


  const filteredCommunications =
    communications.filter(
      (
        communication,
      ) =>
        communicationFilter ===
          'ALL' ||
        communication
          .communication_type ===
          communicationFilter,
    )


  /*
   * TECHNICAL ASSESSMENT DERIVED STATE
   */

  const leadTechnicalAssessments =
    technicalAssessments
      .filter(
        (
          assessment,
        ) =>
          assessment.lead ===
          numericLeadId,
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
      )


  const latestTechnicalAssessment =
    leadTechnicalAssessments[
      0
    ] ??
    null


  const hasActiveTechnicalAssessment =
    leadTechnicalAssessments.some(
      (
        assessment,
      ) =>
        assessment.status ===
          'REQUESTED' ||
        assessment.status ===
          'IN_PROGRESS' ||
        assessment.status ===
          'SUBMITTED',
    )


  const canManageTechnicalAssessment =
    currentUser?.role ===
      'SALES_MANAGER' ||
    currentUser?.role ===
      'ADMIN'


  const canRequestTechnicalAssessment =
    canManageTechnicalAssessment &&
    lead.status ===
      'QUALIFIED' &&
    !isClosedLead &&
    !hasActiveTechnicalAssessment


  const canReviewTechnicalAssessment =
    canManageTechnicalAssessment &&
    latestTechnicalAssessment?.status ===
      'SUBMITTED'


  /*
   * FINANCIAL ASSESSMENT DERIVED STATE
   */

  const leadFinancialAssessments =
    financialAssessments
      .filter(
        (
          assessment,
        ) =>
          assessment.lead ===
          numericLeadId,
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
      )


  const latestFinancialAssessment =
    leadFinancialAssessments[
      0
    ] ??
    null


  const hasActiveFinancialAssessment =
    leadFinancialAssessments.some(
      (
        assessment,
      ) =>
        assessment.status ===
          'REQUESTED' ||
        assessment.status ===
          'IN_PROGRESS' ||
        assessment.status ===
          'SUBMITTED',
    )


  const canManageFinancialAssessment =
    currentUser?.role ===
      'SALES_MANAGER' ||
    currentUser?.role ===
      'ADMIN'


  const canRequestFinancialAssessment =
    canManageFinancialAssessment &&
    lead.status ===
      'QUALIFIED' &&
    !isClosedLead &&
    latestTechnicalAssessment?.status ===
      'REVIEWED' &&
    !hasActiveFinancialAssessment


  const canReviewFinancialAssessment =
    canManageFinancialAssessment &&
    latestFinancialAssessment?.status ===
      'SUBMITTED'


  const refreshHistory =
    async () => {
      try {
        const data =
          await getLeadHistory(
            numericLeadId,
          )

        setHistory(
          data,
        )
      } catch {
        // Keep current history if refresh fails.
      }
    }


  const handleAssignLead =
    async (
      salesRepresentativeId:
        number | null,
    ) => {
      if (
        !canAssignLead
      ) {
        return
      }

      setIsAssigningLead(
        true,
      )

      setAssignmentError(
        '',
      )

      try {
        const updatedLead =
          await updateLead(
            numericLeadId,
            {
              assigned_to:
                salesRepresentativeId,
            },
          )

        setLead(
          updatedLead,
        )

        await refreshHistory()

        if (
          salesRepresentativeId ===
          null
        ) {
          setSuccessMessage(
            'Lead assignment removed successfully.',
          )
        } else {
          const representative =
            salesRepresentatives.find(
              (
                item,
              ) =>
                item.id ===
                salesRepresentativeId,
            )

          setSuccessMessage(
            representative
              ? `Lead assigned to ${representative.full_name} successfully.`
              : 'Lead assigned successfully.',
          )
        }
      } catch (
        requestError
      ) {
        setAssignmentError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to assign this lead.',
        )
      } finally {
        setIsAssigningLead(
          false,
        )
      }
    }


  const openEditLeadDialog =
    () => {
      if (
        !canEditLead
      ) {
        return
      }

      setEditLeadForm(
        getEditLeadForm(
          lead,
        ),
      )

      setEditLeadError(
        '',
      )

      setEditLeadDialogOpen(
        true,
      )
    }


  const closeEditLeadDialog =
    () => {
      if (
        isSavingLead
      ) {
        return
      }

      setEditLeadDialogOpen(
        false,
      )
    }


  const handleSaveLead =
    async () => {
      if (
        !canEditLead
      ) {
        return
      }

      if (
        !editLeadForm
          .contactName
          .trim() ||
        !editLeadForm
          .companyName
          .trim() ||
        !editLeadForm
          .phone
          .trim()
      ) {
        setEditLeadError(
          'Contact name, company name and phone number are required.',
        )

        return
      }

      setIsSavingLead(
        true,
      )

      setEditLeadError(
        '',
      )

      try {
        const updatedLead =
          await updateLead(
            numericLeadId,
            {
              contact_name:
                editLeadForm
                  .contactName
                  .trim(),

              company_name:
                editLeadForm
                  .companyName
                  .trim(),

              email:
                editLeadForm
                  .email
                  .trim(),

              phone:
                editLeadForm
                  .phone
                  .trim(),

              source:
                editLeadForm
                  .source
                  .trim(),
            },
          )

        setLead(
          updatedLead,
        )

        await refreshHistory()

        setEditLeadDialogOpen(
          false,
        )

        setSuccessMessage(
          'Lead details updated successfully.',
        )
      } catch (
        requestError
      ) {
        setEditLeadError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to update this lead.',
        )
      } finally {
        setIsSavingLead(
          false,
        )
      }
    }


  const openQualificationDialog =
    (
      action:
        QualificationAction,
    ) => {
      if (
        !canReviewLead
      ) {
        return
      }

      setQualificationAction(
        action,
      )

      setQualificationNotes(
        '',
      )

      setQualificationError(
        '',
      )

      setQualificationDialogOpen(
        true,
      )
    }


  const closeQualificationDialog =
    () => {
      if (
        isSavingQualification
      ) {
        return
      }

      setQualificationDialogOpen(
        false,
      )
    }


  const handleQualificationDecision =
    async () => {
      if (
        !canReviewLead
      ) {
        return
      }

      const notes =
        qualificationNotes.trim()

      if (
        !notes
      ) {
        setQualificationError(
          qualificationAction ===
            'QUALIFY'
            ? 'Please record qualification notes before qualifying the lead.'
            : 'Please provide a reason for disqualifying the lead.',
        )

        return
      }

      setIsSavingQualification(
        true,
      )

      setQualificationError(
        '',
      )

      try {
        const newStatus:
        LeadStatus =
          qualificationAction ===
          'QUALIFY'
            ? 'QUALIFIED'
            : 'DISQUALIFIED'

        const updatedLead =
          await updateLead(
            numericLeadId,
            {
              status:
                newStatus,

              qualification_notes:
                notes,
            },
          )

        setLead(
          updatedLead,
        )

        await refreshHistory()

        setQualificationDialogOpen(
          false,
        )

        setSuccessMessage(
          qualificationAction ===
            'QUALIFY'
            ? 'Lead qualified successfully.'
            : 'Lead disqualified successfully.',
        )
      } catch (
        requestError
      ) {
        setQualificationError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to update the lead qualification decision.',
        )
      } finally {
        setIsSavingQualification(
          false,
        )
      }
    }


  const openCommunicationDialog =
    () => {
      if (
        !canAddCommunication
      ) {
        return
      }

      setCommunicationError(
        '',
      )

      setCommunicationForm(
        createEmptyCommunicationForm(),
      )

      setCommunicationDialogOpen(
        true,
      )
    }


  const closeCommunicationDialog =
    () => {
      if (
        isCreatingCommunication
      ) {
        return
      }

      setCommunicationDialogOpen(
        false,
      )
    }


  const handleCreateCommunication =
    async () => {
      if (
        !canAddCommunication ||
        !communicationForm
          .summary
          .trim() ||
        !communicationForm
          .communicationDate ||
        !communicationForm
          .communicationTime
      ) {
        return
      }

      setIsCreatingCommunication(
        true,
      )

      setCommunicationError(
        '',
      )

      try {
        const createdCommunication =
          await createLeadCommunication(
            numericLeadId,
            {
              communication_type:
                communicationForm
                  .communicationType,

              communication_date:
                new Date(
                  `${communicationForm.communicationDate}T${communicationForm.communicationTime}`,
                ).toISOString(),

              summary:
                communicationForm
                  .summary
                  .trim(),

              notes:
                communicationForm
                  .notes
                  .trim(),
            },
          )

        setCommunications(
          (
            current,
          ) => [
            createdCommunication,
            ...current,
          ],
        )

        setCommunicationDialogOpen(
          false,
        )

        setCommunicationForm(
          createEmptyCommunicationForm(),
        )

        selectWorkspaceTab(
          'communications',
        )

        setSuccessMessage(
          'Communication recorded successfully.',
        )
      } catch (
        requestError
      ) {
        setCommunicationError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to record the communication.',
        )
      } finally {
        setIsCreatingCommunication(
          false,
        )
      }
    }


  const openFollowUpDialog =
    () => {
      if (
        !canScheduleFollowUp
      ) {
        return
      }

      setFollowUpError(
        '',
      )

      setFollowUpForm(
        createEmptyFollowUpForm(),
      )

      setFollowUpDialogOpen(
        true,
      )
    }


  const closeFollowUpDialog =
    () => {
      if (
        isCreatingFollowUp
      ) {
        return
      }

      setFollowUpDialogOpen(
        false,
      )
    }


  const handleCreateFollowUp =
    async () => {
      if (
        !canScheduleFollowUp ||
        !followUpForm
          .title
          .trim() ||
        !followUpForm
          .dueDate
      ) {
        return
      }

      const dueDate =
        new Date(
          followUpForm.dueDate,
        )

      if (
        Number.isNaN(
          dueDate.getTime(),
        ) ||
        dueDate <=
          new Date()
      ) {
        setFollowUpError(
          'Follow-up due date must be in the future.',
        )

        return
      }

      setIsCreatingFollowUp(
        true,
      )

      setFollowUpError(
        '',
      )

      try {
        const createdFollowUp =
          await createLeadFollowUp(
            numericLeadId,
            {
              title:
                followUpForm
                  .title
                  .trim(),

              description:
                followUpForm
                  .description
                  .trim(),

              due_date:
                dueDate.toISOString(),
            },
          )

        setFollowUps(
          (
            current,
          ) =>
            sortFollowUps([
              ...current,
              createdFollowUp,
            ]),
        )

        setFollowUpDialogOpen(
          false,
        )

        setFollowUpForm(
          createEmptyFollowUpForm(),
        )

        selectWorkspaceTab(
          'follow-ups',
        )

        setFollowUpSuccessMessage(
          'Follow-up scheduled successfully.',
        )
      } catch (
        requestError
      ) {
        setFollowUpError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to schedule the follow-up.',
        )
      } finally {
        setIsCreatingFollowUp(
          false,
        )
      }
    }


  /*
   * TECHNICAL ASSESSMENT ACTIONS
   */

  const openAssessmentDialog =
    () => {
      if (
        !canRequestTechnicalAssessment
      ) {
        return
      }

      setSelectedTechLeadId(
        '',
      )

      setAssessmentRequirements(
        '',
      )

      setAssessmentError(
        '',
      )

      setAssessmentDialogOpen(
        true,
      )
    }


  const closeAssessmentDialog =
    () => {
      if (
        isCreatingAssessment
      ) {
        return
      }

      setAssessmentDialogOpen(
        false,
      )

      setAssessmentError(
        '',
      )
    }


  const handleCreateTechnicalAssessment =
    async () => {
      if (
        !canRequestTechnicalAssessment
      ) {
        return
      }

      if (
        !selectedTechLeadId
      ) {
        setAssessmentError(
          'Please select a Tech Lead.',
        )

        return
      }

      if (
        !assessmentRequirements
          .trim()
      ) {
        setAssessmentError(
          'Technical assessment requirements are required.',
        )

        return
      }

      setIsCreatingAssessment(
        true,
      )

      setAssessmentError(
        '',
      )

      try {
        const created =
          await createTechnicalAssessment(
            {
              lead:
                numericLeadId,

              assigned_to:
                Number(
                  selectedTechLeadId,
                ),

              requirements:
                assessmentRequirements
                  .trim(),
            },
          )

        setTechnicalAssessments(
          (
            current,
          ) => [
            created,

            ...current.filter(
              (
                item,
              ) =>
                item.id !==
                created.id,
            ),
          ],
        )

        setAssessmentDialogOpen(
          false,
        )

        setSelectedTechLeadId(
          '',
        )

        setAssessmentRequirements(
          '',
        )

        setSuccessMessage(
          'Technical assessment requested successfully.',
        )
      } catch (
        requestError
      ) {
        setAssessmentError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to request the technical assessment.',
        )
      } finally {
        setIsCreatingAssessment(
          false,
        )
      }
    }


  const openReviewAssessmentDialog =
    () => {
      if (
        !canReviewTechnicalAssessment
      ) {
        return
      }

      setReviewAssessmentNotes(
        latestTechnicalAssessment
          ?.review_notes ||
          '',
      )

      setReviewAssessmentError(
        '',
      )

      setReviewAssessmentDialogOpen(
        true,
      )
    }


  const closeReviewAssessmentDialog =
    () => {
      if (
        isReviewingAssessment
      ) {
        return
      }

      setReviewAssessmentDialogOpen(
        false,
      )

      setReviewAssessmentError(
        '',
      )
    }


  const handleReviewTechnicalAssessment =
    async () => {
      if (
        !canReviewTechnicalAssessment ||
        !latestTechnicalAssessment
      ) {
        return
      }

      setIsReviewingAssessment(
        true,
      )

      setReviewAssessmentError(
        '',
      )

      try {
        const reviewed =
          await reviewTechnicalAssessment(
            latestTechnicalAssessment.id,
            {
              review_notes:
                reviewAssessmentNotes
                  .trim(),
            },
          )

        setTechnicalAssessments(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                reviewed.id
                  ? reviewed
                  : item,
            ),
        )

        setReviewAssessmentDialogOpen(
          false,
        )

        setSuccessMessage(
          'Technical assessment reviewed successfully.',
        )
      } catch (
        requestError
      ) {
        setReviewAssessmentError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to review the technical assessment.',
        )
      } finally {
        setIsReviewingAssessment(
          false,
        )
      }
    }


  /*
   * FINANCIAL ASSESSMENT ACTIONS
   */

  const openFinancialAssessmentDialog =
    () => {
      if (
        !canRequestFinancialAssessment
      ) {
        return
      }

      setSelectedFinancialOfficerId(
        '',
      )

      setFinancialAssessmentRequirements(
        [
          'Assess the financial viability of the proposed opportunity.',
          '',
          'Review:',
          '- estimated project cost',
          '- expected budget',
          '- pricing assumptions',
          '- financial risks',
          '- profitability / margin considerations',
          '- payment and cash-flow considerations',
          '- overall financial viability',
        ].join('\n'),
      )

      setFinancialAssessmentError(
        '',
      )

      setFinancialAssessmentDialogOpen(
        true,
      )
    }


  const closeFinancialAssessmentDialog =
    () => {
      if (
        isCreatingFinancialAssessment
      ) {
        return
      }

      setFinancialAssessmentDialogOpen(
        false,
      )

      setFinancialAssessmentError(
        '',
      )
    }


  const handleCreateFinancialAssessment =
    async () => {
      if (
        !canRequestFinancialAssessment ||
        !latestTechnicalAssessment
      ) {
        return
      }

      if (
        !selectedFinancialOfficerId
      ) {
        setFinancialAssessmentError(
          'Please select a Financial Officer.',
        )

        return
      }

      if (
        !financialAssessmentRequirements
          .trim()
      ) {
        setFinancialAssessmentError(
          'Financial assessment requirements are required.',
        )

        return
      }

      setIsCreatingFinancialAssessment(
        true,
      )

      setFinancialAssessmentError(
        '',
      )

      try {
        const created =
          await createFinancialAssessment(
            {
              lead:
                numericLeadId,

              technical_assessment:
                latestTechnicalAssessment.id,

              assigned_to:
                Number(
                  selectedFinancialOfficerId,
                ),

              requirements:
                financialAssessmentRequirements
                  .trim(),
            },
          )

        setFinancialAssessments(
          (
            current,
          ) => [
            created,

            ...current.filter(
              (
                item,
              ) =>
                item.id !==
                created.id,
            ),
          ],
        )

        setFinancialAssessmentDialogOpen(
          false,
        )

        setSelectedFinancialOfficerId(
          '',
        )

        setFinancialAssessmentRequirements(
          '',
        )

        setSuccessMessage(
          'Financial assessment requested successfully.',
        )
      } catch (
        requestError
      ) {
        setFinancialAssessmentError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to request the financial assessment.',
        )
      } finally {
        setIsCreatingFinancialAssessment(
          false,
        )
      }
    }


  const openReviewFinancialDialog =
    () => {
      if (
        !canReviewFinancialAssessment
      ) {
        return
      }

      setReviewFinancialNotes(
        latestFinancialAssessment
          ?.review_notes ||
          '',
      )

      setReviewFinancialError(
        '',
      )

      setReviewFinancialDialogOpen(
        true,
      )
    }


  const closeReviewFinancialDialog =
    () => {
      if (
        isReviewingFinancial
      ) {
        return
      }

      setReviewFinancialDialogOpen(
        false,
      )

      setReviewFinancialError(
        '',
      )
    }


  const handleReviewFinancialAssessment =
    async () => {
      if (
        !canReviewFinancialAssessment ||
        !latestFinancialAssessment
      ) {
        return
      }

      setIsReviewingFinancial(
        true,
      )

      setReviewFinancialError(
        '',
      )

      try {
        const reviewed =
          await reviewFinancialAssessment(
            latestFinancialAssessment.id,
            {
              review_notes:
                reviewFinancialNotes
                  .trim(),
            },
          )

        setFinancialAssessments(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                reviewed.id
                  ? reviewed
                  : item,
            ),
        )

        setReviewFinancialDialogOpen(
          false,
        )

        setSuccessMessage(
          'Financial assessment reviewed successfully.',
        )
      } catch (
        requestError
      ) {
        setReviewFinancialError(
          requestError
            instanceof Error
            ? requestError.message
            : 'Unable to review the financial assessment.',
        )
      } finally {
        setIsReviewingFinancial(
          false,
        )
      }
    }


  const leadIdentifier =
    `LEAD-${String(
      lead.id,
    ).padStart(
      4,
      '0',
    )}`


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
            'none',

          mx:
            'auto',
        }}
      >
        {successMessage && (
          <Alert
            severity="success"
            sx={{
              mb:
                2.5,
            }}
            onClose={() =>
              setSuccessMessage(
                '',
              )
            }
          >
            {successMessage}
          </Alert>
        )}


        {/*
          LEAD HEADER
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2,

            borderRadius:
              '12px',

            borderColor:
              '#e4e8ef',

            boxShadow:
              '0 2px 10px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Box
            sx={{
              p: {
                xs:
                  2.25,

                md:
                  2.75,
              },
            }}
          >
            <Stack
              direction={{
                xs:
                  'column',

                lg:
                  'row',
              }}
              sx={{
                justifyContent:
                  'space-between',

                alignItems: {
                  xs:
                    'flex-start',

                  lg:
                    'center',
                },

                gap:
                  3,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems:
                    'center',

                  minWidth:
                    0,
                }}
              >
                <Avatar
                  sx={{
                    width:
                      64,

                    height:
                      64,

                    bgcolor:
                      '#e8efff',

                    color:
                      '#1557d5',

                    fontSize:
                      22,

                    fontWeight:
                      700,

                    flexShrink:
                      0,
                  }}
                >
                  {getLeadInitials(
                    lead.contact_name,
                  )}
                </Avatar>


                <Box
                  sx={{
                    minWidth:
                      0,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      alignItems:
                        'center',

                      flexWrap:
                        'wrap',

                      rowGap:
                        0.75,
                    }}
                  >
                    <Typography
                      sx={{
                        color:
                          '#172033',

                        fontSize: {
                          xs:
                            22,

                          md:
                            24,
                        },

                        fontWeight:
                          700,

                        letterSpacing:
                          '-0.02em',
                      }}
                    >
                      {lead.contact_name}
                    </Typography>


                    <Chip
                      size="small"
                      label={
                        lead.status_display
                      }
                      color={
                        getStatusColor(
                          lead.status,
                        )
                      }
                      variant="outlined"
                    />
                  </Stack>


                  <Typography
                    sx={{
                      mt:
                        0.25,

                      color:
                        '#1557d5',

                      fontSize:
                        14,

                      fontWeight:
                        600,
                    }}
                  >
                    {lead.company_name}
                  </Typography>


                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                      mt:
                        0.9,

                      alignItems:
                        'center',

                      flexWrap:
                        'wrap',
                    }}
                  >
                    <Chip
                      size="small"
                      label={
                        `ID: ${leadIdentifier}`
                      }
                      sx={{
                        bgcolor:
                          '#f5f7fa',

                        color:
                          '#667085',

                        border:
                          '1px solid #e4e8ef',
                      }}
                    />


                    <Typography
                      sx={{
                        color:
                          '#7a8699',

                        fontSize:
                          12,
                      }}
                    >
                      Assigned to:{' '}

                      <Box
                        component="span"
                        sx={{
                          color:
                            '#344054',

                          fontWeight:
                            600,
                        }}
                      >
                        {lead.assigned_to_name ||
                          'Unassigned'}
                      </Box>
                    </Typography>
                  </Stack>
                </Box>
              </Stack>


              {canWorkLead && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    flexWrap:
                      'wrap',

                    rowGap:
                      1,

                    justifyContent: {
                      xs:
                        'flex-start',

                      lg:
                        'flex-end',
                    },
                  }}
                >
                  {canEditLead && (
                    <Button
                      variant="outlined"
                      startIcon={
                        <EditRounded />
                      }
                      onClick={
                        openEditLeadDialog
                      }
                      sx={{
                        bgcolor:
                          '#ffffff',
                      }}
                    >
                      Edit Lead
                    </Button>
                  )}


                  {canAssignLead &&
                    !isClosedLead && (
                      <Button
                        variant="outlined"
                        startIcon={
                          <AssignmentIndRounded />
                        }
                        onClick={() => {
                          document
                            .getElementById(
                              'lead-ownership',
                            )
                            ?.scrollIntoView({
                              behavior:
                                'smooth',

                              block:
                                'center',
                            })
                        }}
                        sx={{
                          bgcolor:
                            '#ffffff',
                        }}
                      >
                        Assign Rep
                      </Button>
                    )}


                  {canAddCommunication && (
                    <Button
                      variant="contained"
                      startIcon={
                        <ChatBubbleOutlineRounded />
                      }
                      onClick={
                        openCommunicationDialog
                      }
                    >
                      Add Communication
                    </Button>
                  )}


                  {canScheduleFollowUp && (
                    <Button
                      variant="outlined"
                      startIcon={
                        <EventRounded />
                      }
                      onClick={
                        openFollowUpDialog
                      }
                      sx={{
                        bgcolor:
                          '#ffffff',
                      }}
                    >
                      Schedule Follow-up
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Box>
        </Card>


        {/*
          WORKSPACE TABS
        */}

        <Card
          variant="outlined"
          sx={{
            mb:
              2.5,

            borderRadius:
              '12px',

            borderColor:
              '#e4e8ef',

            boxShadow:
              '0 2px 8px rgba(15, 23, 42, 0.025)',
          }}
        >
          <Tabs
            value={
              activeTab
            }
            onChange={(
              _event,
              newValue:
                WorkspaceTab,
            ) =>
              selectWorkspaceTab(
                newValue,
              )
            }
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px:
                1.5,

              minHeight:
                48,

              '& .MuiTab-root':
                {
                  minHeight:
                    48,

                  px:
                    2,

                  fontSize:
                    13,

                  fontWeight:
                    500,

                  textTransform:
                    'none',
                },

              '& .Mui-selected':
                {
                  fontWeight:
                    600,
                },
            }}
          >
            <Tab
              value="overview"
              label="Overview"
            />

            <Tab
              value="communications"
              label="Communications"
            />

            <Tab
              value="follow-ups"
              label="Follow-ups"
            />

            <Tab
              value="activity"
              label="Activity"
            />

            <Tab
              value="history"
              label="History"
            />
          </Tabs>
        </Card>


        {/*
          OVERVIEW
        */}

        {activeTab ===
          'overview' && (
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                lg:
                  'repeat(12, minmax(0, 1fr))',
              },

              gap:
                2.25,

              alignItems:
                'start',
            }}
          >
            {/*
              LEFT COLUMN
            */}

            <Stack
              spacing={2.25}
              sx={{
                gridColumn: {
                  lg:
                    '1 / span 6',
                },

                gridRow: {
                  lg:
                    '1',
                },
              }}
            >
              <Card
                variant="outlined"
                sx={{
                  gridColumn: {
                    lg:
                      'span 6',
                  },

                  gridRow: {
                    lg:
                      '1',
                  },

                  borderRadius:
                    '12px',

                  borderColor:
                    '#e4e8ef',

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
                  <Typography
                    sx={{
                      color:
                        '#172033',

                      fontSize:
                        16,

                      fontWeight:
                        700,
                    }}
                  >
                    Lead Information
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.25,

                      color:
                        '#7a8699',

                      fontSize:
                        12,
                    }}
                  >
                    Core contact and prospect information
                  </Typography>
                </Box>


                <Divider />


                <Box
                  sx={{
                    p:
                      2.5,

                    display:
                      'grid',

                    gridTemplateColumns: {
                      xs:
                        '1fr',

                      sm:
                        'repeat(2, 1fr)',

                      md:
                        'repeat(3, 1fr)',
                    },

                    columnGap:
                      3,

                    rowGap:
                      2.5,
                  }}
                >
                  <InformationItem
                    label="Contact Name"
                    value={
                      lead.contact_name
                    }
                  />

                  <InformationItem
                    label="Company"
                    value={
                      lead.company_name
                    }
                  />

                  <InformationItem
                    label="Created"
                    value={
                      formatCompactDate(
                        lead.created_at,
                      )
                    }
                  />

                  <InformationItem
                    label="Email"
                    value={
                      lead.email ||
                      'Not provided'
                    }
                  />

                  <InformationItem
                    label="Phone"
                    value={
                      lead.phone
                    }
                  />

                  <InformationItem
                    label="Last Updated"
                    value={
                      formatCompactDate(
                        lead.updated_at,
                      )
                    }
                  />

                  <InformationItem
                    label="Lead Source"
                    value={
                      lead.source ||
                      'Not provided'
                    }
                  />

                  <InformationItem
                    label="Assigned Sales Representative"
                    value={
                      lead.assigned_to_name ||
                      'Unassigned'
                    }
                  />

                  <InformationItem
                    label="Created By"
                    value={
                      lead.created_by_name
                    }
                  />

                  {lead.converted_at && (
                    <InformationItem
                      label="Won"
                      value={
                        formatDate(
                          lead.converted_at,
                        )
                      }
                    />
                  )}
                </Box>
              </Card>


              {/*
                QUALIFICATION REVIEW
              */}

              <Card
                variant="outlined"
                sx={{
                  gridColumn: {
                    lg:
                      '1 / -1',
                  },

                  borderRadius:
                    '12px',

                  borderColor:
                    '#e4e8ef',

                  boxShadow:
                    '0 2px 8px rgba(15, 23, 42, 0.035)',
                }}
              >
                <Box
                  sx={{
                    px:
                      2.25,

                    py:
                      1.5,
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
                        1.5,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          color:
                            '#172033',

                          fontSize:
                            16,

                          fontWeight:
                            700,
                        }}
                      >
                        Qualification Review
                      </Typography>

                      <Typography
                        sx={{
                          mt:
                            0.25,

                          color:
                            '#7a8699',

                          fontSize:
                            12,
                        }}
                      >
                        Sales Manager review and lead qualification decision
                      </Typography>
                    </Box>


                    <Chip
                      size="small"
                      label={
                        lead.status ===
                          'QUALIFIED'
                          ? 'Qualified'
                          : lead.status ===
                              'DISQUALIFIED'
                            ? 'Disqualified'
                            : isClosedLead
                              ? lead.status_display
                              : 'Qualification Pending'
                      }
                      color={
                        lead.status ===
                          'QUALIFIED'
                          ? 'success'
                          : lead.status ===
                              'DISQUALIFIED'
                            ? 'error'
                            : 'warning'
                      }
                      variant="outlined"
                    />
                  </Stack>
                </Box>


                <Divider />


                <Box
                  sx={{
                    p:
                      1.75,
                  }}
                >
                  {lead.qualification_notes ? (
                    <Box
                      sx={{
                        mb:
                          canReviewLead
                            ? 1.25
                            : 0,
                      }}
                    >
                      <Typography
                        sx={{
                          color:
                            '#7a8699',

                          fontSize:
                            11,

                          fontWeight:
                            600,

                          textTransform:
                            'uppercase',

                          letterSpacing:
                            '0.04em',
                        }}
                      >
                        {lead.status ===
                        'DISQUALIFIED'
                          ? 'Disqualification Reason'
                          : 'Qualification Notes'}
                      </Typography>


                      <Box
                        sx={{
                          mt:
                            0.8,

                          p:
                            1.25,

                          border:
                            '1px solid #e4e8ef',

                          borderRadius:
                            '8px',

                          bgcolor:
                            '#fafbfc',
                        }}
                      >
                        <Typography
                          sx={{
                            color:
                              '#475467',

                            fontSize:
                              13,

                            lineHeight:
                              1.55,

                            whiteSpace:
                              'pre-wrap',
                          }}
                        >
                          {lead.qualification_notes}
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Typography
                      sx={{
                        mb:
                          canReviewLead
                            ? 1.25
                            : 0,

                        color:
                          '#7a8699',

                        fontSize:
                          13,
                      }}
                    >
                      No qualification notes have been recorded yet.
                    </Typography>
                  )}


                  {canReviewLead && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        flexWrap:
                          'wrap',

                        rowGap:
                          1,
                      }}
                    >
                      {lead.status !==
                        'QUALIFIED' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={
                            <CheckCircleRounded />
                          }
                          onClick={() =>
                            openQualificationDialog(
                              'QUALIFY',
                            )
                          }
                        >
                          Qualify Lead
                        </Button>
                      )}


                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={
                          <DoNotDisturbAltRounded />
                        }
                        onClick={() =>
                          openQualificationDialog(
                            'DISQUALIFY',
                          )
                        }
                      >
                        Disqualify Lead
                      </Button>
                    </Stack>
                  )}
                </Box>
              </Card>


              </Stack>


            {/*
              MIDDLE COLUMN
            */}

            <Stack
              spacing={2.25}
              sx={{
                gridColumn: {
                  lg:
                    '7 / span 3',
                },

                gridRow: {
                  lg:
                    '1',
                },
              }}
            >
              <Card
                id="lead-ownership"
                variant="outlined"
                sx={{
                  borderRadius:
                    '12px',

                  borderColor:
                    '#e4e8ef',

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
                        '#172033',

                      fontSize:
                        15,

                      fontWeight:
                        700,
                    }}
                  >
                    Ownership
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.2,

                      color:
                        '#7a8699',

                      fontSize:
                        11.5,
                    }}
                  >
                    Manage and reassign lead ownership
                  </Typography>
                </Box>


                <Divider />


                <Box
                  sx={{
                    p:
                      2.25,
                  }}
                >
                  <Typography
                    sx={{
                      mb:
                        0.75,

                      color:
                        '#667085',

                      fontSize:
                        11.5,

                      fontWeight:
                        600,
                    }}
                  >
                    Assigned to
                  </Typography>


                  {canAssignLead &&
                  !isClosedLead ? (
                    <FormControl
                      fullWidth
                      size="small"
                    >
                      <Select<string>
                        value={
                          lead.assigned_to ===
                          null
                            ? ''
                            : String(
                                lead.assigned_to,
                              )
                        }
                        disabled={
                          isAssigningLead
                        }
                        onChange={(
                          event,
                        ) => {
                          const selectedValue =
                            event.target.value

                          void handleAssignLead(
                            selectedValue ===
                              ''
                              ? null
                              : Number(
                                  selectedValue,
                                ),
                          )
                        }}
                      >
                        <MenuItem
                          value=""
                        >
                          Unassigned
                        </MenuItem>

                        {salesRepresentatives.map(
                          (
                            representative,
                          ) => (
                            <MenuItem
                              key={
                                representative.id
                              }
                              value={
                                String(
                                  representative.id,
                                )
                              }
                            >
                              {representative.full_name}
                              {' ('}
                              {representative.username}
                              {')'}
                            </MenuItem>
                          ),
                        )}
                      </Select>
                    </FormControl>
                  ) : (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems:
                          'center',

                        p:
                          1.25,

                        border:
                          '1px solid #e4e8ef',

                        borderRadius:
                          '8px',
                      }}
                    >
                      <PersonOutlineRounded
                        sx={{
                          color:
                            '#667085',

                          fontSize:
                            19,
                        }}
                      />

                      <Typography
                        sx={{
                          color:
                            '#344054',

                          fontSize:
                            13,

                          fontWeight:
                            500,
                        }}
                      >
                        {lead.assigned_to_name ||
                          'Unassigned'}
                      </Typography>
                    </Stack>
                  )}


                  {isAssigningLead && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        mt:
                          1.25,

                        alignItems:
                          'center',
                      }}
                    >
                      <CircularProgress
                        size={15}
                      />

                      <Typography
                        sx={{
                          color:
                            '#7a8699',

                          fontSize:
                            11.5,
                        }}
                      >
                        Updating assignment...
                      </Typography>
                    </Stack>
                  )}


                  {assignmentError && (
                    <Alert
                      severity="error"
                      sx={{
                        mt:
                          1.5,
                      }}
                    >
                      {assignmentError}
                    </Alert>
                  )}
                </Box>
              </Card>


              <LeadRescueRadarCard
                leadId={
                  lead.id
                }
                isClosed={
                  isClosedLead
                }
              />
            </Stack>


            {/*
              RIGHT COLUMN
            */}

            <Card
              variant="outlined"
              sx={{
                gridColumn: {
                  lg:
                    '10 / span 3',
                },

                gridRow: {
                  lg:
                    '1',
                },

                borderRadius:
                  '12px',

                borderColor:
                  '#e4e8ef',

                boxShadow:
                  '0 2px 8px rgba(15, 23, 42, 0.035)',

                overflow:
                  'hidden',
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
                      '#172033',

                    fontSize:
                      15,

                    fontWeight:
                      700,
                  }}
                >
                  Recent Activity
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.2,

                    color:
                      '#7a8699',

                    fontSize:
                      11.5,
                  }}
                >
                  Latest activity and engagement history
                </Typography>
              </Box>


              <Divider />


              {overviewActivityItems.length ===
              0 ? (
                <Box
                  sx={{
                    px:
                      2.25,

                    py:
                      4,

                    textAlign:
                      'center',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        '#7a8699',

                      fontSize:
                        12.5,
                    }}
                  >
                    No activity has been recorded yet.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    px:
                      2.25,

                    py:
                      2.25,
                  }}
                >
                  <Box
                    sx={{
                      position:
                        'relative',

                      '&::before':
                        {
                          content:
                            '""',

                          position:
                            'absolute',

                          left:
                            18,

                          top:
                            19,

                          bottom:
                            19,

                          width:
                            '1px',

                          bgcolor:
                            '#e4e8ef',
                        },
                    }}
                  >
                    <Stack
                      spacing={2.4}
                    >
                      {overviewActivityItems.map(
                        (
                          item,
                        ) => (
                          <Stack
                            key={
                              item.id
                            }
                            direction="row"
                            spacing={1.4}
                            sx={{
                              position:
                                'relative',

                              alignItems:
                                'flex-start',
                            }}
                          >
                            <Box
                              sx={{
                                zIndex:
                                  1,

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
                                  '50%',

                                border:
                                  '1px solid #e4e8ef',

                                bgcolor:
                                  item.type ===
                                  'COMMUNICATION'
                                    ? '#eef4ff'
                                    : item.type ===
                                        'FOLLOW_UP'
                                      ? '#ecfdf3'
                                      : '#fff7ed',

                                color:
                                  item.type ===
                                  'COMMUNICATION'
                                    ? '#1557d5'
                                    : item.type ===
                                        'FOLLOW_UP'
                                      ? '#039855'
                                      : '#dc6803',
                              }}
                            >
                              {item.type ===
                              'COMMUNICATION'
                                ? getCommunicationIcon(
                                    item.communicationType ??
                                      'CALL',
                                  )
                                : item.type ===
                                    'FOLLOW_UP'
                                  ? (
                                      <EventRounded
                                        sx={{
                                          fontSize:
                                            18,
                                        }}
                                      />
                                    )
                                  : getHistoryIcon(
                                      item.historyEventType ??
                                        'UPDATED',
                                    )}
                            </Box>


                            <Box
                              sx={{
                                minWidth:
                                  0,

                                flex:
                                  1,

                                pt:
                                  0.1,
                              }}
                            >
                              <Typography
                                sx={{
                                  color:
                                    '#172033',

                                  fontSize:
                                    12.5,

                                  fontWeight:
                                    600,

                                  lineHeight:
                                    1.4,
                                }}
                              >
                                {item.title}
                              </Typography>


                              <Typography
                                sx={{
                                  mt:
                                    0.25,

                                  color:
                                    '#98a2b3',

                                  fontSize:
                                    10.5,
                                }}
                              >
                                {formatDate(
                                  item.date,
                                )}
                              </Typography>


                              {item.description && (
                                <Typography
                                  sx={{
                                    mt:
                                      0.65,

                                    color:
                                      '#667085',

                                    fontSize:
                                      11.5,

                                    lineHeight:
                                      1.55,
                                  }}
                                >
                                  {item.description}
                                </Typography>
                              )}


                              <Typography
                                sx={{
                                  mt:
                                    0.45,

                                  color:
                                    '#98a2b3',

                                  fontSize:
                                    10.5,
                                }}
                              >
                                {item.performedBy}
                              </Typography>
                            </Box>
                          </Stack>
                        ),
                      )}
                    </Stack>
                  </Box>
                </Box>
              )}


              <Divider />


              <Box
                sx={{
                  p:
                    1.75,
                }}
              >
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  onClick={() =>
                    selectWorkspaceTab(
                      'history',
                    )
                  }
                >
                  View Full History
                </Button>
              </Box>
            </Card>



            {/*
              ASSESSMENTS
            */}

            <Box
              sx={{
                gridColumn: {
                  lg:
                    '1 / -1',
                },

                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  lg:
                    'repeat(12, minmax(0, 1fr))',
                },

                gap:
                  2.25,

                alignItems:
                  'start',
              }}
            >
            {/*
                TECHNICAL ASSESSMENT
              */}

              {canManageTechnicalAssessment && (
                <Card
                  variant="outlined"
                  sx={{
                    gridColumn: {
                      lg:
                        'span 6',
                    },

                    borderRadius:
                      '12px',

                    borderColor:
                      '#e4e8ef',

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
                          1.5,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color:
                              '#172033',

                            fontSize:
                              16,

                            fontWeight:
                              700,
                          }}
                        >
                          Technical Assessment
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              '#7a8699',

                            fontSize:
                              12,
                          }}
                        >
                          Technical feasibility review for this qualified lead
                        </Typography>
                      </Box>


                      {latestTechnicalAssessment && (
                        <Chip
                          size="small"
                          label={
                            latestTechnicalAssessment
                              .status_display
                          }
                          color={
                            getTechnicalAssessmentColor(
                              latestTechnicalAssessment
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
                    {technicalAssessmentLoadError && (
                      <Alert
                        severity="warning"
                        sx={{
                          mb:
                            2,
                        }}
                      >
                        {technicalAssessmentLoadError}
                      </Alert>
                    )}


                    {!latestTechnicalAssessment ? (
                      <>
                        {lead.status !==
                        'QUALIFIED' ? (
                          <Alert
                            severity="info"
                            variant="outlined"
                          >
                            The lead must be qualified before a technical assessment can be requested.
                          </Alert>
                        ) : (
                          <>
                            <Typography
                              sx={{
                                color:
                                  '#667085',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,
                              }}
                            >
                              No technical assessment has been requested for this lead yet.
                            </Typography>


                            <Button
                              size="small"
                              variant="contained"
                              startIcon={
                                <AddRounded />
                              }
                              onClick={
                                openAssessmentDialog
                              }
                              disabled={
                                techLeads.length ===
                                0
                              }
                              sx={{
                                mt:
                                  2,
                              }}
                            >
                              Request Technical Assessment
                            </Button>


                            {techLeads.length ===
                              0 && (
                              <Alert
                                severity="warning"
                                variant="outlined"
                                sx={{
                                  mt:
                                    2,
                                }}
                              >
                                No active Tech Lead accounts are available. Create a Tech Lead user first.
                              </Alert>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <Stack
                        spacing={2}
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
                            label="Assigned Tech Lead"
                            value={
                              latestTechnicalAssessment
                                .assigned_to_name
                            }
                          />

                          <InformationItem
                            label="Requested By"
                            value={
                              latestTechnicalAssessment
                                .requested_by_name
                            }
                          />

                          <InformationItem
                            label="Requested"
                            value={
                              formatDate(
                                latestTechnicalAssessment
                                  .created_at,
                              )
                            }
                          />

                          {latestTechnicalAssessment
                            .submitted_at && (
                            <InformationItem
                              label="Submitted"
                              value={
                                formatDate(
                                  latestTechnicalAssessment
                                    .submitted_at,
                                )
                              }
                            />
                          )}

                          {latestTechnicalAssessment
                            .reviewed_at && (
                            <InformationItem
                              label="Reviewed"
                              value={
                                formatDate(
                                  latestTechnicalAssessment
                                    .reviewed_at,
                                )
                              }
                            />
                          )}

                          {latestTechnicalAssessment
                            .reviewed_by_name && (
                            <InformationItem
                              label="Reviewed By"
                              value={
                                latestTechnicalAssessment
                                  .reviewed_by_name
                              }
                            />
                          )}
                        </Box>


                        <Box>
                          <Typography
                            sx={{
                              color:
                                '#7a8699',

                              fontSize:
                                11,

                              fontWeight:
                                600,

                              textTransform:
                                'uppercase',

                              letterSpacing:
                                '0.04em',
                            }}
                          >
                            Requirements
                          </Typography>


                          <Box
                            sx={{
                              mt:
                                0.8,

                              p:
                                1.5,

                              border:
                                '1px solid #e4e8ef',

                              borderRadius:
                                '8px',

                              bgcolor:
                                '#fafbfc',
                            }}
                          >
                            <Typography
                              sx={{
                                color:
                                  '#475467',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {
                                latestTechnicalAssessment
                                  .requirements
                              }
                            </Typography>
                          </Box>
                        </Box>


                        {latestTechnicalAssessment
                          .technical_comments && (
                          <Box>
                            <Typography
                              sx={{
                                color:
                                  '#7a8699',

                                fontSize:
                                  11,

                                fontWeight:
                                  600,

                                textTransform:
                                  'uppercase',

                                letterSpacing:
                                  '0.04em',
                              }}
                            >
                              Technical Findings
                            </Typography>


                            <Box
                              sx={{
                                mt:
                                  0.8,

                                p:
                                  1.5,

                                border:
                                  '1px solid #e4e8ef',

                                borderRadius:
                                  '8px',

                                bgcolor:
                                  '#fafbfc',
                              }}
                            >
                              <Typography
                                sx={{
                                  color:
                                    '#475467',

                                  fontSize:
                                    13,

                                  lineHeight:
                                    1.55,

                                  whiteSpace:
                                    'pre-wrap',
                                }}
                              >
                                {
                                  latestTechnicalAssessment
                                    .technical_comments
                                }
                              </Typography>
                            </Box>
                          </Box>
                        )}


                        <Stack
                          direction={{
                            xs:
                              'column',

                            sm:
                              'row',
                          }}
                          spacing={1}
                          sx={{
                            alignItems: {
                              sm:
                                'center',
                            },

                            flexWrap:
                              'wrap',
                          }}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            label={
                              `${latestTechnicalAssessment.recommendations.length} recommended team member${latestTechnicalAssessment.recommendations.length === 1 ? '' : 's'}`
                            }
                          />

                          <Chip
                            size="small"
                            variant="outlined"
                            label={
                              `${latestTechnicalAssessment.documents.length} document${latestTechnicalAssessment.documents.length === 1 ? '' : 's'}`
                            }
                          />
                        </Stack>


                        {canReviewTechnicalAssessment && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={
                              <CheckCircleRounded />
                            }
                            onClick={
                              openReviewAssessmentDialog
                            }
                            sx={{
                              alignSelf:
                                'flex-start',
                            }}
                          >
                            Review Technical Assessment
                          </Button>
                        )}


                        {latestTechnicalAssessment
                          .status ===
                          'REVIEWED' &&
                          latestTechnicalAssessment
                            .review_notes && (
                          <Alert
                            severity="success"
                            variant="outlined"
                          >
                            {
                              latestTechnicalAssessment
                                .review_notes
                            }
                          </Alert>
                        )}


                        {canRequestTechnicalAssessment &&
                          latestTechnicalAssessment
                            .status ===
                            'REVIEWED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              <AddRounded />
                            }
                            onClick={
                              openAssessmentDialog
                            }
                            sx={{
                              alignSelf:
                                'flex-start',
                            }}
                          >
                            Request New Assessment
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Card>
              )}


              {/*
                FINANCIAL ASSESSMENT
              */}

              {canManageFinancialAssessment && (
                <Card
                  variant="outlined"
                  sx={{
                    gridColumn: {
                      lg:
                        'span 6',
                    },

                    borderRadius:
                      '12px',

                    borderColor:
                      '#e4e8ef',

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
                          1.5,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color:
                              '#172033',

                            fontSize:
                              16,

                            fontWeight:
                              700,
                          }}
                        >
                          Financial Assessment
                        </Typography>

                        <Typography
                          sx={{
                            mt:
                              0.25,

                            color:
                              '#7a8699',

                            fontSize:
                              12,
                          }}
                        >
                          Cost, budget and financial viability assessment
                        </Typography>
                      </Box>


                      {latestFinancialAssessment && (
                        <Chip
                          size="small"
                          label={
                            latestFinancialAssessment
                              .status_display
                          }
                          color={
                            getFinancialAssessmentColor(
                              latestFinancialAssessment
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
                    {financialAssessmentLoadError && (
                      <Alert
                        severity="warning"
                        sx={{
                          mb:
                            2,
                        }}
                      >
                        {financialAssessmentLoadError}
                      </Alert>
                    )}


                    {!latestFinancialAssessment ? (
                      <>
                        {!latestTechnicalAssessment ? (
                          <Alert
                            severity="info"
                            variant="outlined"
                          >
                            A technical assessment must be completed and reviewed before a financial assessment can be requested.
                          </Alert>
                        ) : latestTechnicalAssessment
                            .status !==
                          'REVIEWED' ? (
                          <Alert
                            severity="info"
                            variant="outlined"
                          >
                            The latest technical assessment must be reviewed before requesting a financial assessment.
                          </Alert>
                        ) : (
                          <>
                            <Typography
                              sx={{
                                color:
                                  '#667085',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,
                              }}
                            >
                              The technical assessment has been reviewed. This lead is ready for financial feasibility assessment.
                            </Typography>


                            <Button
                              size="small"
                              variant="contained"
                              startIcon={
                                <AddRounded />
                              }
                              onClick={
                                openFinancialAssessmentDialog
                              }
                              disabled={
                                financialOfficers.length ===
                                0
                              }
                              sx={{
                                mt:
                                  2,
                              }}
                            >
                              Request Financial Assessment
                            </Button>


                            {financialOfficers.length ===
                              0 && (
                              <Alert
                                severity="warning"
                                variant="outlined"
                                sx={{
                                  mt:
                                    2,
                                }}
                              >
                                No active Financial Officer accounts are available. Create a Financial Officer user first.
                              </Alert>
                            )}
                          </>
                        )}
                      </>
                    ) : (
                      <Stack
                        spacing={2}
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
                            label="Assigned Financial Officer"
                            value={
                              latestFinancialAssessment
                                .assigned_to_name
                            }
                          />

                          <InformationItem
                            label="Requested By"
                            value={
                              latestFinancialAssessment
                                .requested_by_name
                            }
                          />

                          <InformationItem
                            label="Technical Assessment"
                            value={
                              `#${latestFinancialAssessment.technical_assessment}`
                            }
                          />

                          <InformationItem
                            label="Requested"
                            value={
                              formatDate(
                                latestFinancialAssessment
                                  .created_at,
                              )
                            }
                          />

                          {latestFinancialAssessment
                            .submitted_at && (
                            <InformationItem
                              label="Submitted"
                              value={
                                formatDate(
                                  latestFinancialAssessment
                                    .submitted_at,
                                )
                              }
                            />
                          )}

                          {latestFinancialAssessment
                            .reviewed_at && (
                            <InformationItem
                              label="Reviewed"
                              value={
                                formatDate(
                                  latestFinancialAssessment
                                    .reviewed_at,
                                )
                              }
                            />
                          )}

                          {latestFinancialAssessment
                            .reviewed_by_name && (
                            <InformationItem
                              label="Reviewed By"
                              value={
                                latestFinancialAssessment
                                  .reviewed_by_name
                              }
                            />
                          )}
                        </Box>


                        <Box>
                          <Typography
                            sx={{
                              color:
                                '#7a8699',

                              fontSize:
                                11,

                              fontWeight:
                                600,

                              textTransform:
                                'uppercase',

                              letterSpacing:
                                '0.04em',
                            }}
                          >
                            Requirements
                          </Typography>

                          <Box
                            sx={{
                              mt:
                                0.8,

                              p:
                                1.5,

                              border:
                                '1px solid #e4e8ef',

                              borderRadius:
                                '8px',

                              bgcolor:
                                '#fafbfc',
                            }}
                          >
                            <Typography
                              sx={{
                                color:
                                  '#475467',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {
                                latestFinancialAssessment
                                  .requirements
                              }
                            </Typography>
                          </Box>
                        </Box>


                        {latestFinancialAssessment
                          .financial_comments && (
                          <Box>
                            <Typography
                              sx={{
                                color:
                                  '#7a8699',

                                fontSize:
                                  11,

                                fontWeight:
                                  600,

                                textTransform:
                                  'uppercase',

                                letterSpacing:
                                  '0.04em',
                              }}
                            >
                              Financial Findings
                            </Typography>

                            <Box
                              sx={{
                                mt:
                                  0.8,

                                p:
                                  1.5,

                                border:
                                  '1px solid #e4e8ef',

                                borderRadius:
                                  '8px',

                                bgcolor:
                                  '#fafbfc',
                              }}
                            >
                              <Typography
                                sx={{
                                  color:
                                    '#475467',

                                  fontSize:
                                    13,

                                  lineHeight:
                                    1.55,

                                  whiteSpace:
                                    'pre-wrap',
                                }}
                              >
                                {
                                  latestFinancialAssessment
                                    .financial_comments
                                }
                              </Typography>
                            </Box>
                          </Box>
                        )}


                        <Chip
                          size="small"
                          variant="outlined"
                          label={
                            `${latestFinancialAssessment.documents.length} financial document${latestFinancialAssessment.documents.length === 1 ? '' : 's'}`
                          }
                          sx={{
                            alignSelf:
                              'flex-start',
                          }}
                        />


                        {canReviewFinancialAssessment && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={
                              <CheckCircleRounded />
                            }
                            onClick={
                              openReviewFinancialDialog
                            }
                            sx={{
                              alignSelf:
                                'flex-start',
                            }}
                          >
                            Review Financial Assessment
                          </Button>
                        )}


                        {latestFinancialAssessment
                          .status ===
                          'REVIEWED' &&
                          latestFinancialAssessment
                            .review_notes && (
                          <Alert
                            severity="success"
                            variant="outlined"
                          >
                            {
                              latestFinancialAssessment
                                .review_notes
                            }
                          </Alert>
                        )}


                        {canRequestFinancialAssessment &&
                          latestFinancialAssessment
                            .status ===
                            'REVIEWED' && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              <AddRounded />
                            }
                            onClick={
                              openFinancialAssessmentDialog
                            }
                            sx={{
                              alignSelf:
                                'flex-start',
                            }}
                          >
                            Request New Financial Assessment
                          </Button>
                        )}
                      </Stack>
                    )}
                  </Box>
                </Card>
              )}


              {lead.status ===
                'LOST' && (
                <Card
                  variant="outlined"
                  sx={{
                    gridColumn: {
                      lg:
                        '1 / -1',
                    },

                    borderRadius:
                      '12px',

                    borderColor:
                      '#fecdca',
                  }}
                >
                  <Box
                    sx={{
                      p:
                        2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        mb:
                          1.25,

                        color:
                          '#172033',

                        fontSize:
                          15,

                        fontWeight:
                          700,
                      }}
                    >
                      Lost Lead Reason
                    </Typography>

                    <Alert
                      severity="error"
                    >
                      {lead.lost_reason}
                    </Alert>
                  </Box>
                </Card>
              )}
            </Box>
          </Box>
        )}



        {/*
          COMMUNICATIONS TAB
        */}

        {activeTab ===
          'communications' && (
          <Stack
            spacing={2.5}
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
                      '#172033',

                    fontSize:
                      21,

                    fontWeight:
                      700,
                  }}
                >
                  Communication History
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.35,

                    color:
                      'text.secondary',

                    fontSize:
                      13,
                  }}
                >
                  Interactions recorded for {lead.contact_name}.
                </Typography>
              </Box>


              {canAddCommunication && (
                <Button
                  variant="contained"
                  startIcon={
                    <AddRounded />
                  }
                  onClick={
                    openCommunicationDialog
                  }
                >
                  Add Communication
                </Button>
              )}
            </Stack>


            <Stack
              direction={{
                xs:
                  'column',

                sm:
                  'row',
              }}
              spacing={1}
              sx={{
                alignItems: {
                  sm:
                    'center',
                },
              }}
            >
              <FilterListRounded
                fontSize="small"
              />

              {(
                [
                  [
                    'ALL',
                    'All',
                  ],

                  [
                    'CALL',
                    'Calls',
                  ],

                  [
                    'EMAIL',
                    'Emails',
                  ],

                  [
                    'MEETING',
                    'Meetings',
                  ],

                  [
                    'WHATSAPP',
                    'WhatsApp',
                  ],
                ] as const
              ).map(
                ([
                  value,
                  label,
                ]) => (
                  <Button
                    key={
                      value
                    }
                    size="small"
                    variant={
                      communicationFilter ===
                      value
                        ? 'outlined'
                        : 'text'
                    }
                    onClick={() =>
                      setCommunicationFilter(
                        value,
                      )
                    }
                  >
                    {label}
                  </Button>
                ),
              )}
            </Stack>


            {filteredCommunications.length ===
            0 ? (
              <Card
                variant="outlined"
                sx={{
                  p:
                    5,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  sx={{
                    fontWeight:
                      600,
                  }}
                >
                  No communications found
                </Typography>
              </Card>
            ) : (
              <Stack
                spacing={1.5}
              >
                {filteredCommunications.map(
                  (
                    communication,
                  ) => (
                    <Card
                      key={
                        communication.id
                      }
                      variant="outlined"
                      sx={{
                        p:
                          2.25,

                        borderRadius:
                          '12px',

                        borderColor:
                          '#e4e8ef',
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.75}
                      >
                        <Avatar
                          sx={{
                            bgcolor:
                              '#eef4ff',

                            color:
                              '#1557d5',

                            width:
                              40,

                            height:
                              40,
                          }}
                        >
                          {getCommunicationIcon(
                            communication.communication_type,
                          )}
                        </Avatar>


                        <Box
                          sx={{
                            flex:
                              1,
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              alignItems:
                                'center',

                              flexWrap:
                                'wrap',

                              mb:
                                0.75,
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                communication.communication_type_display
                              }
                              variant="outlined"
                            />

                            <Typography
                              sx={{
                                fontSize:
                                  14,

                                fontWeight:
                                  600,
                              }}
                            >
                              {communication.summary}
                            </Typography>
                          </Stack>


                          {communication.notes && (
                            <Typography
                              sx={{
                                mb:
                                  1,

                                color:
                                  'text.secondary',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {communication.notes}
                            </Typography>
                          )}


                          <Typography
                            sx={{
                              color:
                                '#98a2b3',

                              fontSize:
                                11.5,
                            }}
                          >
                            {communication.created_by_name}
                            {' • '}
                            {formatDate(
                              communication.communication_date,
                            )}
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  ),
                )}
              </Stack>
            )}
          </Stack>
        )}


        {/*
          FOLLOW-UPS TAB
        */}

        {activeTab ===
          'follow-ups' && (
          <Stack
            spacing={2.5}
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
                  2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    color:
                      '#172033',

                    fontSize:
                      21,

                    fontWeight:
                      700,
                  }}
                >
                  Follow-ups
                </Typography>

                <Typography
                  sx={{
                    mt:
                      0.35,

                    color:
                      'text.secondary',

                    fontSize:
                      13,
                  }}
                >
                  Scheduled actions for this lead.
                </Typography>
              </Box>


              {canScheduleFollowUp && (
                <Button
                  variant="contained"
                  startIcon={
                    <EventRounded />
                  }
                  onClick={
                    openFollowUpDialog
                  }
                >
                  Schedule Follow-up
                </Button>
              )}
            </Stack>


            {followUps.length ===
            0 ? (
              <Card
                variant="outlined"
                sx={{
                  p:
                    5,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  sx={{
                    fontWeight:
                      600,
                  }}
                >
                  No follow-ups yet
                </Typography>
              </Card>
            ) : (
              <Stack
                spacing={1.5}
              >
                {followUps.map(
                  (
                    followUp,
                  ) => (
                    <Card
                      key={
                        followUp.id
                      }
                      variant="outlined"
                      onClick={() =>
                        navigate(
                          `/follow-ups/${followUp.id}`,
                        )
                      }
                      sx={{
                        p:
                          2.25,

                        cursor:
                          'pointer',

                        borderRadius:
                          '12px',

                        borderColor:
                          '#e4e8ef',

                        '&:hover':
                          {
                            borderColor:
                              '#b8c7e7',

                            bgcolor:
                              '#fafcff',
                          },
                      }}
                    >
                      <Stack
                        direction="row"
                        sx={{
                          justifyContent:
                            'space-between',

                          gap:
                            2,
                        }}
                      >
                        <Box>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              alignItems:
                                'center',

                              mb:
                                0.75,
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                getFollowUpLabel(
                                  followUp,
                                )
                              }
                              color={
                                getFollowUpColor(
                                  followUp,
                                )
                              }
                              variant="outlined"
                            />

                            <Typography
                              sx={{
                                fontSize:
                                  14,

                                fontWeight:
                                  600,
                              }}
                            >
                              {followUp.title}
                            </Typography>
                          </Stack>


                          {followUp.description && (
                            <Typography
                              sx={{
                                mb:
                                  1,

                                color:
                                  'text.secondary',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,
                              }}
                            >
                              {followUp.description}
                            </Typography>
                          )}


                          <Typography
                            sx={{
                              color:
                                '#98a2b3',

                              fontSize:
                                11.5,
                            }}
                          >
                            Due: {formatDate(
                              followUp.due_date,
                            )}
                            {' • '}
                            Assigned to: {followUp.assigned_to_name || 'Unassigned'}
                          </Typography>
                        </Box>


                        <IconButton>
                          <EventRounded />
                        </IconButton>
                      </Stack>
                    </Card>
                  ),
                )}
              </Stack>
            )}
          </Stack>
        )}


        {/*
          ACTIVITY TAB
        */}

        {activeTab ===
          'activity' && (
          <Stack
            spacing={2.5}
          >
            <Box>
              <Typography
                sx={{
                  color:
                    '#172033',

                  fontSize:
                    21,

                  fontWeight:
                    700,
                }}
              >
                Lead Activity
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.35,

                  color:
                    'text.secondary',

                  fontSize:
                    13,
                }}
              >
                Communications and follow-up activity for this lead.
              </Typography>
            </Box>


            {activityItems.length ===
            0 ? (
              <Card
                variant="outlined"
                sx={{
                  p:
                    5,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  color="text.secondary"
                >
                  No activity has been recorded yet.
                </Typography>
              </Card>
            ) : (
              <Box
                sx={{
                  position:
                    'relative',

                  '&::before':
                    {
                      content:
                        '""',

                      position:
                        'absolute',

                      left:
                        20,

                      top:
                        20,

                      bottom:
                        20,

                      width:
                        '1px',

                      bgcolor:
                        'divider',
                    },
                }}
              >
                <Stack
                  spacing={1.75}
                >
                  {activityItems.map(
                    (
                      item,
                    ) => (
                      <Stack
                        key={
                          item.id
                        }
                        direction="row"
                        spacing={1.75}
                        sx={{
                          position:
                            'relative',

                          alignItems:
                            'flex-start',
                        }}
                      >
                        <Avatar
                          sx={{
                            zIndex:
                              1,

                            width:
                              40,

                            height:
                              40,

                            bgcolor:
                              item.type ===
                              'COMMUNICATION'
                                ? '#eef4ff'
                                : '#ecfdf3',

                            color:
                              item.type ===
                              'COMMUNICATION'
                                ? '#1557d5'
                                : '#039855',
                          }}
                        >
                          {item.type ===
                          'COMMUNICATION'
                            ? getCommunicationIcon(
                                item.communicationType ??
                                  'CALL',
                              )
                            : (
                                <EventRounded
                                  fontSize="small"
                                />
                              )}
                        </Avatar>


                        <Card
                          variant="outlined"
                          sx={{
                            flex:
                              1,

                            p:
                              2.25,

                            borderRadius:
                              '12px',

                            borderColor:
                              '#e4e8ef',
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              alignItems:
                                'center',

                              flexWrap:
                                'wrap',

                              mb:
                                0.75,
                            }}
                          >
                            <Chip
                              size="small"
                              label={
                                item.type ===
                                'COMMUNICATION'
                                  ? 'Communication'
                                  : 'Follow-up'
                              }
                              variant="outlined"
                            />

                            <Typography
                              sx={{
                                fontSize:
                                  14,

                                fontWeight:
                                  600,
                              }}
                            >
                              {item.title}
                            </Typography>
                          </Stack>


                          {item.description && (
                            <Typography
                              sx={{
                                mb:
                                  1,

                                color:
                                  'text.secondary',

                                fontSize:
                                  13,

                                lineHeight:
                                  1.55,

                                whiteSpace:
                                  'pre-wrap',
                              }}
                            >
                              {item.description}
                            </Typography>
                          )}


                          <Typography
                            sx={{
                              color:
                                '#98a2b3',

                              fontSize:
                                11.5,
                            }}
                          >
                            {item.performedBy}
                            {' • '}
                            {formatDate(
                              item.date,
                            )}
                          </Typography>
                        </Card>
                      </Stack>
                    ),
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        )}


        {/*
          HISTORY TAB
        */}

        {activeTab ===
          'history' && (
          <Stack
            spacing={2.5}
          >
            <Box>
              <Typography
                sx={{
                  color:
                    '#172033',

                  fontSize:
                    21,

                  fontWeight:
                    700,
                }}
              >
                Lead History
              </Typography>

              <Typography
                sx={{
                  mt:
                    0.35,

                  color:
                    'text.secondary',

                  fontSize:
                    13,
                }}
              >
                Permanent record of assignment, status, qualification and lead information changes.
              </Typography>
            </Box>


            {history.length ===
            0 ? (
              <Card
                variant="outlined"
                sx={{
                  p:
                    5,

                  textAlign:
                    'center',
                }}
              >
                <Typography
                  color="text.secondary"
                >
                  No lead history has been recorded.
                </Typography>
              </Card>
            ) : (
              <Box
                sx={{
                  position:
                    'relative',

                  '&::before':
                    {
                      content:
                        '""',

                      position:
                        'absolute',

                      left:
                        20,

                      top:
                        20,

                      bottom:
                        20,

                      width:
                        '1px',

                      bgcolor:
                        'divider',
                    },
                }}
              >
                <Stack
                  spacing={1.75}
                >
                  {history.map(
                    (
                      historyItem,
                    ) => {
                      const supportingText =
                        getHistorySupportingText(
                          historyItem,
                        )

                      return (
                        <Stack
                          key={
                            historyItem.id
                          }
                          direction="row"
                          spacing={1.75}
                          sx={{
                            position:
                              'relative',

                            alignItems:
                              'flex-start',
                          }}
                        >
                          <Avatar
                            sx={{
                              zIndex:
                                1,

                              width:
                                40,

                              height:
                                40,

                              bgcolor:
                                getHistoryBackground(
                                  historyItem.event_type,
                                ),

                              color:
                                'common.white',
                            }}
                          >
                            {getHistoryIcon(
                              historyItem.event_type,
                            )}
                          </Avatar>


                          <Card
                            variant="outlined"
                            sx={{
                              flex:
                                1,

                              p:
                                2.25,

                              borderRadius:
                                '12px',

                              borderColor:
                                '#e4e8ef',

                              boxShadow:
                                'none',
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                alignItems:
                                  'center',

                                flexWrap:
                                  'wrap',

                                mb:
                                  0.75,
                              }}
                            >
                              <Chip
                                size="small"
                                label={
                                  historyItem.event_type_display
                                }
                                color={
                                  getHistoryColor(
                                    historyItem.event_type,
                                  )
                                }
                                variant="outlined"
                              />

                              <Typography
                                sx={{
                                  fontSize:
                                    14,

                                  fontWeight:
                                    600,
                                }}
                              >
                                {historyItem.description}
                              </Typography>
                            </Stack>


                            {supportingText && (
                              <Typography
                                sx={{
                                  mb:
                                    1,

                                  color:
                                    'text.secondary',

                                  fontSize:
                                    13,

                                  lineHeight:
                                    1.55,

                                  whiteSpace:
                                    'pre-wrap',
                                }}
                              >
                                {supportingText}
                              </Typography>
                            )}


                            <Stack
                              direction={{
                                xs:
                                  'column',

                                sm:
                                  'row',
                              }}
                              spacing={{
                                xs:
                                  0.5,

                                sm:
                                  2,
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  alignItems:
                                    'center',

                                  color:
                                    'text.secondary',
                                }}
                              >
                                <PersonOutlineRounded
                                  sx={{
                                    fontSize:
                                      16,
                                  }}
                                />

                                <Typography
                                  sx={{
                                    fontSize:
                                      11.5,
                                  }}
                                >
                                  {historyItem.performed_by_name
                                    ? `Performed by ${historyItem.performed_by_name}`
                                    : 'System event'}
                                </Typography>
                              </Stack>


                              <Stack
                                direction="row"
                                spacing={0.75}
                                sx={{
                                  alignItems:
                                    'center',

                                  color:
                                    'text.secondary',
                                }}
                              >
                                <CalendarTodayRounded
                                  sx={{
                                    fontSize:
                                      15,
                                  }}
                                />

                                <Typography
                                  sx={{
                                    fontSize:
                                      11.5,
                                  }}
                                >
                                  {formatDate(
                                    historyItem.created_at,
                                  )}
                                </Typography>
                              </Stack>
                            </Stack>
                          </Card>
                        </Stack>
                      )
                    },
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        )}


        {/*
          EDIT LEAD DIALOG
        */}

        <Dialog
          open={
            editLeadDialogOpen
          }
          onClose={
            closeEditLeadDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Edit Lead
          </DialogTitle>

          <DialogContent>
            <Stack
              spacing={2}
              sx={{
                mt:
                  1,
              }}
            >
              {editLeadError && (
                <Alert
                  severity="error"
                >
                  {editLeadError}
                </Alert>
              )}

              <TextField
                required
                label="Contact name"
                value={
                  editLeadForm.contactName
                }
                onChange={(
                  event,
                ) =>
                  setEditLeadForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      contactName:
                        event.target.value,
                    }),
                  )
                }
              />

              <TextField
                required
                label="Company"
                value={
                  editLeadForm.companyName
                }
                onChange={(
                  event,
                ) =>
                  setEditLeadForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      companyName:
                        event.target.value,
                    }),
                  )
                }
              />

              <TextField
                type="email"
                label="Email"
                value={
                  editLeadForm.email
                }
                onChange={(
                  event,
                ) =>
                  setEditLeadForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      email:
                        event.target.value,
                    }),
                  )
                }
              />

              <TextField
                required
                label="Phone"
                value={
                  editLeadForm.phone
                }
                onChange={(
                  event,
                ) =>
                  setEditLeadForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      phone:
                        event.target.value,
                    }),
                  )
                }
              />

              <TextField
                label="Lead source"
                value={
                  editLeadForm.source
                }
                onChange={(
                  event,
                ) =>
                  setEditLeadForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      source:
                        event.target.value,
                    }),
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
                closeEditLeadDialog
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleSaveLead()
              }
              disabled={
                isSavingLead
              }
            >
              {isSavingLead
                ? (
                    <CircularProgress
                      size={22}
                      color="inherit"
                    />
                  )
                : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          QUALIFICATION DIALOG
        */}

        <Dialog
          open={
            qualificationDialogOpen
          }
          onClose={
            closeQualificationDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            {qualificationAction ===
            'QUALIFY'
              ? 'Qualify Lead'
              : 'Disqualify Lead'}
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2}
              sx={{
                mt:
                  1,
              }}
            >
              {qualificationError && (
                <Alert
                  severity="error"
                >
                  {qualificationError}
                </Alert>
              )}

              <TextField
                required
                multiline
                minRows={5}
                label={
                  qualificationAction ===
                  'QUALIFY'
                    ? 'Qualification notes'
                    : 'Disqualification reason'
                }
                value={
                  qualificationNotes
                }
                onChange={(
                  event,
                ) =>
                  setQualificationNotes(
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
                closeQualificationDialog
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color={
                qualificationAction ===
                  'QUALIFY'
                  ? 'success'
                  : 'error'
              }
              onClick={() =>
                void handleQualificationDecision()
              }
              disabled={
                isSavingQualification ||
                !qualificationNotes.trim()
              }
            >
              {isSavingQualification
                ? (
                    <CircularProgress
                      size={22}
                      color="inherit"
                    />
                  )
                : qualificationAction ===
                  'QUALIFY'
                  ? 'Confirm Qualification'
                  : 'Confirm Disqualification'}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          COMMUNICATION DIALOG
        */}

        <Dialog
          open={
            communicationDialogOpen
          }
          onClose={
            closeCommunicationDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            <Stack
              direction="row"
              sx={{
                justifyContent:
                  'space-between',

                alignItems:
                  'center',
              }}
            >
              <Typography
                sx={{
                  fontSize:
                    18,

                  fontWeight:
                    700,
                }}
              >
                Add Communication
              </Typography>

              <IconButton
                onClick={
                  closeCommunicationDialog
                }
              >
                <CloseRounded />
              </IconButton>
            </Stack>
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {communicationError && (
                <Alert
                  severity="error"
                >
                  {communicationError}
                </Alert>
              )}


              <Card
                variant="outlined"
                sx={{
                  p:
                    2,

                  borderRadius:
                    '10px',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.5}
                  sx={{
                    alignItems:
                      'center',
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor:
                        '#eef4ff',

                      color:
                        '#1557d5',
                    }}
                  >
                    {getLeadInitials(
                      lead.contact_name,
                    )}
                  </Avatar>

                  <Box>
                    <Typography
                      sx={{
                        fontWeight:
                          600,
                      }}
                    >
                      {lead.contact_name}
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{
                        alignItems:
                          'center',
                      }}
                    >
                      <BusinessRounded
                        sx={{
                          fontSize:
                            15,

                          color:
                            '#7a8699',
                        }}
                      />

                      <Typography
                        sx={{
                          color:
                            'text.secondary',

                          fontSize:
                            12.5,
                        }}
                      >
                        {lead.company_name}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Card>


              <FormControl
                fullWidth
              >
                <InputLabel>
                  Communication Type
                </InputLabel>

                <Select
                  value={
                    communicationForm.communicationType
                  }
                  label="Communication Type"
                  onChange={(
                    event,
                  ) =>
                    setCommunicationForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        communicationType:
                          event.target.value as CommunicationType,
                      }),
                    )
                  }
                >
                  <MenuItem value="CALL">
                    Call
                  </MenuItem>

                  <MenuItem value="EMAIL">
                    Email
                  </MenuItem>

                  <MenuItem value="MEETING">
                    Meeting
                  </MenuItem>

                  <MenuItem value="WHATSAPP">
                    WhatsApp
                  </MenuItem>
                </Select>
              </FormControl>


              <Stack
                direction={{
                  xs:
                    'column',

                  sm:
                    'row',
                }}
                spacing={2}
              >
                <TextField
                  fullWidth
                  type="date"
                  label="Date"
                  value={
                    communicationForm.communicationDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setCommunicationForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        communicationDate:
                          event.target.value,
                      }),
                    )
                  }
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />

                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  value={
                    communicationForm.communicationTime
                  }
                  onChange={(
                    event,
                  ) =>
                    setCommunicationForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        communicationTime:
                          event.target.value,
                      }),
                    )
                  }
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />
              </Stack>


              <TextField
                required
                label="Subject / Title"
                value={
                  communicationForm.summary
                }
                onChange={(
                  event,
                ) =>
                  setCommunicationForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      summary:
                        event.target.value,
                    }),
                  )
                }
              />


              <TextField
                multiline
                minRows={5}
                label="Communication Details"
                value={
                  communicationForm.notes
                }
                onChange={(
                  event,
                ) =>
                  setCommunicationForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      notes:
                        event.target.value,
                    }),
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
                closeCommunicationDialog
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleCreateCommunication()
              }
              disabled={
                isCreatingCommunication ||
                !communicationForm
                  .summary
                  .trim()
              }
            >
              {isCreatingCommunication
                ? (
                    <CircularProgress
                      size={22}
                      color="inherit"
                    />
                  )
                : 'Save Communication'}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          FOLLOW-UP DIALOG
        */}

        <Dialog
          open={
            followUpDialogOpen
          }
          onClose={
            closeFollowUpDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Schedule Follow-up
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {followUpError && (
                <Alert
                  severity="error"
                >
                  {followUpError}
                </Alert>
              )}


              <TextField
                required
                label="Title"
                value={
                  followUpForm.title
                }
                onChange={(
                  event,
                ) =>
                  setFollowUpForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      title:
                        event.target.value,
                    }),
                  )
                }
              />


              <TextField
                required
                type="datetime-local"
                label="Due date and time"
                value={
                  followUpForm.dueDate
                }
                onChange={(
                  event,
                ) =>
                  setFollowUpForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      dueDate:
                        event.target.value,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
                  },
                }}
              />


              <TextField
                multiline
                minRows={5}
                label="Description"
                value={
                  followUpForm.description
                }
                onChange={(
                  event,
                ) =>
                  setFollowUpForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      description:
                        event.target.value,
                    }),
                  )
                }
              />


              <Alert
                severity="info"
                variant="outlined"
              >
                The follow-up will be assigned to the Sales Representative responsible for this lead.
              </Alert>
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
                closeFollowUpDialog
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleCreateFollowUp()
              }
              disabled={
                isCreatingFollowUp ||
                !followUpForm
                  .title
                  .trim() ||
                !followUpForm
                  .dueDate
              }
            >
              {isCreatingFollowUp
                ? (
                    <CircularProgress
                      size={22}
                      color="inherit"
                    />
                  )
                : 'Schedule Follow-up'}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          REQUEST TECHNICAL ASSESSMENT DIALOG
        */}

        <Dialog
          open={
            assessmentDialogOpen
          }
          onClose={
            closeAssessmentDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Request Technical Assessment
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {assessmentError && (
                <Alert
                  severity="error"
                >
                  {assessmentError}
                </Alert>
              )}


              <Alert
                severity="info"
                variant="outlined"
              >
                This request will be assigned to a Tech Lead for technical feasibility assessment.
              </Alert>


              <FormControl
                fullWidth
                required
              >
                <InputLabel>
                  Tech Lead
                </InputLabel>

                <Select
                  value={
                    selectedTechLeadId
                  }
                  label="Tech Lead"
                  onChange={(
                    event,
                  ) =>
                    setSelectedTechLeadId(
                      event.target.value,
                    )
                  }
                >
                  {techLeads.map(
                    (
                      techLead,
                    ) => (
                      <MenuItem
                        key={
                          techLead.id
                        }
                        value={
                          String(
                            techLead.id,
                          )
                        }
                      >
                        {techLead.full_name}
                        {' ('}
                        {techLead.username}
                        {')'}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>


              <TextField
                required
                multiline
                minRows={6}
                label="Technical assessment requirements"
                placeholder="Describe the proposed solution, technical scope, constraints, risks, integrations and resource requirements that should be assessed."
                value={
                  assessmentRequirements
                }
                onChange={(
                  event,
                ) =>
                  setAssessmentRequirements(
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
                closeAssessmentDialog
              }
              disabled={
                isCreatingAssessment
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleCreateTechnicalAssessment()
              }
              disabled={
                isCreatingAssessment ||
                !selectedTechLeadId ||
                !assessmentRequirements
                  .trim()
              }
            >
              {isCreatingAssessment ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Request Assessment'
              )}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          REVIEW TECHNICAL ASSESSMENT DIALOG
        */}

        <Dialog
          open={
            reviewAssessmentDialogOpen
          }
          onClose={
            closeReviewAssessmentDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Review Technical Assessment
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {reviewAssessmentError && (
                <Alert
                  severity="error"
                >
                  {reviewAssessmentError}
                </Alert>
              )}


              <Alert
                severity="info"
                variant="outlined"
              >
                Review the Tech Lead&apos;s findings before marking this assessment as reviewed.
              </Alert>


              {latestTechnicalAssessment
                ?.technical_comments && (
                <Box
                  sx={{
                    p:
                      2,

                    border:
                      '1px solid #e4e8ef',

                    borderRadius:
                      '10px',

                    bgcolor:
                      '#fafbfc',
                  }}
                >
                  <Typography
                    sx={{
                      mb:
                        0.75,

                      fontSize:
                        12,

                      fontWeight:
                        600,

                      color:
                        '#667085',
                    }}
                  >
                    Technical Findings
                  </Typography>

                  <Typography
                    sx={{
                      fontSize:
                        13,

                      lineHeight:
                        1.55,

                      whiteSpace:
                        'pre-wrap',
                    }}
                  >
                    {
                      latestTechnicalAssessment
                        .technical_comments
                    }
                  </Typography>
                </Box>
              )}


              <TextField
                multiline
                minRows={5}
                label="Review notes"
                placeholder="Record the Sales Manager review notes..."
                value={
                  reviewAssessmentNotes
                }
                onChange={(
                  event,
                ) =>
                  setReviewAssessmentNotes(
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
                closeReviewAssessmentDialog
              }
              disabled={
                isReviewingAssessment
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() =>
                void handleReviewTechnicalAssessment()
              }
              disabled={
                isReviewingAssessment
              }
            >
              {isReviewingAssessment ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Mark as Reviewed'
              )}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          REQUEST FINANCIAL ASSESSMENT DIALOG
        */}

        <Dialog
          open={
            financialAssessmentDialogOpen
          }
          onClose={
            closeFinancialAssessmentDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Request Financial Assessment
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {financialAssessmentError && (
                <Alert
                  severity="error"
                >
                  {financialAssessmentError}
                </Alert>
              )}


              <Alert
                severity="info"
                variant="outlined"
              >
                The reviewed technical assessment will be provided to the Financial Officer as context for financial feasibility assessment.
              </Alert>


              {latestTechnicalAssessment && (
                <Card
                  variant="outlined"
                  sx={{
                    p:
                      2,

                    borderRadius:
                      '10px',

                    bgcolor:
                      '#fafbfc',
                  }}
                >
                  <Typography
                    sx={{
                      color:
                        '#667085',

                      fontSize:
                        11.5,

                      fontWeight:
                        600,
                    }}
                  >
                    TECHNICAL ASSESSMENT
                  </Typography>

                  <Typography
                    sx={{
                      mt:
                        0.4,

                      color:
                        '#172033',

                      fontSize:
                        13,

                      fontWeight:
                        600,
                    }}
                  >
                    Assessment #{latestTechnicalAssessment.id}
                    {' • '}
                    {latestTechnicalAssessment.status_display}
                  </Typography>

                  {latestTechnicalAssessment
                    .technical_comments && (
                    <Typography
                      sx={{
                        mt:
                          1,

                        color:
                          '#667085',

                        fontSize:
                          12.5,

                        lineHeight:
                          1.55,

                        whiteSpace:
                          'pre-wrap',
                      }}
                    >
                      {
                        latestTechnicalAssessment
                          .technical_comments
                      }
                    </Typography>
                  )}
                </Card>
              )}


              <FormControl
                fullWidth
                required
              >
                <InputLabel>
                  Financial Officer
                </InputLabel>

                <Select
                  value={
                    selectedFinancialOfficerId
                  }
                  label="Financial Officer"
                  onChange={(
                    event,
                  ) =>
                    setSelectedFinancialOfficerId(
                      event.target.value,
                    )
                  }
                >
                  {financialOfficers.map(
                    (
                      officer,
                    ) => (
                      <MenuItem
                        key={
                          officer.id
                        }
                        value={
                          String(
                            officer.id,
                          )
                        }
                      >
                        {officer.full_name}
                        {' ('}
                        {officer.username}
                        {')'}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>


              <TextField
                required
                multiline
                minRows={8}
                label="Financial assessment requirements"
                value={
                  financialAssessmentRequirements
                }
                onChange={(
                  event,
                ) =>
                  setFinancialAssessmentRequirements(
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
                closeFinancialAssessmentDialog
              }
              disabled={
                isCreatingFinancialAssessment
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              onClick={() =>
                void handleCreateFinancialAssessment()
              }
              disabled={
                isCreatingFinancialAssessment ||
                !selectedFinancialOfficerId ||
                !financialAssessmentRequirements
                  .trim()
              }
            >
              {isCreatingFinancialAssessment ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Request Assessment'
              )}
            </Button>
          </DialogActions>
        </Dialog>


        {/*
          REVIEW FINANCIAL ASSESSMENT DIALOG
        */}

        <Dialog
          open={
            reviewFinancialDialogOpen
          }
          onClose={
            closeReviewFinancialDialog
          }
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Review Financial Assessment
          </DialogTitle>


          <DialogContent>
            <Stack
              spacing={2.5}
              sx={{
                mt:
                  1,
              }}
            >
              {reviewFinancialError && (
                <Alert
                  severity="error"
                >
                  {reviewFinancialError}
                </Alert>
              )}


              <Alert
                severity="info"
                variant="outlined"
              >
                Review the Financial Officer&apos;s findings before marking the assessment as reviewed.
              </Alert>


              {latestFinancialAssessment
                ?.financial_comments && (
                <Box
                  sx={{
                    p:
                      2,

                    border:
                      '1px solid #e4e8ef',

                    borderRadius:
                      '10px',

                    bgcolor:
                      '#fafbfc',
                  }}
                >
                  <Typography
                    sx={{
                      mb:
                        0.75,

                      fontSize:
                        12,

                      fontWeight:
                        600,

                      color:
                        '#667085',
                    }}
                  >
                    Financial Findings
                  </Typography>

                  <Typography
                    sx={{
                      fontSize:
                        13,

                      lineHeight:
                        1.55,

                      whiteSpace:
                        'pre-wrap',
                    }}
                  >
                    {
                      latestFinancialAssessment
                        .financial_comments
                    }
                  </Typography>
                </Box>
              )}


              {latestFinancialAssessment &&
                latestFinancialAssessment
                  .documents.length >
                  0 && (
                <Alert
                  severity="info"
                  variant="outlined"
                >
                  The Financial Officer attached{' '}
                  {
                    latestFinancialAssessment
                      .documents.length
                  } supporting document
                  {
                    latestFinancialAssessment
                      .documents.length ===
                    1
                      ? ''
                      : 's'
                  }.
                </Alert>
              )}


              <TextField
                multiline
                minRows={5}
                label="Review notes"
                placeholder="Record the Sales Manager review notes..."
                value={
                  reviewFinancialNotes
                }
                onChange={(
                  event,
                ) =>
                  setReviewFinancialNotes(
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
                closeReviewFinancialDialog
              }
              disabled={
                isReviewingFinancial
              }
            >
              Cancel
            </Button>

            <Button
              variant="contained"
              color="success"
              onClick={() =>
                void handleReviewFinancialAssessment()
              }
              disabled={
                isReviewingFinancial
              }
            >
              {isReviewingFinancial ? (
                <CircularProgress
                  size={22}
                  color="inherit"
                />
              ) : (
                'Mark as Reviewed'
              )}
            </Button>
          </DialogActions>
        </Dialog>


        <Snackbar
          open={
            Boolean(
              followUpSuccessMessage,
            )
          }
          autoHideDuration={
            5000
          }
          onClose={() =>
            setFollowUpSuccessMessage(
              '',
            )
          }
          anchorOrigin={{
            vertical:
              'top',

            horizontal:
              'right',
          }}
        >
          <Alert
            severity="success"
            onClose={() =>
              setFollowUpSuccessMessage(
                '',
              )
            }
          >
            {followUpSuccessMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  )
}


export default LeadWorkspacePage