import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import Input from '../../components/Input';
import StateView from '../../components/StateView';
import { MIN_SEARCH_LENGTH } from '../../constants/config';
import { COLORS, SPACING } from '../../constants/theme';
import { useCustomerSearch } from '../../hooks/useCustomerSearch';
import CustomerCard from './CustomerCard';

const keyExtractor = (customer) => String(customer.id);

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const { results, loading, error, hasSearched } = useCustomerSearch(query);

  const handleSelectCustomer = useCallback(
    (customer) => {
      navigation.navigate('CustomerDetail', {
        customerId: customer.id,
        customerName: customer.name,
      });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }) => <CustomerCard customer={item} onPress={handleSelectCustomer} />,
    [handleSelectCustomer],
  );

  const renderEmpty = useCallback(() => {
    if (loading) return <StateView variant="loading" />;

    if (error) {
      return (
        <StateView variant="error" title="Search failed" message={error} />
      );
    }

    if (!hasSearched) {
      return (
        <StateView
          title="Find a customer"
          message={`Type at least ${MIN_SEARCH_LENGTH} characters of a name or phone number.`}
        />
      );
    }

    return (
      <StateView
        title="No customers found"
        message={`Nothing matches "${query.trim()}". Try a different name or phone number.`}
      />
    );
  }, [error, hasSearched, loading, query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Input
          placeholder="Search by name or phone"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          loading={loading}
          containerStyle={styles.searchInput}
          accessibilityLabel="Search customers"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={
          results.length ? styles.list : styles.listEmpty
        }
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInput: { marginBottom: SPACING.md },
  list: { padding: SPACING.md },
  listEmpty: { flexGrow: 1 },
});

export default SearchScreen;
