import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, Mic, Camera, X } from 'lucide-react-native';
import { COLORS, FONTS, SPACING } from '../utils/constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onVoiceSearch?: () => void;
  onImageSearch?: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  onVoiceSearch,
  onImageSearch,
  placeholder = 'Search products...',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={[styles.container, isFocused && styles.focused]}>
      <View style={styles.searchContainer}>
        <Search size={20} color={COLORS.gray[500]} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray[500]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={18} color={COLORS.gray[500]} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actionsContainer}>
        {onVoiceSearch && (
          <TouchableOpacity onPress={onVoiceSearch} style={styles.actionButton}>
            <Mic size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
        )}
        {onImageSearch && (
          <TouchableOpacity onPress={onImageSearch} style={styles.actionButton}>
            <Camera size={20} color={COLORS.gray[600]} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  focused: {
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.gray[900],
    marginLeft: SPACING.sm,
  },
  clearButton: {
    padding: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingRight: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
});