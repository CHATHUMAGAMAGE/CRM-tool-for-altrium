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
  View,
} from 'react-native';

import {
  convertLead,
  getLead,
  type Lead,
} from '@/services/leads';

export default function LeadDetailsScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const [lead, setLead] =
    useState<Lead | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isConverting, setIsConverting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

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
      case 'CONVERTED':
        return styles.statusSuccess;

      case 'LOST':
        return styles.statusLost;

      case 'CONTACTED':
      case 'FOLLOW_UP_REQUIRED':
      case 'PROPOSAL_SENT':
      case 'NEGOTIATION':
        return styles.statusActive;

      case 'NEW':
      default:
        return styles.statusNew;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator
            size="large"
            color="#1557E8"
          />

          <Text style={styles.stateText}>
            Loading lead details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMessage || !lead) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              ← Back
            </Text>
          </Pressable>

          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>
              Unable to load lead
            </Text>

            <Text style={styles.errorText}>
              {errorMessage ||
                'Lead details are unavailable.'}
            </Text>

            <Pressable
              onPress={() => {
                setIsLoading(true);
                void loadLead();
              }}
              style={styles.retryButton}
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
      >
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            ← Back
          </Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View
            style={styles.headerTextContainer}
          >
            <Text style={styles.companyName}>
              {lead.company_name}
            </Text>

            <Text style={styles.contactName}>
              {lead.contact_name}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              getStatusStyle(lead.status),
            ]}
          >
            <Text style={styles.statusText}>
              {lead.status_display}
            </Text>
          </View>
        </View>

        {/* Conversion Action */}
        {lead.status !== 'CONVERTED' &&
        lead.status !== 'LOST' ? (
          <View style={styles.actionSection}>
            <Text style={styles.actionTitle}>
              Lead Action
            </Text>

            <Text style={styles.actionDescription}>
              Convert this lead into a customer
              once the opportunity is confirmed.
            </Text>

            <Pressable
              onPress={handleConvert}
              disabled={isConverting}
              style={({ pressed }) => [
                styles.convertButton,
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
              <Text style={styles.actionError}>
                {errorMessage}
              </Text>
            ) : null}
          </View>
        ) : lead.status === 'CONVERTED' ? (
          <View style={styles.convertedCard}>
            <Text style={styles.convertedTitle}>
              ✓ Customer Converted
            </Text>

            <Text
              style={styles.convertedDescription}
            >
              This lead has already been converted
              into a customer.
            </Text>

            {lead.converted_at ? (
              <Text style={styles.convertedDate}>
                Converted on{' '}
                {formatDate(lead.converted_at)}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Contact Information
          </Text>

          <View style={styles.infoCard}>
            <InfoRow
              label="Email"
              value={
                lead.email || 'Not provided'
              }
            />

            <InfoRow
              label="Phone"
              value={
                lead.phone || 'Not provided'
              }
            />

            <InfoRow
              label="Source"
              value={
                lead.source || 'Not provided'
              }
              isLast
            />
          </View>
        </View>

        {/* Qualification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Qualification
          </Text>

          <View style={styles.infoCard}>
            <InfoRow
              label="Qualification Notes"
              value={
                lead.qualification_notes ||
                'No qualification notes available.'
              }
              isLast
            />
          </View>
        </View>

        {/* Assignment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Assignment
          </Text>

          <View style={styles.infoCard}>
            <InfoRow
              label="Assigned To"
              value={
                lead.assigned_to_name ||
                lead.assigned_to_username ||
                'Unassigned'
              }
            />

            <InfoRow
              label="Created By"
              value={
                lead.created_by_name ||
                lead.created_by_username
              }
              isLast
            />
          </View>
        </View>

        {/* Lead Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Lead Information
          </Text>

          <View style={styles.infoCard}>
            <InfoRow
              label="Created"
              value={formatDate(
                lead.created_at,
              )}
            />

            <InfoRow
              label="Last Updated"
              value={formatDate(
                lead.updated_at,
              )}
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
            />
          </View>
        </View>

        {/* Lost Reason */}
        {lead.status === 'LOST' &&
        lead.lost_reason ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Lost Reason
            </Text>

            <View style={styles.infoCard}>
              <InfoRow
                label="Reason"
                value={lead.lost_reason}
                isLast
              />
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        !isLast && styles.infoRowBorder,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
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
    backgroundColor: '#FFFFFF',
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
    color: '#6B7280',
    fontSize: 15,
    marginTop: 12,
  },

  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginBottom: 18,
  },

  backButtonText: {
    color: '#1557E8',
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
    borderBottomColor: '#E5E7EB',
  },

  headerTextContainer: {
    flex: 1,
  },

  companyName: {
    color: '#111827',
    fontSize: 27,
    fontWeight: '800',
    marginBottom: 7,
  },

  contactName: {
    color: '#6B7280',
    fontSize: 16,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  statusNew: {
    backgroundColor: '#E8EEFF',
  },

  statusActive: {
    backgroundColor: '#FFF4D6',
  },

  statusSuccess: {
    backgroundColor: '#DCFCE7',
  },

  statusLost: {
    backgroundColor: '#FEE2E2',
  },

  statusText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },

  actionSection: {
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E1E5EC',
  },

  actionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  actionDescription: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },

  convertButton: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#1557E8',
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
    color: '#B42318',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  convertedCard: {
    marginTop: 22,
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },

  convertedTitle: {
    color: '#166534',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  convertedDescription: {
    color: '#166534',
    fontSize: 14,
    lineHeight: 20,
  },

  convertedDate: {
    color: '#166534',
    fontSize: 13,
    marginTop: 8,
  },

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    color: '#111827',
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 16,
    paddingHorizontal: 18,
  },

  infoRow: {
    paddingVertical: 15,
  },

  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F4',
  },

  infoLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },

  infoValue: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 21,
  },

  stateCard: {
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 16,
    padding: 22,
    backgroundColor: '#F8FAFC',
  },

  errorTitle: {
    color: '#B42318',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 7,
  },

  errorText: {
    color: '#7A271A',
    fontSize: 14,
    lineHeight: 20,
  },

  retryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});