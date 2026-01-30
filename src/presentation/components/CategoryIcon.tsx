import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
    Utensils, Car, Zap, ShoppingBag, Gamepad2, Package, HelpCircle,
    Tag, Banknote, Briefcase, Landmark, Undo2, Smartphone, TrendingUp
} from 'lucide-react-native';
import { CATEGORIES } from '../../core/constants';

interface CategoryIconProps {
    categoryId?: string;
    iconName?: string;
    size?: number;
    color?: string;
    active?: boolean;
}

const ICON_MAP: Record<string, any> = {
    'Utensils': Utensils,
    'Car': Car,
    'Zap': Zap,
    'ShoppingBag': ShoppingBag,
    'Gamepad2': Gamepad2,
    'Package': Package,
    'Tag': Tag,
    'Banknote': Banknote,
    'Briefcase': Briefcase,
    'Landmark': Landmark,
    'Undo2': Undo2,
    'Smartphone': Smartphone,
    'TrendingUp': TrendingUp,
    'HelpCircle': HelpCircle
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
    categoryId,
    iconName,
    size = 24,
    color = '#000000',
    active = false
}) => {
    const category = categoryId ? CATEGORIES.find(c => c.id === categoryId) : null;
    // Resolve Icon Key: Explicit name > Category ID lookup > Default
    const iconKey = iconName || (category ? category.icon : 'HelpCircle');
    const IconComponent = ICON_MAP[iconKey] || HelpCircle;

    return (
        <View style={[styles.container, active && styles.activeContainer]}>
            <IconComponent
                size={size}
                color={active ? '#FFFFFF' : color}
                strokeWidth={2}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeContainer: {
        // Optional additional styling for active state if needed
    }
});
