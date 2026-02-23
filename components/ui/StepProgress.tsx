import { AppColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

type StepProgressProps = {
  currentStep: number;
  totalSteps?: number;
};

export default function StepProgress({
  currentStep,
  totalSteps = 3,
}: StepProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  background: {
    height: 10,
    width: '100%',
    backgroundColor: AppColors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: 10,
    backgroundColor: AppColors.primary,
    borderRadius: 8,
  },
});