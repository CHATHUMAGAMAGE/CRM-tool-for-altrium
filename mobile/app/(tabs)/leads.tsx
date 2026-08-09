import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
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

  const loadLeads = useCallback(async (searchValue = '') => {
    try {
      setErrorMessage('');

      const data = await getLeads(searchValue);
      setLeads(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load assigned leads.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const handleSearch = () => {
    void loadLeads(search);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadLeads(search);
  };

  const renderLead = ({ item }: { item: Lead }) => (
    <Pressable style={styles.leadCard}>
      <View style={styles.cardHeader}>
        <View style={styles.companyContainer}>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.company_name}
          </Text>

          <Text style={styles.contactName} numberOfLines={1}>
            {item.contact_name}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {item.status_display}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        {item.email ? (
          <Text style={styles.detailText} numberOfLines={1}>
            {item.email}
          </Text>
        ) : null}

        <Text style={styles.detailText}>
          {item.phone}
        </Text>

        {item.source ? (
          <Text style={styles.sourceText}>
            Source: {item.source}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            Loading assigned leads...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brandText}>
            <Text style={styles.elevenText}>ELEVEN</Text>
            <Text style={styles.crmText}> CRM</Text>
          </Text>

          <Text style={styles.title}>Assigned Leads</Text>
          <Text style={styles.subtitle}>
            Leads assigned to you
          </Text>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search leads..."
            placeholderTextColor="#8A919F"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <Pressable
            onPress={handleSearch}
            style={styles.searchButton}
          >
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => loadLeads(search)}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!errorMessage && leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No assigned leads
            </Text>

            <Text style={styles.emptyText}>
              You currently have no leads assigned to you.
            </Text>
          </View>
        ) : null}

        {!errorMessage && leads.length > 0 ? (
          <FlatList
            data={leads}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderLead}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    paddingTop: 20,
    paddingBottom: 20,
  },

  brandText: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 22,
  },

  elevenText: {
    color: '#1557E8',
  },

  crmText: {
    color: '#111827',
  },

  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '700',
  },

  subtitle: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 5,
  },

  searchContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  searchInput: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: '#D7DBE3',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  searchButton: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1557E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  listContent: {
    paddingBottom: 25,
    gap: 12,
  },

  leadCard: {
    borderWidth: 1,
    borderColor: '#E1E5EC',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  companyContainer: {
    flex: 1,
  },

  companyName: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },

  contactName: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: '#EEF4FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusText: {
    color: '#1557E8',
    fontSize: 12,
    fontWeight: '700',
  },

  details: {
    marginTop: 15,
    gap: 5,
  },

  detailText: {
    color: '#374151',
    fontSize: 14,
  },

  sourceText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 3,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: '#6B7280',
    fontSize: 15,
    marginTop: 12,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },

  emptyText: {
    color: '#6B7280',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },

  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  errorText: {
    color: '#D32F2F',
    fontSize: 15,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1557E8',
  },

  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});