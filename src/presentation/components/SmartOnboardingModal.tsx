import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Dimensions,
    SafeAreaView,
    ScrollView,
    Alert,
} from 'react-native';
import { ChevronLeft, X } from 'lucide-react-native';
import { useStore } from '../state/store';
import { formatCurrency } from '../../core/utils';

const { width } = Dimensions.get('window');

type Step = 'INTRO' | 'MODE' | 'INCOME' | 'DURATION' | 'OBLIGATIONS' | 'SAVINGS' | 'RESULT';

const STEPS_ORDER: Step[] = ['INTRO', 'MODE', 'INCOME', 'DURATION', 'OBLIGATIONS', 'SAVINGS', 'RESULT'];

export const SmartOnboardingModal = () => {
    const { settings, updateSettings, loadData } = useStore();
    const [step, setStep] = useState<Step>('INTRO');

    // Temporary State
    const [mode, setMode] = useState<'monthly' | 'lumpsum'>('monthly');
    const [income, setIncome] = useState(settings.monthlyIncome.toString());
    const [durationDays, setDurationDays] = useState('30'); // For lump sum
    const [obligations, setObligations] = useState((settings.fixedObligations || 0).toString());
    const [savings, setSavings] = useState(settings.savingsGoalAmount.toString());

    const handleBack = () => {
        const currentIndex = STEPS_ORDER.indexOf(step);
        if (currentIndex > 0) {
            let prevStep = STEPS_ORDER[currentIndex - 1];

            // Skip logic based on mode
            if (step === 'OBLIGATIONS' && mode === 'lumpsum' && prevStep === 'DURATION') {
                // Should be correct
            }
            if (step === 'OBLIGATIONS' && mode === 'monthly') {
                // If coming back to Obligations in monthly, we skipped DURATION. 
                // Previous of OBLIGATIONS is DURATION in array, but for monthly we skip DURATION.
                // So go back to INCOME.
                prevStep = 'INCOME';
            }

            setStep(prevStep);
        }
    };

    const handleClose = () => {
        Alert.alert(
            "Skip Setup?",
            "You can always configure this later in Settings.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Exit",
                    style: 'destructive',
                    onPress: async () => {
                        await updateSettings({ onboardingCompleted: true });
                    }
                }
            ]
        );
    };

    const handleNext = async () => {
        if (step === 'INTRO') setStep('MODE');
        else if (step === 'MODE') setStep('INCOME');
        else if (step === 'INCOME') {
            if (mode === 'lumpsum') setStep('DURATION');
            else setStep('OBLIGATIONS');
        }
        else if (step === 'DURATION') setStep('OBLIGATIONS');
        else if (step === 'OBLIGATIONS') setStep('SAVINGS');
        else if (step === 'SAVINGS') {
            // Calculate result preview
            setStep('RESULT');
        } else if (step === 'RESULT') {
            // Calculate End Date for Lump Sum
            let endDate = null;
            if (mode === 'lumpsum') {
                const d = new Date();
                d.setDate(d.getDate() + (parseInt(durationDays) || 30));
                endDate = d;
            }

            // Save Everything
            await updateSettings({
                budgetMode: mode,
                monthlyIncome: parseFloat(income) || 0,
                fixedObligations: parseFloat(obligations) || 0,
                savingsGoalAmount: parseFloat(savings) || 0,
                endOfBudgetCycle: endDate,
                onboardingCompleted: true
            });
            await loadData(); // Recalculate store
            // Parent will unmount us
        }
    };

    // Calculation for Result Screen
    const inc = parseFloat(income) || 0;
    const obl = parseFloat(obligations) || 0;
    const sav = parseFloat(savings) || 0;
    const days = mode === 'lumpsum' ? (parseInt(durationDays) || 30) : 30;
    const disposable = Math.max(0, inc - obl - sav);
    const daily = disposable / days;

    return (
        <Modal visible={true} animationType="slide">
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>

                    {/* Navigation Header */}
                    <View style={styles.navHeader}>
                        {step !== 'INTRO' ? (
                            <TouchableOpacity onPress={handleBack} style={styles.navBtn}>
                                <ChevronLeft size={28} color="#FFF" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ width: 28 }} /> // Spacer
                        )}

                        <View style={styles.progressDots}>
                            {STEPS_ORDER.map((s, i) => {
                                // Don't show DURATION dot if monthly
                                if (mode === 'monthly' && s === 'DURATION') return null;
                                return (
                                    <View key={s} style={[styles.dot, step === s && styles.activeDot]} />
                                );
                            })}
                        </View>

                        <TouchableOpacity onPress={handleClose} style={styles.navBtn}>
                            <X size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {step === 'INTRO' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🚀</Text>
                                <Text style={styles.title}>Let's set your{"\n"}financial engine</Text>
                                <Text style={styles.subtitle}>
                                    To give you a real "Safe Daily Limit", we need to know your hustle and your burns.
                                </Text>
                            </View>
                        )}

                        {step === 'MODE' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🎛️</Text>
                                <Text style={styles.title}>How do you roll?</Text>

                                <View style={styles.modeContainer}>
                                    <TouchableOpacity
                                        style={[styles.modeBtn, mode === 'monthly' && styles.activeMode]}
                                        onPress={() => setMode('monthly')}
                                    >
                                        <Text style={styles.modeTitle}>Monthly Pay</Text>
                                        <Text style={styles.modeDesc}>I get a salary or steady income every month.</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.modeBtn, mode === 'lumpsum' && styles.activeMode]}
                                        onPress={() => setMode('lumpsum')}
                                    >
                                        <Text style={styles.modeTitle}>Survival Mode</Text>
                                        <Text style={styles.modeDesc}>I live off a lump sum cash pile.</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {step === 'INCOME' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>{mode === 'monthly' ? '💰' : '🏦'}</Text>
                                <Text style={styles.title}>{mode === 'monthly' ? 'The Hustle' : 'The Stash'}</Text>
                                <Text style={styles.subtitle}>
                                    {mode === 'monthly'
                                        ? 'What is your typical monthly income?'
                                        : 'Total cash you have right now?'}
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <Text style={styles.currencyPrefix}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={income}
                                        onChangeText={setIncome}
                                        placeholder="0"
                                        placeholderTextColor="#333"
                                        selectionColor="#FFF"
                                        autoFocus
                                    />
                                </View>
                            </View>
                        )}

                        {step === 'DURATION' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🗓️</Text>
                                <Text style={styles.title}>The Timeline</Text>
                                <Text style={styles.subtitle}>How long must this last?</Text>
                                <Text style={styles.hint}>Enter number of days</Text>

                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={durationDays}
                                        onChangeText={setDurationDays}
                                        placeholder="30"
                                        placeholderTextColor="#333"
                                        selectionColor="#FFF"
                                        autoFocus
                                    />
                                    <Text style={styles.currencyPrefix}>Days</Text>
                                </View>
                            </View>
                        )}

                        {step === 'OBLIGATIONS' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🔥</Text>
                                <Text style={styles.title}>The Burn</Text>
                                <Text style={styles.subtitle}>Fixed bills you MUST pay?</Text>
                                <Text style={styles.hint}>Rent, EMI, Electricity, Postpaid bills.</Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.currencyPrefix}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={obligations}
                                        onChangeText={setObligations}
                                        placeholder="0"
                                        placeholderTextColor="#333"
                                        selectionColor="#FFF"
                                        autoFocus
                                    />
                                </View>
                            </View>
                        )}

                        {step === 'SAVINGS' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🏦</Text>
                                <Text style={styles.title}>The Stash</Text>
                                <Text style={styles.subtitle}>How much do you want to save?</Text>
                                <Text style={styles.hint}>We will remove this from your daily budget immediately.</Text>

                                <View style={styles.inputWrapper}>
                                    <Text style={styles.currencyPrefix}>₹</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={savings}
                                        onChangeText={setSavings}
                                        placeholder="0"
                                        placeholderTextColor="#333"
                                        selectionColor="#FFF"
                                        autoFocus
                                    />
                                </View>
                            </View>
                        )}

                        {step === 'RESULT' && (
                            <View style={styles.stepContainer}>
                                <Text style={styles.emoji}>🎉</Text>
                                <Text style={styles.title}>You are set!</Text>
                                <Text style={styles.subtitle}>Based on your inputs:</Text>

                                <View style={styles.summaryBox}>
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>{mode === 'monthly' ? 'Cycle' : 'Timeline'}</Text>
                                        <Text style={styles.rowValue}>{days} Days</Text>
                                    </View>
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>To Survive (Income - Bills)</Text>
                                        <Text style={styles.rowValue}>{formatCurrency(inc - obl)}</Text>
                                    </View>
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabel}>To Save</Text>
                                        <Text style={styles.rowValue}>{formatCurrency(sav)}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.row}>
                                        <Text style={styles.rowLabelBold}>Safe Daily Limit</Text>
                                        <Text style={styles.rowValueBig}>{formatCurrency(daily)}</Text>
                                    </View>
                                </View>

                                <Text style={styles.hint}>
                                    If you spend less than {formatCurrency(daily)} today,
                                    the rest goes to your savings.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity style={styles.btn} onPress={handleNext}>
                        <Text style={styles.btnText}>
                            {step === 'INTRO' ? 'Start Setup' : step === 'RESULT' ? 'Let\'s Go' : 'Next'}
                        </Text>
                    </TouchableOpacity>

                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'space-between',
    },
    navHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        height: 44,
    },
    navBtn: {
        padding: 8,
    },
    progressDots: {
        flexDirection: 'row',
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#333',
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: '#FFF',
        width: 18,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    stepContainer: {
        alignItems: 'center',
    },
    emoji: {
        fontSize: 64,
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 18,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 12,
        lineHeight: 26,
    },
    hint: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 40,
        borderBottomWidth: 2,
        borderBottomColor: '#FFF',
        paddingBottom: 8,
    },
    currencyPrefix: {
        fontSize: 40,
        fontWeight: '700',
        color: '#6B7280',
        marginRight: 10,
    },
    input: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FFF',
        minWidth: 100,
        textAlign: 'center',
    },
    btn: {
        backgroundColor: '#FFF',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
    btnText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#000',
    },
    // Summary Box
    summaryBox: {
        backgroundColor: '#111',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        marginTop: 24,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rowLabel: {
        color: '#9CA3AF',
        fontSize: 16,
    },
    rowLabelBold: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
    },
    rowValue: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    rowValueBig: {
        color: '#4ADE80',
        fontSize: 24,
        fontWeight: '800',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 12,
    },
    // Mode Buttons
    modeContainer: {
        width: '100%',
        gap: 16,
    },
    modeBtn: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#333',
    },
    activeMode: {
        borderColor: '#FFF',
        backgroundColor: '#222',
    },
    modeTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    modeDesc: {
        color: '#9CA3AF',
        fontSize: 14,
    },
});
