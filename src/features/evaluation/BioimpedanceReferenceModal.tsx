/**
 * BioimpedanceReferenceModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Modal Sheet displaying clinical reference tables for bioimpedance:
 * 1. IMC (ABESO / OMS)
 * 2. Circunferência Abdominal (Risco Cardiovascular)
 * 3. % Gordura Corporal (Feminino & Masculino)
 * 4. Gordura Visceral (Nível 1-59)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Haptics,
  SegmentedControl,
  Badge,
} from '../../design-system';

export interface BioimpedanceReferenceModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BioimpedanceReferenceModal({
  visible,
  onClose,
}: BioimpedanceReferenceModalProps) {
  const [selectedGenderIndex, setSelectedGenderIndex] = useState<number>(0); // 0 = Mulher, 1 = Homem

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Apple HIG Modal Navigation Bar */}
        <View style={styles.navBar}>
          <View style={styles.navPlaceholder} />
          <Text style={styles.navTitle}>Tabelas de Referência Clínica</Text>
          <TouchableOpacity
            style={styles.navCloseBtn}
            onPress={() => {
              Haptics.selection();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar tabelas de referência"
          >
            <Text style={styles.navCloseText}>OK</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Gender Selector for Gender-specific tables */}
          <View style={styles.genderControlWrapper}>
            <Text style={styles.genderControlLabel}>Visualização de Referência:</Text>
            <SegmentedControl
              values={['Feminino (Clínica)', 'Masculino']}
              selectedIndex={selectedGenderIndex}
              onChange={(index) => {
                Haptics.selection();
                setSelectedGenderIndex(index);
              }}
            />
          </View>

          {/* TABLE 1: IMC (ABESO / OMS) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.primarySubtle }]}>
                <Ionicons name="speedometer-outline" size={18} color={Colors.primary} />
              </View>
              <View style={styles.cardHeaderTitles}>
                <Text style={styles.cardTitle}>Índice de Massa Corporal (IMC)</Text>
                <Text style={styles.cardSubtitle}>Classificação oficial ABESO / OMS (kg/m²)</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableRowHeader]}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.5 }]}>Faixa (kg/m²)</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Classificação</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.5, textAlign: 'right' }]}>Risco</Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>&lt; 18,5</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Abaixo do peso</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Atenção" variant="warning" size="sm" />
                </View>
              </View>

              <View style={[styles.tableRow, styles.tableRowHighlight]}>
                <Text style={[styles.tableCell, styles.textBold, { flex: 1.5 }]}>18,5 – 24,9</Text>
                <Text style={[styles.tableCell, styles.textBold, { flex: 2 }]}>Eutrofia (Normal)</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Saudável" variant="success" size="sm" />
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>25,0 – 29,9</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Sobrepeso</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Aumentado" variant="warning" size="sm" />
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>30,0 – 34,9</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Obesidade Grau I</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Moderado" variant="alert" size="sm" />
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>35,0 – 39,9</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Obesidade Grau II</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Grave" variant="alert" size="sm" />
                </View>
              </View>

              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>≥ 40,0</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Obesidade Grau III</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Mórbida" variant="alert" size="sm" />
                </View>
              </View>
            </View>
          </View>

          {/* TABLE 2: CIRCUNFERÊNCIA ABDOMINAL */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FDF2F2' }]}>
                <Ionicons name="body-outline" size={18} color={Colors.accent} />
              </View>
              <View style={styles.cardHeaderTitles}>
                <Text style={styles.cardTitle}>Circunferência Abdominal</Text>
                <Text style={styles.cardSubtitle}>Risco Cardiovascular e Metabólico (OMS)</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableRowHeader]}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.8 }]}>
                  {selectedGenderIndex === 0 ? 'Feminino' : 'Masculino'}
                </Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.8 }]}>Nível de Risco</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.4, textAlign: 'right' }]}>Conduta</Text>
              </View>

              {selectedGenderIndex === 0 ? (
                <>
                  <View style={[styles.tableRow, styles.tableRowHighlight]}>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 1.8 }]}>&lt; 80 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Normal</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Manter" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>80 – 87 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Elevado</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Alerta" variant="warning" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>≥ 88 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Muito Alto</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Intervir" variant="alert" size="sm" />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={[styles.tableRow, styles.tableRowHighlight]}>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 1.8 }]}>&lt; 94 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Normal</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Manter" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>94 – 101 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Elevado</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Alerta" variant="warning" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>≥ 102 cm</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>Risco Muito Alto</Text>
                    <View style={{ flex: 1.4, alignItems: 'flex-end' }}>
                      <Badge label="Intervir" variant="alert" size="sm" />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* TABLE 3: % GORDURA CORPORAL */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="pie-chart-outline" size={18} color={Colors.success} />
              </View>
              <View style={styles.cardHeaderTitles}>
                <Text style={styles.cardTitle}>% de Gordura Corporal</Text>
                <Text style={styles.cardSubtitle}>
                  Faixas para {selectedGenderIndex === 0 ? 'Mulheres' : 'Homens'} (Gallagher et al.)
                </Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableRowHeader]}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Categoria</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.8 }]}>Faixa (%)</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.2, textAlign: 'right' }]}>Perfil</Text>
              </View>

              {selectedGenderIndex === 0 ? (
                <>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Atleta</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>14,0% – 20,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Atleta" variant="primary" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Fitness / Ótimo</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>21,0% – 24,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Ótimo" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, styles.tableRowHighlight]}>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 2 }]}>Média Saudável</Text>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 1.8 }]}>25,0% – 31,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Padrão" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Moderado</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>32,0% – 35,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Alerta" variant="warning" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Sobrepeso</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>36,0% – 40,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Elevado" variant="alert" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Obesidade</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>&gt; 40,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Crítico" variant="alert" size="sm" />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Atleta</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>6,0% – 13,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Atleta" variant="primary" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Fitness / Ótimo</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>14,0% – 17,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Ótimo" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, styles.tableRowHighlight]}>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 2 }]}>Média Saudável</Text>
                    <Text style={[styles.tableCell, styles.textBold, { flex: 1.8 }]}>18,0% – 24,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Padrão" variant="success" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Moderado</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>25,0% – 27,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Alerta" variant="warning" size="sm" />
                    </View>
                  </View>
                  <View style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Sobrepeso</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>28,0% – 31,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Elevado" variant="alert" size="sm" />
                    </View>
                  </View>
                  <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.tableCell, { flex: 2 }]}>Obesidade</Text>
                    <Text style={[styles.tableCell, { flex: 1.8 }]}>&gt; 31,0%</Text>
                    <View style={{ flex: 1.2, alignItems: 'flex-end' }}>
                      <Badge label="Crítico" variant="alert" size="sm" />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* TABLE 4: GORDURA VISCERAL */}
          <View style={[styles.card, { marginBottom: Spacing.xl }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconCircle, { backgroundColor: '#FFF8E1' }]}>
                <Ionicons name="flame-outline" size={18} color="#C27803" />
              </View>
              <View style={styles.cardHeaderTitles}>
                <Text style={styles.cardTitle}>Gordura Visceral</Text>
                <Text style={styles.cardSubtitle}>Nível de gordura intra-abdominal (Escala 1 a 59)</Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableRowHeader]}>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.5 }]}>Nível</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 2 }]}>Classificação</Text>
                <Text style={[styles.tableCell, styles.cellHeader, { flex: 1.5, textAlign: 'right' }]}>Risco</Text>
              </View>

              <View style={[styles.tableRow, styles.tableRowHighlight]}>
                <Text style={[styles.tableCell, styles.textBold, { flex: 1.5 }]}>1 – 9</Text>
                <Text style={[styles.tableCell, styles.textBold, { flex: 2 }]}>Normal / Saudável</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Ideal" variant="success" size="sm" />
                </View>
              </View>

              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>10 – 14</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Alto / Limítrofe</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Alerta" variant="warning" size="sm" />
                </View>
              </View>

              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>15 – 59</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>Muito Alto</Text>
                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                  <Badge label="Crítico" variant="alert" size="sm" />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  navBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  navPlaceholder: {
    minWidth: 50,
  },
  navTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  navCloseBtn: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  navCloseText: {
    ...Typography.headline,
    color: Colors.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl * 2,
  },
  genderControlWrapper: {
    marginBottom: Spacing.base,
  },
  genderControlLabel: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.base,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitles: {
    flex: 1,
  },
  cardTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  cardSubtitle: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  table: {
    borderRadius: Radii.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  tableRowHeader: {
    backgroundColor: Colors.surfaceSecondary,
  },
  tableRowHighlight: {
    backgroundColor: '#F8F4FA',
  },
  tableCell: {
    ...Typography.subhead,
    color: Colors.textPrimary,
  },
  cellHeader: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  textBold: {
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
