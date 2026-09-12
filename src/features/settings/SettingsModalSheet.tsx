/**
 * SettingsModalSheet.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Modal Sheet for Settings & Clinic Administration.
 * Presented via the top-header gear button across screens.
 */

import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Colors } from '../../design-system';
import { SettingsScreen } from './SettingsScreen';

export interface SettingsModalSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModalSheet({ visible, onClose }: SettingsModalSheetProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <SettingsScreen onClose={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
});
