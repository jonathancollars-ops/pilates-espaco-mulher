/**
 * PatientConditionPhotosModal.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Clinical Photographic Documentation Modal Sheet.
 * Allows physiotherapists to capture, organize, and track clinical photos across categories:
 * - Postura
 * - Escoliose
 * - Cicatriz / Cirurgia
 * - Edema / Inchaço
 * - Diástase Abdominal
 * - Articulações / Joelhos / Pés
 * - Flexibilidade / Alongamento
 * - Outro
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
  Layout,
  Haptics,
  Badge,
  Button,
} from '../../design-system';
import {
  PatientConditionPhoto,
  ConditionPhotoCategory,
  CreateConditionPhotoInput,
} from '../../types/conditionPhoto';
import { conditionPhotoRepository } from '../../database/repositories/conditionPhotoRepository';
import { formatDateBR } from '../../utils/formatters';

export interface PatientConditionPhotosModalProps {
  visible: boolean;
  patientId: string;
  patientName?: string;
  onClose: () => void;
}

const CATEGORIES: readonly (ConditionPhotoCategory | 'Todas')[] = [
  'Todas',
  'Postura',
  'Escoliose',
  'Cicatriz / Cirurgia',
  'Edema / Inchaço',
  'Diástase Abdominal',
  'Articulações / Joelhos / Pés',
  'Flexibilidade / Alongamento',
  'Outro',
];

const FORM_CATEGORIES: readonly ConditionPhotoCategory[] = [
  'Postura',
  'Escoliose',
  'Cicatriz / Cirurgia',
  'Edema / Inchaço',
  'Diástase Abdominal',
  'Articulações / Joelhos / Pés',
  'Flexibilidade / Alongamento',
  'Outro',
];

export function PatientConditionPhotosModal({
  visible,
  patientId,
  patientName,
  onClose,
}: PatientConditionPhotosModalProps) {
  // Photo List & Filter
  const [photos, setPhotos] = useState<PatientConditionPhoto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Todas');

  // Fullscreen Viewer State
  const [activePhoto, setActivePhoto] = useState<PatientConditionPhoto | null>(null);

  // New Photo Capture / Form State
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [pendingUri, setPendingUri] = useState<string>('');
  const [formCategory, setFormCategory] = useState<ConditionPhotoCategory>('Postura');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load photos from SQLite
  const loadPhotos = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const list = await conditionPhotoRepository.listByPatientId(patientId);
      setPhotos(list);
    } catch (err) {
      console.error('[PatientConditionPhotosModal] Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    if (visible && patientId) {
      loadPhotos();
    }
  }, [visible, patientId, loadPhotos]);

  // Request Permissions & Launch Camera
  const handleCaptureCamera = async () => {
    Haptics.selection();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'O acesso à câmera é necessário para registrar fotos de acompanhamento clínico.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingUri(result.assets[0].uri);
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormTitle('');
        setFormNotes('');
        setIsFormVisible(true);
      }
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Falha ao acessar câmera.');
    }
  };

  // Request Permissions & Launch Library
  const handleSelectGallery = async () => {
    Haptics.selection();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'O acesso à galeria de fotos é necessário para selecionar registros clínicos.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPendingUri(result.assets[0].uri);
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormTitle('');
        setFormNotes('');
        setIsFormVisible(true);
      }
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Falha ao abrir galeria.');
    }
  };

  // Trigger Action Sheet / Options for Photo Source
  const handleAddPhotoPress = () => {
    Haptics.impactMedium();
    Alert.alert(
      'Adicionar Foto Clínica',
      'Selecione a origem da imagem para o prontuário:',
      [
        {
          text: 'Tirar Foto (Câmera)',
          onPress: handleCaptureCamera,
        },
        {
          text: 'Escolher da Galeria',
          onPress: handleSelectGallery,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  // Save new photo
  const handleSaveNewPhoto = async () => {
    if (!pendingUri) return;

    try {
      setIsSaving(true);
      Haptics.impactMedium();

      const input: CreateConditionPhotoInput = {
        patient_id: patientId,
        photo_uri: pendingUri,
        category: formCategory,
        title: formTitle.trim() || undefined,
        notes: formNotes.trim() || undefined,
        date: formDate,
      };

      await conditionPhotoRepository.create(patientId, input);
      Haptics.success();
      setIsFormVisible(false);
      setPendingUri('');
      await loadPhotos();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar a foto clínica.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Photo with confirmation
  const handleDeletePhoto = (photo: PatientConditionPhoto) => {
    Haptics.warning();
    Alert.alert(
      'Excluir Foto Clínica?',
      'Esta ação removerá permanentemente o registro fotográfico deste paciente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactHeavy();
              await conditionPhotoRepository.deleteById(photo.id);
              setActivePhoto(null);
              Haptics.success();
              await loadPhotos();
            } catch (err: any) {
              Haptics.error();
              Alert.alert('Erro', err?.message || 'Falha ao excluir foto.');
            }
          },
        },
      ]
    );
  };

  // Filtered Photos
  const filteredPhotos = photos.filter((p) => {
    if (selectedCategoryFilter === 'Todas') return true;
    return p.category === selectedCategoryFilter;
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.navCloseBtn}
            onPress={() => {
              Haptics.selection();
              onClose();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Fechar fotos de condição"
          >
            <Ionicons name="close" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.navTitleContainer}>
            <Text style={styles.navTitle}>Fotos de Condição Clínica</Text>
            {patientName ? (
              <Text style={styles.navSubtitle} numberOfLines={1}>
                {patientName}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.navAddBtn}
            onPress={handleAddPhotoPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Nova Foto"
          >
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Category Filters Bar */}
        <View style={styles.filtersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersScrollContent}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategoryFilter === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    Haptics.selection();
                    setSelectedCategoryFilter(cat);
                  }}
                  style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Content Body */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando registros fotográficos...</Text>
          </View>
        ) : filteredPhotos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="images-outline" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma Foto Encontrada</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategoryFilter === 'Todas'
                ? 'Registre fotos de postura, cicatrizes cirúrgicas, edemas ou evolução de diástase.'
                : `Nenhum registro para a categoria "${selectedCategoryFilter}".`}
            </Text>
            <Button
              title="Adicionar Foto Clínica"
              onPress={handleAddPhotoPress}
              leadingIcon={<Ionicons name="camera" size={18} color={Colors.textInverse} />}
              style={styles.emptyActionButton}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.photoCountRow}>
              <Text style={styles.photoCountText}>
                {filteredPhotos.length}{' '}
                {filteredPhotos.length === 1 ? 'registro encontrado' : 'registros encontrados'}
              </Text>
            </View>

            <View style={styles.photoGrid}>
              {filteredPhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoCard}
                  onPress={() => {
                    Haptics.selection();
                    setActivePhoto(photo);
                  }}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.photo_uri }} style={styles.photoThumbnail} />
                  <View style={styles.photoCardMeta}>
                    <Badge
                      label={photo.category}
                      variant="primary"
                      styleType="subtle"
                      size="sm"
                      style={styles.cardBadge}
                    />
                    <Text style={styles.cardDateText}>
                      {formatDateBR(photo.date)}
                    </Text>
                    {photo.title ? (
                      <Text style={styles.cardTitleText} numberOfLines={1}>
                        {photo.title}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: NEW PHOTO METADATA SHEET */}
        {/* ========================================================================= */}
        <Modal
          visible={isFormVisible}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setIsFormVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.formContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.formNavBar}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selection();
                  setIsFormVisible(false);
                }}
              >
                <Text style={styles.formCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.formNavTitle}>Detalhes da Foto</Text>
              <TouchableOpacity onPress={handleSaveNewPhoto} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Text style={styles.formSaveText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {pendingUri ? (
                <View style={styles.formPreviewContainer}>
                  <Image source={{ uri: pendingUri }} style={styles.formPreviewImage} />
                </View>
              ) : null}

              {/* Category Selector */}
              <Text style={styles.formFieldLabel}>Categoria Clínica</Text>
              <View style={styles.formCategoryGrid}>
                {FORM_CATEGORIES.map((cat) => {
                  const isSel = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => {
                        Haptics.selection();
                        setFormCategory(cat);
                      }}
                      style={[styles.formCatChip, isSel && styles.formCatChipSelected]}
                    >
                      <Text
                        style={[
                          styles.formCatChipText,
                          isSel && styles.formCatChipTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title */}
              <Text style={styles.formFieldLabel}>Título / Identificação (opcional)</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="Ex.: Vista Posterior - Escoliose toracolombar"
                placeholderTextColor={Colors.textTertiary}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Notes */}
              <Text style={styles.formFieldLabel}>Observações Clínicas / Conduta</Text>
              <TextInput
                style={[styles.formTextInput, styles.formTextArea]}
                placeholder="Ex.: Presença de assimetria no triângulo de Tales à D. Retração de cadeia posterior observada..."
                placeholderTextColor={Colors.textTertiary}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={4}
              />

              <Button
                title="Salvar no Prontuário"
                onPress={handleSaveNewPhoto}
                loading={isSaving}
                size="large"
                fullWidth
                style={{ marginTop: Spacing.md }}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 2: FULLSCREEN PHOTO DETAIL VIEWER */}
        {/* ========================================================================= */}
        <Modal
          visible={Boolean(activePhoto)}
          animationType="fade"
          transparent
          onRequestClose={() => setActivePhoto(null)}
        >
          <View style={styles.viewerOverlay}>
            <View style={styles.viewerHeader}>
              <TouchableOpacity
                style={styles.viewerCloseBtn}
                onPress={() => {
                  Haptics.selection();
                  setActivePhoto(null);
                }}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              {activePhoto ? (
                <TouchableOpacity
                  style={styles.viewerDeleteBtn}
                  onPress={() => handleDeletePhoto(activePhoto)}
                >
                  <Ionicons name="trash-outline" size={24} color={Colors.destructiveLight} />
                </TouchableOpacity>
              ) : null}
            </View>

            {activePhoto ? (
              <View style={styles.viewerContent}>
                <Image
                  source={{ uri: activePhoto.photo_uri }}
                  style={styles.viewerFullImage}
                  resizeMode="contain"
                />

                <View style={styles.viewerInfoCard}>
                  <View style={styles.viewerMetaRow}>
                    <Badge
                      label={activePhoto.category}
                      variant="primary"
                      size="sm"
                    />
                    <Text style={styles.viewerDateText}>
                      Data: {formatDateBR(activePhoto.date)}
                    </Text>
                  </View>

                  {activePhoto.title ? (
                    <Text style={styles.viewerTitleText}>{activePhoto.title}</Text>
                  ) : null}

                  {activePhoto.notes ? (
                    <Text style={styles.viewerNotesText}>{activePhoto.notes}</Text>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - GRID_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  navBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenMarginHorizontal,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
    backgroundColor: Colors.surface,
  },
  navCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
  },
  navTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  navTitle: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  navSubtitle: {
    ...Typography.caption2,
    color: Colors.primaryDark,
    fontWeight: '600',
    marginTop: 1,
  },
  navAddBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySubtle,
  },
  filtersWrapper: {
    backgroundColor: Colors.surface,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  filtersScrollContent: {
    paddingHorizontal: Layout.screenMarginHorizontal,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  filterChipSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  filterChipText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextSelected: {
    color: Colors.textInverse,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.callout,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyActionButton: {
    paddingHorizontal: 24,
  },
  gridScroll: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: Layout.screenMarginHorizontal,
    paddingTop: 12,
    paddingBottom: Spacing.xxl,
  },
  photoCountRow: {
    marginBottom: 10,
  },
  photoCountText: {
    ...Typography.caption2,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  photoCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  photoThumbnail: {
    width: '100%',
    height: CARD_WIDTH * 0.9,
    backgroundColor: Colors.surfaceSecondary,
  },
  photoCardMeta: {
    padding: 8,
  },
  cardBadge: {
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  cardDateText: {
    ...Typography.caption2,
    color: Colors.textSecondary,
  },
  cardTitleText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  // Form Modal Styles
  formContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  formNavBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  formCancelText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  formNavTitle: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  formSaveText: {
    ...Typography.headline,
    fontWeight: '700',
    color: Colors.primary,
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
    paddingBottom: Spacing.xxl,
  },
  formPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  formPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceSecondary,
  },
  formFieldLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  formCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  formCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  formCatChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  formCatChipText: {
    ...Typography.caption1,
    color: Colors.textPrimary,
  },
  formCatChipTextSelected: {
    color: Colors.textInverse,
    fontWeight: '600',
  },
  formTextInput: {
    ...Typography.body,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.textPrimary,
  },
  formTextArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  // Fullscreen Viewer Styles
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'space-between',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  viewerCloseBtn: {
    padding: 6,
  },
  viewerDeleteBtn: {
    padding: 6,
  },
  viewerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  viewerFullImage: {
    width: '100%',
    height: '65%',
  },
  viewerInfoCard: {
    backgroundColor: 'rgba(30, 20, 40, 0.85)',
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    padding: 16,
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  viewerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  viewerDateText: {
    ...Typography.footnote,
    color: '#CCCCCC',
  },
  viewerTitleText: {
    ...Typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  viewerNotesText: {
    ...Typography.subhead,
    color: '#E0D8E5',
    lineHeight: 20,
  },
});
