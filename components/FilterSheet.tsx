import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { SearchFilters } from '../types';
import { COLORS, FONTS, SPACING, CATEGORIES } from '../utils/constants';
import Modal from 'react-native-modal';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: SearchFilters;
  onApplyFilters: (filters: SearchFilters) => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({});
  };

  const renderCategoryFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Category</Text>
      <View style={styles.optionsContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.optionItem,
              localFilters.category === category.id && styles.selectedOption,
            ]}
            onPress={() =>
              setLocalFilters({
                ...localFilters,
                category: localFilters.category === category.id ? undefined : category.id,
              })
            }
          >
            <Text
              style={[
                styles.optionText,
                localFilters.category === category.id && styles.selectedOptionText,
              ]}
            >
              {category.name}
            </Text>
            {localFilters.category === category.id && (
              <Check size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSortFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Sort By</Text>
      <View style={styles.optionsContainer}>
        {[
          { id: 'price-asc', label: 'Price: Low to High' },
          { id: 'price-desc', label: 'Price: High to Low' },
          { id: 'rating', label: 'Customer Rating' },
          { id: 'popularity', label: 'Popularity' },
        ].map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionItem,
              localFilters.sortBy === option.id && styles.selectedOption,
            ]}
            onPress={() =>
              setLocalFilters({
                ...localFilters,
                sortBy: localFilters.sortBy === option.id ? undefined : option.id as any,
              })
            }
          >
            <Text
              style={[
                styles.optionText,
                localFilters.sortBy === option.id && styles.selectedOptionText,
              ]}
            >
              {option.label}
            </Text>
            {localFilters.sortBy === option.id && (
              <Check size={16} color={COLORS.white} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSpecialFilters = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Special Filters</Text>
      <TouchableOpacity
        style={[
          styles.optionItem,
          localFilters.deals && styles.selectedOption,
        ]}
        onPress={() =>
          setLocalFilters({
            ...localFilters,
            deals: !localFilters.deals,
          })
        }
      >
        <Text
          style={[
            styles.optionText,
            localFilters.deals && styles.selectedOptionText,
          ]}
        >
          On Sale Only
        </Text>
        {localFilters.deals && <Check size={16} color={COLORS.white} />}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter Results</Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={COLORS.gray[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {renderCategoryFilter()}
          {renderSortFilter()}
          {renderSpecialFilters()}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  filterSection: {
    marginBottom: SPACING.xl,
  },
  filterTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray[900],
    marginBottom: SPACING.md,
  },
  optionsContainer: {
    gap: SPACING.sm,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.gray[50],
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  selectedOption: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.gray[700],
  },
  selectedOptionText: {
    color: COLORS.white,
    fontFamily: FONTS.medium,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  resetButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.gray[700],
  },
  applyButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: COLORS.white,
  },
});