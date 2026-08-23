import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getLeads, type Lead } from '@/services/leads';

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLeads = useCallback(async (searchTerm = '') => {
    try {
      setErrorMessage('');

      const data = await getLeads(searchTerm);
      setLeads(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load assigned leads.',
      );
    }
  }, []);

  useEffect(() => {
    const loadInitialLeads = async () => {
      setIsLoading(true);

      try {
        await loadLeads();
      } finally {
        setIsLoading(false);
      }
    };

    void loadInitialLeads();
  }, [loadLeads]);

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      await loadLeads(search);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSearch = async () => {
    setIsLoading(true);

    try {
      await loadLeads(search);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status: Lead['status']) => {
  switch (status) {
    case 'QUALIFIED':
    case 'WON':
      return styles.statusSuccess;

    case 'LOST':
      return styles.statusLost;

    case 'CONTACTED':
    case 'PROPOSAL':
      return styles.statusActive;

    case 'NEW':
    case 'DISQUALIFIED':
    default:
      return styles.statusNew;
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Assigned Leads</Text>

          <Text style={styles.subtitle}>
            Manage and follow up with your assigned leads.
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor="#8A919F"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            style={styles.searchInput}
          />
        </View>

        {/* Loading */}
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color="#1557E8"
            />

            <Text style={styles.stateText}>
              Loading leads...
            </Text>
          </View>
        ) : errorMessage ? (
          /* Error */
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>
              Unable to load leads
            </Text>

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          </View>
        ) : leads.length === 0 ? (
          /* Empty */
          <View style={styles.stateCard}>
            <Text style={styles.emptyTitle}>
              No leads found
            </Text>

            <Text style={styles.emptyText}>
              {search.trim()
                ? 'No leads match your search.'
                : 'You currently have no assigned leads.'}
            </Text>
          </View>
        ) : (
          /* Lead list */
          <View style={styles.leadsContainer}>
            <Text style={styles.resultsText}>
              {leads.length}{' '}
              {leads.length === 1 ? 'lead' : 'leads'}
            </Text>

            {leads.map((lead) => (
              <Pressable
                key={lead.id}
                onPress={() =>
                 router.push({
                 pathname: '/lead/[id]',
                params: { id: String(lead.id) },
               })
            }
                style={({ pressed }) => [
                  styles.leadCard,
                  pressed && styles.leadCardPressed,
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.companyContainer}>
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

                {/* Lead Details */}
                <View style={styles.detailsContainer}>
                  {lead.email ? (
                    <Text style={styles.detailText}>
                      {lead.email}
                    </Text>
                  ) : null}

                  {lead.phone ? (
                    <Text style={styles.detailText}>
                      {lead.phone}
                    </Text>
                  ) : null}

                  {lead.source ? (
                    <Text style={styles.detailText}>
                      Source: {lead.source}
                    </Text>
                  ) : null}
                </View>

                {/* Tap hint */}
                <Text style={styles.viewDetailsText}>
                  Tap to view details
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 30,
  },

  header: {
    marginBottom: 22,
  },

  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 21,
  },

  searchContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: '#D7DBE3',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 22,
  },

  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  stateText: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 12,
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  errorText: {
    color: '#7A271A',
    fontSize: 14,
    lineHeight: 20,
  },

  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
  },

  leadsContainer: {
    gap: 12,
  },

  resultsText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  leadCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 16,
    padding: 18,
  },

  leadCardPressed: {
    opacity: 0.7,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  companyContainer: {
    flex: 1,
  },

  companyName: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },

  contactName: {
    color: '#6B7280',
    fontSize: 14,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
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

  detailsContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
    gap: 6,
  },

  detailText: {
    color: '#6B7280',
    fontSize: 14,
  },

  viewDetailsText: {
    color: '#1557E8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
});