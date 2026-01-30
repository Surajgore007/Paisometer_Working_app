// Category Selector - Premium Monochrome Chips

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Category } from '../../core/types';
import { CATEGORIES } from '../../core/constants';
import { CategoryIcon } from './CategoryIcon';

interface CategorySelectorProps {
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>CATEGORY</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={100} // Approximate width of a chip for snapping feel
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                isActive && styles.categoryChipActive,
              ]}
              onPress={() => onSelectCategory(cat.id)}
              activeOpacity={0.8}
            >
              <View style={styles.contentRow}>
                <CategoryIcon
                  categoryId={cat.id}
                  active={isActive}
                  size={18}
                  color="#111827"
                />

                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 16,
    paddingHorizontal: 24,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 12,
    paddingBottom: 4, // Allow shadow space
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100, // Full pill shape
    backgroundColor: 'rgba(255,255,255,0.8)', // Glassy white
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)', // Hairline grey
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    minWidth: 100,
  },
  categoryChipActive: {
    backgroundColor: '#000000', // Solid Black
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.02 }], // Slight pop on selection
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 18,
    // Emojis pass through naturally, but we can manage opacity
  },
  emojiActive: {
    // Optional: make emoji slightly smaller or different when active if needed
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827', // Dark grey text
    letterSpacing: 0.2,
  },
  categoryTextActive: {
    color: '#FFFFFF', // White text
    fontWeight: '600',
  },
});