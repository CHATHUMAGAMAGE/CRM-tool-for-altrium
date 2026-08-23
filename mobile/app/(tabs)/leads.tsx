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

import { useAppTheme } from '@/context/ThemeContext';
import { getLeads, type Lead } from '@/services/leads';

export default function LeadsScreen() {
  const { colors } = useAppTheme();

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

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: colors.text },
            ]}
          >
            Assigned Leads
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.secondaryText },
            ]}
          >
            Manage and follow up with your assigned leads.
          </Text>
        </View>

        {/* Search */}
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor:
                colors.inputBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor={
              colors.placeholder
            }
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
            style={[
              styles.searchInput,
              { color: colors.text },
            ]}
          />
        </View>

        {/* Loading */}
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text
              style={[
                styles.stateText,
                { color: colors.secondaryText },
              ]}
            >
              Loading leads...
            </Text>
          </View>
        ) : errorMessage ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.errorTitle,
                { color: colors.danger },
              ]}
            >
              Unable to load leads
            </Text>

            <Text
              style={[
                styles.errorText,
                { color: colors.secondaryText },
              ]}
            >
              {errorMessage}
            </Text>
          </View>
        ) : leads.length === 0 ? (
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor:
                  colors.cardSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.text },
              ]}
            >
              No leads found
            </Text>

            <Text
              style={[
                styles.emptyText,
                { color: colors.secondaryText },
              ]}
            >
              {search.trim()
                ? 'No leads match your search.'
                : 'You currently have no assigned leads.'}
            </Text>
          </View>
        ) : (
          <View style={styles.leadsContainer}>
            <Text
              style={[
                styles.resultsText,
                { color: colors.secondaryText },
              ]}
            >
              {leads.length}{' '}
              {leads.length === 1
                ? 'lead'
                : 'leads'}
            </Text>

            {leads.map((lead) => (
              <Pressable
                key={lead.id}
                onPress={() =>
                  router.push({
                    pathname: '/lead/[id]',
                    params: {
                      id: String(lead.id),
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.leadCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                  pressed &&
                    styles.leadCardPressed,
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={styles.companyContainer}
                  >
                    <Text
                      style={[
                        styles.companyName,
                        { color: colors.text },
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
                      getStatusStyle(
                        lead.status,
                      ),
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

                <View
                  style={[
                    styles.detailsContainer,
                    {
                      borderTopColor:
                        colors.divider,
                    },
                  ]}
                >
                  {lead.email ? (
                    <Text
                      style={[
                        styles.detailText,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {lead.email}
                    </Text>
                  ) : null}

                  {lead.phone ? (
                    <Text
                      style={[
                        styles.detailText,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      {lead.phone}
                    </Text>
                  ) : null}

                  {lead.source ? (
                    <Text
                      style={[
                        styles.detailText,
                        {
                          color:
                            colors.secondaryText,
                        },
                      ]}
                    >
                      Source: {lead.source}
                    </Text>
                  ) : null}
                </View>

                <Text
                  style={[
                    styles.viewDetailsText,
                    { color: colors.primary },
                  ]}
                >
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
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
  },

  searchContainer: {
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 22,
  },

  searchInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },

  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  stateText: {
    fontSize: 15,
    marginTop: 12,
  },

  stateCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },

  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },

  leadsContainer: {
    gap: 12,
  },

  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  leadCard: {
    borderWidth: 1,
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
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 5,
  },

  contactName: {
    fontSize: 14,
  },

  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  detailsContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 6,
  },

  detailText: {
    fontSize: 14,
  },

  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 14,
  },
});