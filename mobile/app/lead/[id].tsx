import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  convertLead,
  getLead,
  updateLead,
  type Lead,
  type LeadStatus,
} from '@/services/leads';

import { useAppTheme } from '@/context/ThemeContext';

export default function LeadDetailsScreen() {
  const { colors } = useAppTheme();

  const { id } =
    useLocalSearchParams<{ id: string }>();

  const [lead, setLead] =
    useState<Lead | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isConverting, setIsConverting] =
    useState(false);

  const [isUpdatingStatus, setIsUpdatingStatus] =
    useState(false);

  const [statusModalVisible, setStatusModalVisible] =
    useState(false);

  const [selectedStatus, setSelectedStatus] =
    useState<LeadStatus | null>(null);

  const [lostReason, setLostReason] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  const lifecycleStatuses: LeadStatus[] = [
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'PROPOSAL',
    'LOST',
    'DISQUALIFIED',
  ];

  const loadLead = useCallback(async () => {
    if (!id) {
      setErrorMessage('Lead ID is missing.');
      setIsLoading(false);
      return;
    }

    const leadId = Number(id);

    if (!Number.isInteger(leadId)) {
      setErrorMessage('Invalid lead ID.');
      setIsLoading(false);
      return;
    }

    try {
      setErrorMessage('');

      const data = await getLead(leadId);

      setLead(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load lead details.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadLead();
  }, [loadLead]);

  const getStatusLabel = (
    status: LeadStatus,
  ): string => {
    switch (status) {
      case 'NEW':
        return 'New';

      case 'CONTACTED':
        return 'Contacted';

      case 'QUALIFIED':
        return 'Qualified';

      case 'PROPOSAL':
        return 'Proposal Sent';

      case 'WON':
        return 'Won';

      case 'LOST':
        return 'Lost';

      case 'DISQUALIFIED':
        return 'Disqualified';

      default:
        return status;
    }
  };

  const handleOpenStatusModal = () => {
    if (!lead) {
      return;
    }

    setSelectedStatus(lead.status);
    setLostReason('');
    setErrorMessage('');
    setStatusModalVisible(true);
  };

  const handleCloseStatusModal = () => {
    if (isUpdatingStatus) {
      return;
    }

    setStatusModalVisible(false);
    setSelectedStatus(null);
    setLostReason('');
    setErrorMessage('');
  };

  const handleStatusUpdate = async () => {
    if (!lead || !selectedStatus) {
      return;
    }

    if (
      selectedStatus === 'LOST' &&
      !lostReason.trim()
    ) {
      setErrorMessage(
        'Please provide a reason before marking the lead as lost.',
      );
      return;
    }

    setIsUpdatingStatus(true);
    setErrorMessage('');

    try {
      const updatedLead = await updateLead(
        lead.id,
        {
          status: selectedStatus,
          ...(selectedStatus === 'LOST'
            ? {
                lost_reason:
                  lostReason.trim(),
              }
            : {}),
        },
      );

      setLead(updatedLead);

      setStatusModalVisible(false);
      setSelectedStatus(null);
      setLostReason('');

      Alert.alert(
        'Status Updated',
        `Lead status changed to ${updatedLead.status_display}.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update lead status.',
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConvert = () => {
    if (!lead) {
      return;
    }

    Alert.alert(
      'Convert Lead',
      `Convert ${lead.company_name} into a customer?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Convert',
          style: 'default',
          onPress: () => {
            void performConversion();
          },
        },
      ],
    );
  };

  const performConversion = async () => {
    if (!lead) {
      return;
    }

    setIsConverting(true);
    setErrorMessage('');

    try {
      const result = await convertLead(
        lead.id,
      );

      setLead(result.lead);

      Alert.alert(
        'Conversion Successful',
        `${result.customer.company_name} has been converted into a customer.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to convert this lead.',
      );
    } finally {
      setIsConverting(false);
    }
  };

  const getStatusStyle = (
    status: Lead['status'],
  ) => {
    switch (status) {
      case 'QUALIFIED':
      case 'WON':
        return {
          backgroundColor:
            colors.successBackground,
        };

      case 'LOST':
        return {
          backgroundColor:
            colors.dangerBackground,
        };

      case 'CONTACTED':
      case 'PROPOSAL':
        return {
          backgroundColor:
            colors.warningBackground,
        };

      case 'NEW':
      case 'DISQUALIFIED':
      default:
        return {
          backgroundColor:
            colors.primarySoft,
        };
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text
            style={[
              styles.stateText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            Loading lead details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage && !lead) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View style={styles.errorContainer}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text
              style={[
                styles.backButtonText,
                {
                  color: colors.primary,
                },
              ]}
            >
              ← Back
            </Text>
          </Pressable>

          <View
            style={[
              styles.stateCard,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.errorTitle,
                {
                  color: colors.danger,
                },
              ]}
            >
              Unable to load lead
            </Text>

            <Text
              style={[
                styles.errorText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => {
                setIsLoading(true);
                void loadLead();
              }}
              style={[
                styles.retryButton,
                {
                  backgroundColor:
                    colors.primary,
                },
              ]}
            >
              <Text
                style={styles.retryButtonText}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!lead) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        <View style={styles.centerState}>
          <Text
            style={[
              styles.stateText,
              {
                color:
                  colors.secondaryText,
              },
            ]}
          >
            Lead details are unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isClosedLead =
    lead.status === 'WON' ||
    lead.status === 'LOST';

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text
            style={[
              styles.backButtonText,
              {
                color: colors.primary,
              },
            ]}
          >
            ← Back
          </Text>
        </Pressable>

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor:
                colors.border,
            },
          ]}
        >
          <View
            style={styles.headerTextContainer}
          >
            <Text
              style={[
                styles.companyName,
                {
                  color: colors.text,
                },
              ]}
            >
              {lead.company_name}
            </Text>

            <Text
              style={[
                styles.contactName,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              {lead.contact_name}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              getStatusStyle(lead.status),
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    colors.statusText,
                },
              ]}
            >
              {lead.status_display}
            </Text>
          </View>
        </View>

        {/* Lifecycle Action */}
        {!isClosedLead ? (
          <View
            style={[
              styles.actionSection,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Lead Status
            </Text>

            <Text
              style={[
                styles.actionDescription,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Update the current stage of this
              lead.
            </Text>

            <Pressable
              onPress={handleOpenStatusModal}
              disabled={
                isUpdatingStatus ||
                isConverting
              }
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor:
                    colors.primary,
                },
                pressed &&
                  !isUpdatingStatus &&
                  !isConverting &&
                  styles.secondaryButtonPressed,
              ]}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  {
                    color:
                      colors.primary,
                  },
                ]}
              >
                Update Lead Status
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Conversion Action */}
        {lead.status !== 'WON' &&
        lead.status !== 'LOST' ? (
          <View
            style={[
              styles.actionSection,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.actionTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Lead Action
            </Text>

            <Text
              style={[
                styles.actionDescription,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Convert this lead into a customer
              once the opportunity is confirmed.
            </Text>

            <Pressable
              onPress={handleConvert}
              disabled={isConverting}
              style={({ pressed }) => [
                styles.convertButton,
                {
                  backgroundColor:
                    colors.primary,
                },
                pressed &&
                  !isConverting &&
                  styles.convertButtonPressed,
                isConverting &&
                  styles.convertButtonDisabled,
              ]}
            >
              {isConverting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={styles.convertButtonText}
                >
                  Convert to Customer
                </Text>
              )}
            </Pressable>

            {errorMessage ? (
              <Text
                style={[
                  styles.actionError,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}
          </View>
        ) : lead.status === 'WON' ? (
          <View
            style={[
              styles.convertedCard,
              {
                backgroundColor:
                  colors.successBackground,
                borderColor:
                  colors.successBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.convertedTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              ✓ Customer Converted
            </Text>

            <Text
              style={[
                styles.convertedDescription,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              This lead has already been converted
              into a customer.
            </Text>

            {lead.converted_at ? (
              <Text
                style={[
                  styles.convertedDate,
                  {
                    color:
                      colors.secondaryText,
                  },
                ]}
              >
                Converted on{' '}
                {formatDate(lead.converted_at)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Lost Lead */}
        {lead.status === 'LOST' ? (
          <View
            style={[
              styles.lostCard,
              {
                backgroundColor:
                  colors.dangerBackground,
                borderColor:
                  colors.dangerBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.lostCardTitle,
                {
                  color: colors.danger,
                },
              ]}
            >
              Lead Lost
            </Text>

            <Text
              style={[
                styles.lostCardText,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              This lead is closed and can no longer
              be progressed through the normal
              lifecycle.
            </Text>
          </View>
        ) : null}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Contact Information
          </Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <InfoRow
              label="Email"
              value={
                lead.email || 'Not provided'
              }
              colors={colors}
            />

            <InfoRow
              label="Phone"
              value={
                lead.phone || 'Not provided'
              }
              colors={colors}
            />

            <InfoRow
              label="Source"
              value={
                lead.source || 'Not provided'
              }
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Qualification */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Qualification
          </Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <InfoRow
              label="Qualification Notes"
              value={
                lead.qualification_notes ||
                'No qualification notes available.'
              }
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Assignment */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Assignment
          </Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <InfoRow
              label="Assigned To"
              value={
                lead.assigned_to_name ||
                lead.assigned_to_username ||
                'Unassigned'
              }
              colors={colors}
            />

            <InfoRow
              label="Created By"
              value={
                lead.created_by_name ||
                lead.created_by_username
              }
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Lead Information */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Lead Information
          </Text>

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  colors.card,
                borderColor:
                  colors.border,
              },
            ]}
          >
            <InfoRow
              label="Created"
              value={formatDate(
                lead.created_at,
              )}
              colors={colors}
            />

            <InfoRow
              label="Last Updated"
              value={formatDate(
                lead.updated_at,
              )}
              colors={colors}
            />

            <InfoRow
              label="Converted"
              value={
                lead.converted_at
                  ? formatDate(
                      lead.converted_at,
                    )
                  : 'Not converted'
              }
              isLast
              colors={colors}
            />
          </View>
        </View>

        {/* Lost Reason */}
        {lead.status === 'LOST' &&
        lead.lost_reason ? (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Lost Reason
            </Text>

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor:
                    colors.card,
                  borderColor:
                    colors.border,
                },
              ]}
            >
              <InfoRow
                label="Reason"
                value={lead.lost_reason}
                isLast
                colors={colors}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Status Modal */}
      {statusModalVisible ? (
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor:
                colors.modalOverlay,
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Update Lead Status
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                {
                  color:
                    colors.secondaryText,
                },
              ]}
            >
              Select the new lifecycle stage.
            </Text>

            <ScrollView
              style={styles.statusOptions}
              showsVerticalScrollIndicator={false}
            >
              {lifecycleStatuses.map(
                (status) => {
                  const isSelected =
                    selectedStatus === status;

                  return (
                    <Pressable
                      key={status}
                      onPress={() => {
                        setSelectedStatus(
                          status,
                        );

                        if (
                          status !== 'LOST'
                        ) {
                          setLostReason('');
                          setErrorMessage('');
                        }
                      }}
                      style={[
                        styles.statusOption,
                        {
                          borderColor:
                            colors.border,
                          backgroundColor:
                            colors.cardSecondary,
                        },
                        isSelected && {
                          backgroundColor:
                            colors.primarySoft,
                          borderColor:
                            colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          {
                            color:
                              colors.statusText,
                          },
                          isSelected && {
                            color:
                              colors.primary,
                          },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </ScrollView>

            {selectedStatus === 'LOST' ? (
              <View
                style={styles.lostReasonContainer}
              >
                <Text
                  style={[
                    styles.lostReasonLabel,
                    {
                      color: colors.text,
                    },
                  ]}
                >
                  Reason for losing this lead
                </Text>

                <TextInput
                  value={lostReason}
                  onChangeText={setLostReason}
                  placeholder="Enter the reason..."
                  placeholderTextColor={
                    colors.placeholder
                  }
                  multiline
                  editable={!isUpdatingStatus}
                  style={[
                    styles.lostReasonInput,
                    {
                      backgroundColor:
                        colors.inputBackground,
                      borderColor:
                        colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>
            ) : null}

            {errorMessage ? (
              <Text
                style={[
                  styles.actionError,
                  {
                    color:
                      colors.danger,
                  },
                ]}
              >
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCloseStatusModal}
                disabled={isUpdatingStatus}
                style={[
                  styles.modalCancelButton,
                  {
                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,
                    {
                      color:
                        colors.statusText,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handleStatusUpdate();
                }}
                disabled={
                  isUpdatingStatus ||
                  !selectedStatus
                }
                style={[
                  styles.modalConfirmButton,
                  {
                    backgroundColor:
                      colors.primary,
                  },
                  (isUpdatingStatus ||
                    !selectedStatus) &&
                    styles.modalConfirmButtonDisabled,
                ]}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={styles.modalConfirmText}
                  >
                    Update
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  isLast = false,
  colors,
}: {
  label: string;
  value: string;
  isLast?: boolean;
  colors: {
    text: string;
    secondaryText: string;
    divider: string;
  };
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !isLast && {
          borderBottomColor:
            colors.divider,
          borderBottomWidth: 1,
        },
      ]}
    >
      <Text
        style={[
          styles.infoLabel,
          {
            color:
              colors.secondaryText,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          {
            color: colors.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 40,
  },

  errorContainer: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
  },

  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    fontSize: 15,
    marginTop: 12,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 18,
  },

  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 14,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },

  headerTextContainer: {
    flex: 1,
  },

  companyName: {
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 7,
  },

  contactName: {
    fontSize: 16,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  actionSection: {
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },

  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },

  secondaryButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonPressed: {
    opacity: 0.7,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },

  convertButton: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  convertButtonPressed: {
    opacity: 0.8,
  },

  convertButtonDisabled: {
    opacity: 0.6,
  },

  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  actionError: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  convertedCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },

  convertedTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  convertedDescription: {
    fontSize: 14,
    lineHeight: 20,
  },

  convertedDate: {
    fontSize: 13,
    marginTop: 8,
  },

  lostCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },

  lostCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  lostCardText: {
    fontSize: 14,
    lineHeight: 20,
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
  },

  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 18,
  },

  infoRow: {
    paddingVertical: 15,
  },

  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },

  infoValue: {
    fontSize: 15,
    lineHeight: 21,
  },

  stateCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
  },

  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 7,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },

  retryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },

  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    maxHeight: '85%',
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 6,
  },

  modalSubtitle: {
    fontSize: 14,
    marginBottom: 18,
  },

  statusOptions: {
    maxHeight: 300,
  },

  statusOption: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },

  statusOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },

  lostReasonContainer: {
    marginTop: 8,
  },

  lostReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  lostReasonInput: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },

  modalCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },

  modalConfirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalConfirmButtonDisabled: {
    opacity: 0.5,
  },

  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});