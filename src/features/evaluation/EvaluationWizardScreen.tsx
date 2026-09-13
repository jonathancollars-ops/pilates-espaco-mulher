/**
 * EvaluationWizardScreen.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple HIG Physiotherapy Evaluation Wizard.
 * 4 Core Sections via SegmentedControl:
 * 1. Dados Pessoais: Patient identity & clinical registration overview.
 * 2. Anamnese Clínica: Inset Grouped List with tests, meds, allergies, surgeries,
 *    fractures, luxations, pregnancies, abortions, physical activity & EVA pain scale.
 * 3. Avaliação Física / Postural: Ergonomic rapid selectors for Frontal, Lateral,
 *    Posterior views & Musculature.
 * 4. Bioimpedância Evolutiva: Historical assessments list and new measurement form with
 *    real-time auto-computed BMI & BMR (TMB).
 * Top/Footer Action: "Exportar Relatório PDF" calling generateClinicalReportPdf.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
  Layout,
  LargeTitleLayout,
  Haptics,
  InsetGroupedList,
  InsetGroup,
  InsetRow,
  SegmentedControl,
  Button,
  Badge,
  Card,
  ClinicIdentity,
  CLINIC_IDENTITY,
} from '../../design-system';
import { Patient } from '../../types/patient';
import {
  Anamnesis,
  FractureEntry,
  LuxationEntry,
  PregnancyEntry,
  AbortionEntry,
  PainComplaintEntry,
  UpsertAnamnesisInput,
} from '../../types/anamnesis';
import {
  PosturalEvaluation,
  CreatePosturalInput,
  PosturalAlignmentDirection,
  KneePosturalType,
  SagittalCervicalType,
  SagittalDorsalType,
  SagittalLumbarType,
  PelvisTiltType,
  PlantarArchType,
} from '../../types/postural';
import {
  Bioimpedance,
  CreateBioimpedanceInput,
} from '../../types/bioimpedance';
import { usePatients } from '../patients/PatientContext';
import { anamnesisRepository } from '../../database/repositories/anamnesisRepository';
import { posturalRepository } from '../../database/repositories/posturalRepository';
import { bioimpedanceRepository } from '../../database/repositories/bioimpedanceRepository';
import { generateClinicalReportPdf } from '../../services/pdfService';
import { calculateBMI, calculateBMR, classifyVisceralFat } from '../../utils/biometrics';
import {
  formatPhone,
  formatDateBR,
  calculateAge,
  formatWeight,
  formatHeight,
  formatPercent,
  formatDecimalBR,
} from '../../utils/formatters';
import { BioimpedanceReferenceModal } from './BioimpedanceReferenceModal';
import { PatientConditionPhotosModal } from './PatientConditionPhotosModal';

export interface EvaluationWizardScreenProps {
  patientId?: string;
  onGoBack?: () => void;
  onNavigateToWorkouts?: (patientId: string) => void;
}

export function EvaluationWizardScreen({
  patientId: initialPatientId,
  onGoBack,
  onNavigateToWorkouts,
}: EvaluationWizardScreenProps) {
  const { patients, getPatientById } = usePatients();

  // Selected Patient State
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPatientId || (patients.length > 0 ? patients[0].id : '')
  );

  const activePatient = useMemo<Patient | undefined>(() => {
    return getPatientById(selectedPatientId) || patients.find((p) => p.id === selectedPatientId);
  }, [selectedPatientId, getPatientById, patients]);

  // Tab State: 0 = Dados, 1 = Anamnese, 2 = Postural, 3 = Bioimpedância
  const [activeTab, setActiveTab] = useState<number>(0);
  const tabNames = ['Dados Pessoais', 'Anamnese', 'Postural', 'Bioimpedância'] as const;

  // Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  // Entities
  const [anamnesis, setAnamnesis] = useState<Anamnesis | null>(null);
  const [posturalList, setPosturalList] = useState<PosturalEvaluation[]>([]);
  const [bioimpedanceList, setBioimpedanceList] = useState<Bioimpedance[]>([]);

  // ---------------------------------------------------------------------------
  // Load patient clinical records
  // ---------------------------------------------------------------------------
  const loadClinicalData = useCallback(async () => {
    if (!selectedPatientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [anamData, postData, bioData] = await Promise.all([
        anamnesisRepository.findByPatientId(selectedPatientId),
        posturalRepository.listByPatientId(selectedPatientId),
        bioimpedanceRepository.listByPatientId(selectedPatientId),
      ]);

      setAnamnesis(anamData);
      setPosturalList(postData);
      setBioimpedanceList(bioData);
    } catch (err) {
      console.error('[EvaluationWizardScreen] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    loadClinicalData();
  }, [loadClinicalData]);

  // ---------------------------------------------------------------------------
  // ABA 2: Anamnese Form State
  // ---------------------------------------------------------------------------
  const [clinicalHistory, setClinicalHistory] = useState('');
  const [labTests, setLabTests] = useState('');
  const [imagingExams, setImagingExams] = useState('');
  const [medications, setMedications] = useState('');
  const [allergies, setAllergies] = useState('');
  const [surgeries, setSurgeries] = useState('');
  const [hasFracture, setHasFracture] = useState<'sim' | 'nao'>('nao');
  const [fractureLocation, setFractureLocation] = useState('');
  const [fractureImmobilization, setFractureImmobilization] = useState('');
  const [fracturePhysio, setFracturePhysio] = useState('');
  const [hasLuxation, setHasLuxation] = useState<'sim' | 'nao'>('nao');
  const [luxationLocation, setLuxationLocation] = useState('');
  const [luxationPhysio, setLuxationPhysio] = useState('');
  const [hasPregnancy, setHasPregnancy] = useState<'sim' | 'nao'>('nao');
  const [pregnancyCount, setPregnancyCount] = useState('0');
  const [deliveryType, setDeliveryType] = useState<'Normal' | 'Cesárea' | 'Cesariana' | 'Ambos'>('Cesariana');
  const [lastPregnancyTime, setLastPregnancyTime] = useState('');
  const [pregnancyComplications, setPregnancyComplications] = useState('');
  const [hasAbortion, setHasAbortion] = useState<'sim' | 'nao'>('nao');
  const [abortionCount, setAbortionCount] = useState('0');
  const [abortionAge, setAbortionAge] = useState('');
  const [abortionNotes, setAbortionNotes] = useState('');
  const [physicalActivity, setPhysicalActivity] = useState('');
  const [painIntensity, setPainIntensity] = useState<number>(0);
  const [painLocation, setPainLocation] = useState('');
  const [painCharacteristics, setPainCharacteristics] = useState('');
  const [painAggravating, setPainAggravating] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');

  // Hydrate Anamnese form when record loaded
  useEffect(() => {
    if (anamnesis) {
      setClinicalHistory(anamnesis.clinical_history || '');
      setLabTests(anamnesis.lab_tests || '');
      setImagingExams(anamnesis.imaging_exams || '');
      setMedications(anamnesis.medications || '');
      setAllergies(anamnesis.allergies || '');
      setSurgeries(anamnesis.surgeries || '');
      setPhysicalActivity(anamnesis.physical_activity || '');
      setPainIntensity(anamnesis.pain_intensity ?? 0);
      setClinicalNotes(anamnesis.clinical_notes || '');

      const frac = anamnesis.fractures as FractureEntry | null;
      if (frac && typeof frac === 'object') {
        setHasFracture(frac.has || 'nao');
        setFractureLocation(frac.location || '');
        setFractureImmobilization(frac.immobilization || '');
        setFracturePhysio(frac.physiotherapy || '');
      }

      const lux = anamnesis.luxations as LuxationEntry | null;
      if (lux && typeof lux === 'object') {
        setHasLuxation(lux.has || 'nao');
        setLuxationLocation(lux.location || '');
        setLuxationPhysio(lux.physiotherapy || '');
      }

      const preg = anamnesis.pregnancies as PregnancyEntry | null;
      if (preg && typeof preg === 'object') {
        setHasPregnancy(preg.has || 'nao');
        setPregnancyCount(String(preg.quantity ?? 0));
        const dt = preg.delivery_type;
        if (dt === 'Normal' || dt === 'Cesárea' || dt === 'Cesariana' || dt === 'Ambos') {
          setDeliveryType(dt);
        } else if (dt === 'cesarean') {
          setDeliveryType('Cesárea');
        } else if (dt === 'normal') {
          setDeliveryType('Normal');
        } else if (dt === 'both') {
          setDeliveryType('Ambos');
        } else {
          setDeliveryType('Cesariana');
        }
        setLastPregnancyTime(preg.last_pregnancy_time || '');
        setPregnancyComplications(preg.complications || '');
      }

      const ab = anamnesis.abortions as AbortionEntry | null;
      if (ab && typeof ab === 'object') {
        setHasAbortion(ab.has || 'nao');
        setAbortionCount(String(ab.quantity ?? 0));
        setAbortionAge(ab.gestational_age || '');
        setAbortionNotes(ab.notes || '');
      }

      const complaints = anamnesis.pain_complaints as PainComplaintEntry[] | null;
      if (Array.isArray(complaints) && complaints.length > 0) {
        setPainLocation(complaints[0].location || '');
        setPainCharacteristics(complaints[0].characteristics || '');
        setPainAggravating(complaints[0].aggravating_factors || '');
      }
    } else {
      // Reset defaults
      setClinicalHistory('');
      setLabTests('');
      setImagingExams('');
      setMedications('');
      setAllergies('');
      setSurgeries('');
      setHasFracture('nao');
      setFractureLocation('');
      setFractureImmobilization('');
      setFracturePhysio('');
      setHasLuxation('nao');
      setLuxationLocation('');
      setLuxationPhysio('');
      setHasPregnancy('nao');
      setPregnancyCount('0');
      setDeliveryType('Cesariana');
      setLastPregnancyTime('');
      setPregnancyComplications('');
      setHasAbortion('nao');
      setAbortionCount('0');
      setAbortionAge('');
      setAbortionNotes('');
      setPhysicalActivity('');
      setPainIntensity(0);
      setPainLocation('');
      setPainCharacteristics('');
      setPainAggravating('');
      setClinicalNotes('');
    }
  }, [anamnesis]);

  const handleSaveAnamnesis = async () => {
    if (!selectedPatientId) return;

    try {
      setSaving(true);
      Haptics.impactMedium();

      const input: UpsertAnamnesisInput = {
        clinical_history: clinicalHistory.trim() || null,
        lab_tests: labTests.trim() || null,
        imaging_exams: imagingExams.trim() || null,
        medications: medications.trim() || null,
        allergies: allergies.trim() || null,
        surgeries: surgeries.trim() || null,
        fractures: {
          has: hasFracture,
          location: fractureLocation.trim() || undefined,
          immobilization: fractureImmobilization.trim() || undefined,
          physiotherapy: fracturePhysio.trim() || undefined,
        },
        luxations: {
          has: hasLuxation,
          location: luxationLocation.trim() || undefined,
          physiotherapy: luxationPhysio.trim() || undefined,
        },
        pregnancies: {
          has: hasPregnancy,
          quantity: parseInt(pregnancyCount, 10) || 0,
          delivery_type: deliveryType,
          last_pregnancy_time: lastPregnancyTime.trim() || undefined,
          complications: pregnancyComplications.trim() || undefined,
        },
        abortions: {
          has: hasAbortion,
          quantity: parseInt(abortionCount, 10) || 0,
          gestational_age: abortionAge.trim() || undefined,
          notes: abortionNotes.trim() || undefined,
        },
        physical_activity: physicalActivity.trim() || null,
        pain_intensity: painIntensity,
        pain_complaints: painLocation.trim()
          ? [
              {
                location: painLocation.trim(),
                eva_intensity: painIntensity,
                characteristics: painCharacteristics.trim() || undefined,
                aggravating_factors: painAggravating.trim() || undefined,
              },
            ]
          : null,
        clinical_notes: clinicalNotes.trim() || null,
      };

      const updated = await anamnesisRepository.upsert(selectedPatientId, input);
      setAnamnesis(updated);
      Haptics.success();
      Alert.alert('Sucesso', 'Anamnese clínica salva com sucesso!');
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar a anamnese.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ABA 3: Avaliação Postural Form State
  // ---------------------------------------------------------------------------
  const [headAlign, setHeadAlign] = useState<'D' | 'E' | 'Neutra'>('Neutra');
  const [shouldersAlign, setShouldersAlign] = useState<'D' | 'E' | 'Alinhados'>('Alinhados');
  const [thalesAlign, setThalesAlign] = useState<'D' | 'E' | 'Simétrico'>('Simétrico');
  const [kneesAlign, setKneesAlign] = useState<KneePosturalType>('Neutro');
  const [feetAlign, setFeetAlign] = useState<string>('Neutro');
  const [cervicalAlign, setCervicalAlign] = useState<SagittalCervicalType>('Neutra');
  const [lateralShoulders, setLateralShoulders] = useState<'Protrusao' | 'Neutro'>('Neutro');
  const [abdomenAlign, setAbdomenAlign] = useState<string>('Neutro');
  const [dorsalAlign, setDorsalAlign] = useState<SagittalDorsalType>('Neutra');
  const [lumbarAlign, setLumbarAlign] = useState<SagittalLumbarType>('Neutra');
  const [pelvisAlign, setPelvisAlign] = useState<PelvisTiltType>('Neutra');
  const [plantarArch, setPlantarArch] = useState<PlantarArchType>('Sim');
  const [scapulaAlign, setScapulaAlign] = useState<string>('Neutra');
  const [scoliosisAlign, setScoliosisAlign] = useState<string>('Ausente');
  const [glutealLine, setGlutealLine] = useState<'D' | 'E' | 'Alinhada'>('Alinhada');
  const [poplitealLine, setPoplitealLine] = useState<'D' | 'E' | 'Alinhada'>('Alinhada');
  const [hipAlign, setHipAlign] = useState<string>('Nivelado');
  const [musculatureAlign, setMusculatureAlign] = useState<string>('Normotrófica');
  const [posturalNotes, setPosturalNotes] = useState<string>('');
  const [conditionPhotosVisible, setConditionPhotosVisible] = useState<boolean>(false);

  const latestPostural = posturalList.length > 0 ? posturalList[0] : null;

  useEffect(() => {
    if (latestPostural) {
      setHeadAlign(latestPostural.head || 'Neutra');
      setShouldersAlign(latestPostural.shoulders || 'Alinhados');
      setThalesAlign(latestPostural.thales_triangle || 'Simétrico');
      setKneesAlign(latestPostural.knees || 'Neutro');
      setFeetAlign(latestPostural.feet || 'Neutro');
      setCervicalAlign(latestPostural.cervical || 'Neutra');
      setLateralShoulders(latestPostural.lateral_shoulders || 'Neutro');
      setAbdomenAlign(latestPostural.abdomen || 'Neutro');
      setDorsalAlign(latestPostural.dorsal || 'Neutra');
      setLumbarAlign(latestPostural.lumbar || 'Neutra');
      setPelvisAlign(latestPostural.pelvis || 'Neutra');
      setPlantarArch(latestPostural.arch || 'Sim');
      setScapulaAlign(latestPostural.scapula || 'Neutra');
      setScoliosisAlign(latestPostural.scoliosis || 'Ausente');
      setGlutealLine(latestPostural.gluteal_line || 'Alinhada');
      setPoplitealLine(latestPostural.popliteal_line || 'Alinhada');
      setHipAlign(latestPostural.hip_alignment || 'Nivelado');
      setMusculatureAlign(latestPostural.musculature || 'Normotrófica');
      setPosturalNotes(latestPostural.notes || '');
    }
  }, [latestPostural]);

  const handleSavePostural = async () => {
    if (!selectedPatientId) return;

    try {
      setSaving(true);
      Haptics.impactMedium();

      const todayIso = new Date().toISOString().slice(0, 10);
      const input: CreatePosturalInput = {
        evaluation_date: todayIso,
        head: headAlign,
        shoulders: shouldersAlign,
        thales_triangle: thalesAlign,
        knees: kneesAlign,
        feet: feetAlign,
        cervical: cervicalAlign,
        lateral_shoulders: lateralShoulders,
        abdomen: abdomenAlign,
        dorsal: dorsalAlign,
        lumbar: lumbarAlign,
        pelvis: pelvisAlign,
        arch: plantarArch,
        scapula: scapulaAlign,
        scoliosis: scoliosisAlign,
        gluteal_line: glutealLine,
        popliteal_line: poplitealLine,
        hip_alignment: hipAlign,
        musculature: musculatureAlign,
        notes: posturalNotes.trim() || null,
      };

      const created = await posturalRepository.create(selectedPatientId, input);
      setPosturalList((prev) => [created, ...prev]);
      Haptics.success();
      Alert.alert('Sucesso', 'Avaliação postural registrada com sucesso!');
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar a avaliação postural.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // ABA 4: Bioimpedância Form State
  // ---------------------------------------------------------------------------
  const [bioWeight, setBioWeight] = useState('');
  const [bioHeight, setBioHeight] = useState(activePatient?.age ? '165' : '165');
  const [bioAbdominalCirc, setBioAbdominalCirc] = useState('');
  const [bioFatPct, setBioFatPct] = useState('24.5');
  const [bioVisceralFat, setBioVisceralFat] = useState('4');
  const [bioMuscleKg, setBioMuscleKg] = useState('42.0');
  const [bioFatArmR, setBioFatArmR] = useState('');
  const [bioFatArmL, setBioFatArmL] = useState('');
  const [bioFatTrunk, setBioFatTrunk] = useState('');
  const [bioFatLegR, setBioFatLegR] = useState('');
  const [bioFatLegL, setBioFatLegL] = useState('');
  const [bioOpinion, setBioOpinion] = useState('');
  const [referenceModalVisible, setReferenceModalVisible] = useState<boolean>(false);

  // Auto-calculated BMI and BMR
  const numericWeight = parseFloat(bioWeight.replace(',', '.')) || 0;
  const numericHeight = parseFloat(bioHeight.replace(',', '.')) || 0;
  const patientAge = activePatient?.age ?? (activePatient?.birthdate ? calculateAge(activePatient.birthdate) : 35) ?? 35;

  const [bioChronologicalAge, setBioChronologicalAge] = useState(patientAge ? String(patientAge) : '');
  const [bioBodyAge, setBioBodyAge] = useState('');

  // Update chronological age when patient changes
  useEffect(() => {
    if (activePatient) {
      const computed = activePatient.age ?? (activePatient.birthdate ? calculateAge(activePatient.birthdate) : null);
      if (computed) {
        setBioChronologicalAge(String(computed));
      }
    }
  }, [activePatient]);

  const autoBmi = useMemo(() => {
    return calculateBMI(numericWeight, numericHeight);
  }, [numericWeight, numericHeight]);

  const autoBmr = useMemo(() => {
    return calculateBMR({
      weightKg: numericWeight,
      heightCm: numericHeight,
      ageYears: patientAge,
      sex: 'female',
    });
  }, [numericWeight, numericHeight, patientAge]);

  const visceralEval = useMemo(() => {
    const level = parseInt(bioVisceralFat, 10) || 1;
    return classifyVisceralFat(level);
  }, [bioVisceralFat]);

  // Comparison between chronological age and body age
  const ageComparison = useMemo(() => {
    const chron = parseInt(bioChronologicalAge, 10);
    const body = parseInt(bioBodyAge, 10);
    if (isNaN(chron) || isNaN(body) || chron <= 0 || body <= 0) return null;
    const diff = body - chron;
    if (diff < 0) {
      return {
        label: `Rejuvenescimento (${diff} anos)`,
        variant: 'success' as const,
        description: 'Metabolismo e composição corporal mais jovens que a idade real',
      };
    } else if (diff > 0) {
      return {
        label: `Idade Aumentada (+${diff} anos)`,
        variant: 'alert' as const,
        description: 'Atenção: Idade metabólica corporal superior à idade cronológica',
      };
    }
    return {
      label: 'Idade Equivalente (0)',
      variant: 'primary' as const,
      description: 'Idade metabólica alinhada com a idade cronológica',
    };
  }, [bioChronologicalAge, bioBodyAge]);

  const handleSaveBioimpedance = async () => {
    if (!selectedPatientId) return;

    if (numericWeight <= 0 || numericHeight <= 0) {
      Haptics.warning();
      Alert.alert('Atenção', 'Informe peso e altura válidos para registrar a bioimpedância.');
      return;
    }

    try {
      setSaving(true);
      Haptics.impactMedium();

      const todayIso = new Date().toISOString().slice(0, 10);
      const input: CreateBioimpedanceInput = {
        evaluation_date: todayIso,
        weight: numericWeight,
        height: numericHeight,
        abdominal_circ: bioAbdominalCirc ? parseFloat(bioAbdominalCirc.replace(',', '.')) : null,
        bmi: autoBmi.value,
        chronological_age: parseInt(bioChronologicalAge, 10) || null,
        body_age: parseInt(bioBodyAge, 10) || null,
        bmr: autoBmr,
        body_fat_percent: parseFloat(bioFatPct.replace(',', '.')) || 0,
        visceral_fat: parseInt(bioVisceralFat, 10) || 1,
        muscle_mass_kg: parseFloat(bioMuscleKg.replace(',', '.')) || 0,
        fat_arm_r: bioFatArmR ? parseFloat(bioFatArmR.replace(',', '.')) : null,
        fat_arm_l: bioFatArmL ? parseFloat(bioFatArmL.replace(',', '.')) : null,
        fat_trunk: bioFatTrunk ? parseFloat(bioFatTrunk.replace(',', '.')) : null,
        fat_leg_r: bioFatLegR ? parseFloat(bioFatLegR.replace(',', '.')) : null,
        fat_leg_l: bioFatLegL ? parseFloat(bioFatLegL.replace(',', '.')) : null,
        clinical_opinion: bioOpinion.trim() || null,
      };

      const created = await bioimpedanceRepository.create(selectedPatientId, input);
      setBioimpedanceList((prev) => [created, ...prev]);
      Haptics.success();
      Alert.alert('Sucesso', 'Aferição de bioimpedância cadastrada com sucesso!');
      setBioWeight('');
      setBioAbdominalCirc('');
      setBioBodyAge('');
      setBioOpinion('');
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro', err?.message || 'Não foi possível salvar a bioimpedância.');
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Export Clinical Report PDF
  // ---------------------------------------------------------------------------
  const handleExportPdf = async () => {
    if (!activePatient) {
      Alert.alert('Paciente não selecionado', 'Selecione um paciente para emitir o relatório.');
      return;
    }

    try {
      setExportingPdf(true);
      Haptics.impactHeavy();

      await generateClinicalReportPdf(
        activePatient,
        anamnesis,
        latestPostural,
        bioimpedanceList,
        {
          share: true,
          dialogTitle: `Relatório Clínico - ${activePatient.name}`,
        }
      );

      Haptics.success();
    } catch (err: any) {
      Haptics.error();
      Alert.alert('Erro ao Gerar PDF', err?.message || 'Falha na geração do relatório.');
    } finally {
      setExportingPdf(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Seletor Tátil de Opções (Chips/Pills)
  // ---------------------------------------------------------------------------
  const renderOptionSelector = <T extends string>(
    label: string,
    options: readonly T[],
    currentValue: T,
    onSelect: (val: T) => void,
    subtitle?: string
  ) => {
    return (
      <View style={styles.optionBlock}>
        <View style={styles.optionHeaderRow}>
          <Text style={styles.optionLabel}>{label}</Text>
          {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.optionChipsRow}>
          {options.map((opt) => {
            const isSelected = opt === currentValue;
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  Haptics.selection();
                  onSelect(opt);
                }}
                style={[
                  styles.optionChip,
                  isSelected && styles.optionChipSelected,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    isSelected && styles.optionChipTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // If no patient in database
  if (!activePatient && !loading) {
    return (
      <LargeTitleLayout title="Avaliação" subtitle="Fisioterapia & Pilates">
        <Card title="Nenhum Paciente Selecionado">
          <Text style={styles.emptyNoticeText}>
            Cadastre um paciente no Dashboard para iniciar sua ficha de avaliação clínica.
          </Text>
        </Card>
      </LargeTitleLayout>
    );
  }

  return (
    <LargeTitleLayout
      title="Ficha Clínica"
      subtitle={activePatient ? activePatient.name : 'Avaliação Fisioterapêutica'}
      leftAction={
        onGoBack ? (
          <TouchableOpacity
            onPress={() => {
              Haptics.selection();
              onGoBack();
            }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
        ) : null
      }
      rightAction={
        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={exportingPdf}
          style={styles.headerPdfButton}
          activeOpacity={0.8}
        >
          {exportingPdf ? (
            <ActivityIndicator size="small" color={Colors.textInverse} />
          ) : (
            <>
              <Ionicons name="document-text" size={16} color={Colors.textInverse} style={{ marginRight: 4 }} />
              <Text style={styles.headerPdfButtonText}>PDF</Text>
            </>
          )}
        </TouchableOpacity>
      }
    >
      {/* 1. Patient Quick Switcher (if more than 1 patient exists) */}
      {patients.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.patientSwitcherScroll}
          contentContainerStyle={styles.patientSwitcherContent}
        >
          {patients.map((p) => {
            const isCurrent = p.id === selectedPatientId;
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => {
                  if (p.id !== selectedPatientId) {
                    Haptics.selection();
                    setSelectedPatientId(p.id);
                  }
                }}
                style={[
                  styles.patientPill,
                  isCurrent && styles.patientPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.patientPillText,
                    isCurrent && styles.patientPillTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {p.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 2. Apple HIG Segmented Control: 4 Tabs */}
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          values={tabNames}
          selectedIndex={activeTab}
          onChange={(index) => {
            Haptics.selection();
            setActiveTab(index);
          }}
        />
      </View>

      {/* 3. Loading Indicator */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Carregando prontuário clínico...</Text>
        </View>
      ) : (
        <>
          {/* ============================================================= */}
          {/* ABA 1: DADOS PESSOAIS */}
          {/* ============================================================= */}
          {activeTab === 0 && activePatient && (
            <View style={styles.tabContent}>
              {/* Patient Identity Hero Card */}
              <View style={styles.patientHeroCard}>
                <View style={styles.patientAvatarLarge}>
                  <Text style={styles.patientAvatarLargeText}>
                    {activePatient.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.patientHeroInfo}>
                  <Text style={styles.patientHeroName}>{activePatient.name}</Text>
                  <Text style={styles.patientHeroMeta}>
                    {activePatient.age ? `${activePatient.age} anos` : 'Idade não informada'}
                    {activePatient.birthdate ? ` • Nasc. ${formatDateBR(activePatient.birthdate)}` : ''}
                  </Text>
                  <View style={styles.heroBadgesRow}>
                    <Badge
                      label={
                        activePatient.status === 'active'
                          ? 'Em Tratamento'
                          : activePatient.status === 'discharged'
                          ? 'Alta'
                          : 'Inativo'
                      }
                      variant={
                        activePatient.status === 'active'
                          ? 'success'
                          : activePatient.status === 'discharged'
                          ? 'neutral'
                          : 'warning'
                      }
                      size="sm"
                    />
                    <Badge
                      label={activePatient.insurance || 'Particular'}
                      variant="primary"
                      styleType="subtle"
                      size="sm"
                    />
                  </View>
                </View>
              </View>

              <InsetGroupedList scrollable={false}>
                <InsetGroup header="Informações de Contato & Localização">
                  <InsetRow
                    icon="logo-whatsapp"
                    iconBackgroundColor={Colors.successLight}
                    iconColor={Colors.success}
                    label="Telefone / WhatsApp"
                    value={formatPhone(activePatient.phone)}
                    onPress={() => {
                      const digits = activePatient.phone.replace(/\D/g, '');
                      Linking.openURL(`https://wa.me/55${digits}`);
                    }}
                  />
                  <InsetRow
                    icon="location-outline"
                    label="Bairro e Cidade"
                    value={`${activePatient.neighborhood || 'Costa Azul'}, ${activePatient.city_state || 'Rio das Ostras - RJ'}`}
                  />
                  {activePatient.address ? (
                    <InsetRow
                      icon="home-outline"
                      label="Endereço"
                      value={activePatient.address}
                    />
                  ) : null}
                  {activePatient.email ? (
                    <InsetRow
                      icon="mail-outline"
                      label="E-mail"
                      value={activePatient.email}
                    />
                  ) : null}
                </InsetGroup>

                <InsetGroup header="Prontuário & Histórico Clínico">
                  <InsetRow
                    icon="calendar-outline"
                    label="Cadastrado em"
                    value={formatDateBR(activePatient.created_at)}
                  />
                  <InsetRow
                    icon="document-text-outline"
                    label="Anamnese Registrada"
                    value={anamnesis ? 'Sim (Completa)' : 'Pendente'}
                    accessory={
                      <Badge
                        label={anamnesis ? 'Atualizada' : 'Pendente'}
                        variant={anamnesis ? 'success' : 'warning'}
                        size="sm"
                      />
                    }
                  />
                  <InsetRow
                    icon="body-outline"
                    label="Avaliações Posturais"
                    value={`${posturalList.length} registradas`}
                  />
                  <InsetRow
                    icon="fitness-outline"
                    label="Histórico de Bioimpedâncias"
                    value={`${bioimpedanceList.length} aferições`}
                  />
                  {onNavigateToWorkouts ? (
                    <InsetRow
                      icon="barbell-outline"
                      label="Prescrição de Treinos"
                      value="Abrir Módulo de Treinos"
                      onPress={() => onNavigateToWorkouts(activePatient.id)}
                    />
                  ) : null}
                </InsetGroup>
              </InsetGroupedList>

              <View style={styles.actionContainer}>
                <Button
                  title="Exportar Relatório PDF da Paciente"
                  onPress={handleExportPdf}
                  loading={exportingPdf}
                  leadingIcon={<Ionicons name="print-outline" size={20} color={Colors.textInverse} />}
                  fullWidth
                  size="large"
                />
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* ABA 2: ANAMNESE CLÍNICA */}
          {/* ============================================================= */}
          {activeTab === 1 && (
            <View style={styles.tabContent}>
              <InsetGroupedList scrollable={false}>
                {/* 0. Histórico Clínico */}
                <InsetGroup
                  header="Histórico Clínico"
                  footer="Descreva o histórico de saúde pregressa, patologias associadas e queixas principais."
                >
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Histórico Clínico do Paciente</Text>
                    <TextInput
                      style={[styles.textInputMulti, { minHeight: 100 }]}
                      value={clinicalHistory}
                      onChangeText={setClinicalHistory}
                      placeholder="Descreva o histórico clínico, patologias prévias, histórico familiar, tratamentos anteriores..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                </InsetGroup>

                {/* 1. Exames e Medicamentos */}
                <InsetGroup
                  header="Exames & Medicamentos"
                  footer="Registre resultados relevantes para adequação das cargas e restrições."
                >
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Exames Laboratoriais</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={labTests}
                      onChangeText={setLabTests}
                      placeholder="Ex.: Hemograma ok, Vitamina D baixa..."
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Exames de Imagem (RX, RM, TC)</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={imagingExams}
                      onChangeText={setImagingExams}
                      placeholder="Ex.: RM Coluna: protrusão discal L4-L5 sem compressão"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Medicamentos em Uso</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={medications}
                      onChangeText={setMedications}
                      placeholder="Ex.: Anti-hipertensivo, analgésico SOS..."
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Alergias Conhecidas</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={allergies}
                      onChangeText={setAllergies}
                      placeholder="Ex.: Látex, analgésicos..."
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </InsetGroup>

                {/* 2. Histórico Cirúrgico e Traumático */}
                <InsetGroup header="Cirurgias, Fraturas e Luxações">
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Cirurgias Prévias</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={surgeries}
                      onChangeText={setSurgeries}
                      placeholder="Ex.: Artroscopia joelho D (2022), Apendicectomia"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Fraturas */}
                  <View style={styles.nestedSection}>
                    {renderOptionSelector('Histórico de Fraturas?', ['sim', 'nao'] as const, hasFracture, setHasFracture)}
                    {hasFracture === 'sim' && (
                      <View style={styles.subFieldsBox}>
                        <TextInput
                          style={styles.textInputSub}
                          value={fractureLocation}
                          onChangeText={setFractureLocation}
                          placeholder="Local da fratura (ex.: Rádio distal D)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                          style={styles.textInputSub}
                          value={fractureImmobilization}
                          onChangeText={setFractureImmobilization}
                          placeholder="Tempo/tipo de imobilização (ex.: Gesso 45 dias)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                          style={styles.textInputSub}
                          value={fracturePhysio}
                          onChangeText={setFracturePhysio}
                          placeholder="Fisioterapia realizada (ex.: 20 sessões)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>

                  {/* Luxações */}
                  <View style={styles.nestedSection}>
                    {renderOptionSelector('Histórico de Luxações?', ['sim', 'nao'] as const, hasLuxation, setHasLuxation)}
                    {hasLuxation === 'sim' && (
                      <View style={styles.subFieldsBox}>
                        <TextInput
                          style={styles.textInputSub}
                          value={luxationLocation}
                          onChangeText={setLuxationLocation}
                          placeholder="Local/articulação (ex.: Ombro E)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                          style={styles.textInputSub}
                          value={luxationPhysio}
                          onChangeText={setLuxationPhysio}
                          placeholder="Fisioterapia realizada / Tratamento"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>
                </InsetGroup>

                {/* 3. Gineco-Obstétrico */}
                <InsetGroup header="Histórico Gineco-Obstétrico">
                  <View style={styles.nestedSection}>
                    {renderOptionSelector('Gestação', ['sim', 'nao'] as const, hasPregnancy, setHasPregnancy)}
                    {hasPregnancy === 'sim' && (
                      <View style={styles.subFieldsBox}>
                        <View style={styles.inlineRowInput}>
                          <Text style={styles.inputSubLabel}>Quantidade de partos:</Text>
                          <TextInput
                            style={[styles.textInputSub, { width: 60, textAlign: 'center' }]}
                            keyboardType="numeric"
                            value={pregnancyCount}
                            onChangeText={setPregnancyCount}
                          />
                        </View>
                        {renderOptionSelector('Tipo de Parto', ['Normal', 'Cesárea', 'Ambos'] as const, deliveryType as any, setDeliveryType as any)}
                        <TextInput
                          style={styles.textInputSub}
                          value={lastPregnancyTime}
                          onChangeText={setLastPregnancyTime}
                          placeholder="Tempo desde o último parto (ex.: 2 anos, 6 meses)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                          style={styles.textInputSub}
                          value={pregnancyComplications}
                          onChangeText={setPregnancyComplications}
                          placeholder="Intercorrências / Diástase abdominal (ex.: 2.5cm supraumbilical)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.nestedSection}>
                    {renderOptionSelector('Aborto', ['sim', 'nao'] as const, hasAbortion, setHasAbortion)}
                    {hasAbortion === 'sim' && (
                      <View style={styles.subFieldsBox}>
                        <View style={styles.inlineRowInput}>
                          <Text style={styles.inputSubLabel}>Quantidade:</Text>
                          <TextInput
                            style={[styles.textInputSub, { width: 60, textAlign: 'center' }]}
                            keyboardType="numeric"
                            value={abortionCount}
                            onChangeText={setAbortionCount}
                          />
                        </View>
                        <TextInput
                          style={styles.textInputSub}
                          value={abortionAge}
                          onChangeText={setAbortionAge}
                          placeholder="Idade gestacional (ex.: 8 semanas)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                        <TextInput
                          style={styles.textInputSub}
                          value={abortionNotes}
                          onChangeText={setAbortionNotes}
                          placeholder="Observações do aborto (ex.: espontâneo, curetagem)"
                          placeholderTextColor={Colors.textTertiary}
                        />
                      </View>
                    )}
                  </View>
                </InsetGroup>

                {/* 4. Atividade Física & Queixa Álgica */}
                <InsetGroup
                  header="Atividade Física & Queixas de Dor"
                  footer="Avaliação da dor via Escala Visual Analógica (EVA) de 0 (sem dor) a 10 (dor insuportável)."
                >
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Atividade Física Atual / Prévia</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={physicalActivity}
                      onChangeText={setPhysicalActivity}
                      placeholder="Ex.: Caminhada 3x/semana, musculação interrompida"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  {/* Escala Visual Analógica (EVA) 0 a 10 */}
                  <View style={styles.evaSection}>
                    <View style={styles.evaHeaderRow}>
                      <Text style={styles.inputLabel}>Intensidade da Dor (EVA)</Text>
                      <View
                        style={[
                          styles.evaBadge,
                          {
                            backgroundColor:
                              painIntensity === 0
                                ? Colors.successLight
                                : painIntensity <= 3
                                ? Colors.successLight
                                : painIntensity <= 6
                                ? Colors.warningLight
                                : Colors.destructiveLight,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.evaBadgeText,
                            {
                              color:
                                painIntensity === 0
                                  ? Colors.success
                                  : painIntensity <= 3
                                  ? Colors.success
                                  : painIntensity <= 6
                                  ? Colors.warning
                                  : Colors.destructive,
                            },
                          ]}
                        >
                          {painIntensity === 0 ? 'Sem Dor (0)' : `Nível ${painIntensity}/10`}
                        </Text>
                      </View>
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evaScaleScroll}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => {
                        const isSelected = painIntensity === level;
                        return (
                          <TouchableOpacity
                            key={level}
                            onPress={() => {
                              Haptics.selection();
                              setPainIntensity(level);
                            }}
                            style={[
                              styles.evaPill,
                              isSelected && styles.evaPillSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.evaPillText,
                                isSelected && styles.evaPillTextSelected,
                              ]}
                            >
                              {level}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Localização Principal da Queixa</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={painLocation}
                      onChangeText={setPainLocation}
                      placeholder="Ex.: Coluna lombar L5-S1 irradiando para glúteo D"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Características da Dor</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={painCharacteristics}
                      onChangeText={setPainCharacteristics}
                      placeholder="Ex.: Pontada, peso, queimação, latejante..."
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Fatores Agravantes / Atenuantes</Text>
                    <TextInput
                      style={styles.textInputSingle}
                      value={painAggravating}
                      onChangeText={setPainAggravating}
                      placeholder="Ex.: Piora ao sentar prolongado; melhora ao deitar"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>

                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Observações Clínicas / Parecer Fisioterapêutico</Text>
                    <TextInput
                      style={styles.textInputMulti}
                      value={clinicalNotes}
                      onChangeText={setClinicalNotes}
                      placeholder="Anotações diagnósticas, objetivos terapêuticos e condutas iniciais recomendadas..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </InsetGroup>
              </InsetGroupedList>

              <View style={styles.actionContainer}>
                <Button
                  title="Salvar Anamnese Clínica"
                  onPress={handleSaveAnamnesis}
                  loading={saving}
                  size="large"
                  fullWidth
                />
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* ABA 3: AVALIAÇÃO FÍSICA / POSTURAL */}
          {/* ============================================================= */}
          {activeTab === 2 && (
            <View style={styles.tabContent}>
              <View style={{ marginBottom: Spacing.base }}>
                <Button
                  title="Fotos de Condição Clínica"
                  variant="secondary"
                  leadingIcon={<Ionicons name="images-outline" size={20} color={Colors.primary} />}
                  onPress={() => setConditionPhotosVisible(true)}
                  fullWidth
                />
              </View>

              <InsetGroupedList scrollable={false}>
                {/* 1. Vista Frontal */}
                <InsetGroup
                  header="1. Vista Frontal (Plano Coronal Anterior)"
                  footer="Avaliação simétrica dos eixos horizontais e membros inferiores."
                >
                  {renderOptionSelector('Alinhamento da Cabeça', ['Neutra', 'D', 'E'] as const, headAlign, setHeadAlign, 'Inclinação')}
                  {renderOptionSelector('Nível dos Ombros', ['Alinhados', 'D', 'E'] as const, shouldersAlign, setShouldersAlign, 'Mais elevado')}
                  {renderOptionSelector('Triângulo de Thales', ['Simétrico', 'D', 'E'] as const, thalesAlign, setThalesAlign, 'Maior espaçamento')}
                  {renderOptionSelector('Alinhamento de Quadril', ['Nivelado', 'Elevado D', 'Elevado E', 'Anteversão', 'Retroversão', 'Rotação D', 'Rotação E'] as const, hipAlign, setHipAlign)}
                  {renderOptionSelector('Alinhamento dos Joelhos', ['Neutro', 'Valgos', 'Varos'] as const, kneesAlign, setKneesAlign)}
                  {renderOptionSelector('Apoio dos Pés', ['Neutro', 'Halux Valgo D', 'Halux Valgo E', 'Pronados', 'Supinados'] as const, feetAlign, setFeetAlign)}
                </InsetGroup>

                {/* 2. Vista Lateral */}
                <InsetGroup
                  header="2. Vista Lateral (Plano Sagital)"
                  footer="Curvaturas fisiológicas da coluna e basculamento pélvico."
                >
                  {renderOptionSelector('Coluna Cervical', ['Neutra', 'Retificada', 'Hiperlordose'] as const, cervicalAlign, setCervicalAlign)}
                  {renderOptionSelector('Ombros no Plano Sagital', ['Neutro', 'Protrusao'] as const, lateralShoulders, setLateralShoulders)}
                  {renderOptionSelector('Abdômen', ['Neutro', 'Protuso', 'Globoso'] as const, abdomenAlign, setAbdomenAlign)}
                  {renderOptionSelector('Coluna Torácica / Dorsal', ['Neutra', 'Retificada', 'Hipercifose'] as const, dorsalAlign, setDorsalAlign)}
                  {renderOptionSelector('Coluna Lombar', ['Neutra', 'Retificada', 'Hiperlordose', 'Hipercifose'] as const, lumbarAlign, setLumbarAlign)}
                  {renderOptionSelector('Posicionamento da Pelve', ['Neutra', 'Anteversao', 'Retroversao'] as const, pelvisAlign, setPelvisAlign)}
                  {renderOptionSelector('Arco Plantar Presente?', ['Sim', 'Nao'] as const, plantarArch, setPlantarArch)}
                </InsetGroup>

                {/* 3. Vista Posterior */}
                <InsetGroup
                  header="3. Vista Posterior (Plano Coronal Posterior)"
                  footer="Alinhamento escapulotorácico, pregas glúteas e desvios escolióticos."
                >
                  {renderOptionSelector('Simetria Escapular', ['Neutra', 'Alada D', 'Alada E', 'Angulo D', 'Angulo E'] as const, scapulaAlign, setScapulaAlign)}
                  {renderOptionSelector('Escoliose / Teste de Adams', ['Ausente', 'Curva C Direita', 'Curva C Esquerda', 'Dupla Curva S'] as const, scoliosisAlign, setScoliosisAlign)}
                  {renderOptionSelector('Linha / Prega Glútea', ['Alinhada', 'D', 'E'] as const, glutealLine, setGlutealLine, 'Mais alta')}
                  {renderOptionSelector('Linha Poplítea (Posterior do Joelho)', ['Alinhada', 'D', 'E'] as const, poplitealLine, setPoplitealLine, 'Mais alta')}
                </InsetGroup>

                {/* 4. Musculatura e Notas Posturais */}
                <InsetGroup header="4. Avaliação Muscular & Conduta">
                  {renderOptionSelector('Trovismo Muscular Global', ['Normotrófica', 'Hipotrófica', 'Hipertrófica'] as const, musculatureAlign, setMusculatureAlign)}
                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Detalhes Musculares & Assimetrias</Text>
                    <TextInput
                      style={styles.textInputMulti}
                      value={posturalNotes}
                      onChangeText={setPosturalNotes}
                      placeholder="Descreva encurtamentos (ex.: cadeia posterior, peitorais), fraquezas específicas e prioridades de alinhamento..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={4}
                    />
                  </View>
                </InsetGroup>
              </InsetGroupedList>

              <View style={styles.actionContainer}>
                <Button
                  title="Salvar Avaliação Postural"
                  onPress={handleSavePostural}
                  loading={saving}
                  size="large"
                  fullWidth
                />
              </View>
            </View>
          )}

          {/* ============================================================= */}
          {/* ABA 4: BIOIMPEDÂNCIA EVOLUTIVA */}
          {/* ============================================================= */}
          {activeTab === 3 && (
            <View style={styles.tabContent}>
              <View style={{ marginBottom: Spacing.base }}>
                <Button
                  title="Tabela de Referência Clínica"
                  variant="secondary"
                  leadingIcon={<Ionicons name="information-circle-outline" size={20} color={Colors.primary} />}
                  onPress={() => setReferenceModalVisible(true)}
                  fullWidth
                />
              </View>

              {/* Form de Nova Aferição */}
              <InsetGroupedList scrollable={false}>
                <InsetGroup
                  header="Nova Aferição de Bioimpedância"
                  footer="Cálculo automático em tempo real do IMC (ABESO) e TMB (Mifflin-St Jeor)."
                >
                  <View style={styles.biometricFormRow}>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Peso (kg)*</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioWeight}
                        onChangeText={setBioWeight}
                        placeholder="68.5"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Altura (cm)*</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="numeric"
                        value={bioHeight}
                        onChangeText={setBioHeight}
                        placeholder="165"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Circ. Abdom. (cm)</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioAbdominalCirc}
                        onChangeText={setBioAbdominalCirc}
                        placeholder="78"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Resultados Calculados em Tempo Real */}
                  {numericWeight > 0 && numericHeight > 0 && (
                    <View style={styles.calculatedBox}>
                      <View style={styles.calculatedItem}>
                        <Text style={styles.calcLabel}>IMC Calculado</Text>
                        <Text style={styles.calcValue}>{autoBmi.value} kg/m²</Text>
                        <Badge
                          label={autoBmi.classification}
                          variant={
                            autoBmi.classification === 'Normal'
                              ? 'success'
                              : autoBmi.classification === 'Sobrepeso'
                              ? 'warning'
                              : 'alert'
                          }
                          size="sm"
                        />
                      </View>

                      <View style={styles.calcSeparator} />

                      <View style={styles.calculatedItem}>
                        <Text style={styles.calcLabel}>TMB Estimada</Text>
                        <Text style={styles.calcValue}>{autoBmr} kcal/dia</Text>
                        <Text style={styles.calcSub}>Gasto basal feminino</Text>
                      </View>
                    </View>
                  )}

                  {/* Idade Cronológica e Idade Corporal Lado a Lado */}
                  <View style={styles.biometricFormRow}>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Idade Cronológica</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="numeric"
                        value={bioChronologicalAge}
                        onChangeText={setBioChronologicalAge}
                        placeholder="35"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Idade Corporal / Metabólica</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="numeric"
                        value={bioBodyAge}
                        onChangeText={setBioBodyAge}
                        placeholder="28"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  </View>

                  {ageComparison && (
                    <View style={styles.ageComparisonCard}>
                      <View style={styles.ageComparisonHeader}>
                        <Ionicons
                          name={ageComparison.variant === 'success' ? 'sparkles' : 'alert-circle'}
                          size={18}
                          color={ageComparison.variant === 'success' ? Colors.success : Colors.warning}
                        />
                        <Badge
                          label={ageComparison.label}
                          variant={ageComparison.variant}
                          size="md"
                        />
                      </View>
                      <Text style={styles.ageComparisonDescription}>
                        {ageComparison.description}
                      </Text>
                    </View>
                  )}

                  <View style={styles.biometricFormRow}>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>% Gordura Corporal</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatPct}
                        onChangeText={setBioFatPct}
                        placeholder="24.5"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Gordura Visceral (1-59)</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="numeric"
                        value={bioVisceralFat}
                        onChangeText={setBioVisceralFat}
                        placeholder="4"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputLabel}>Massa Muscular (kg)</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioMuscleKg}
                        onChangeText={setBioMuscleKg}
                        placeholder="42.0"
                        placeholderTextColor={Colors.textTertiary}
                      />
                    </View>
                  </View>

                  {/* Visceral Classification preview */}
                  <View style={styles.visceralPreviewRow}>
                    <Text style={styles.visceralPreviewText}>
                      Classificação Visceral: <Text style={{ fontWeight: '700', color: visceralEval.color }}>{visceralEval.classification}</Text> ({visceralEval.description})
                    </Text>
                  </View>

                  <View style={styles.segmentalTitleRow}>
                    <Text style={styles.segmentalTitle}>Distribuição Segmentar (% ou kg)</Text>
                  </View>

                  <View style={styles.biometricFormRow}>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputSubLabel}>Braço D</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatArmR}
                        onChangeText={setBioFatArmR}
                        placeholder="—"
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputSubLabel}>Braço E</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatArmL}
                        onChangeText={setBioFatArmL}
                        placeholder="—"
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputSubLabel}>Tronco</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatTrunk}
                        onChangeText={setBioFatTrunk}
                        placeholder="—"
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputSubLabel}>Perna D</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatLegR}
                        onChangeText={setBioFatLegR}
                        placeholder="—"
                      />
                    </View>
                    <View style={styles.biometricCol}>
                      <Text style={styles.inputSubLabel}>Perna E</Text>
                      <TextInput
                        style={styles.textInputMetric}
                        keyboardType="decimal-pad"
                        value={bioFatLegL}
                        onChangeText={setBioFatLegL}
                        placeholder="—"
                      />
                    </View>
                  </View>

                  <View style={styles.inputCell}>
                    <Text style={styles.inputLabel}>Parecer Clínico / Análise Corporal</Text>
                    <TextInput
                      style={styles.textInputMulti}
                      value={bioOpinion}
                      onChangeText={setBioOpinion}
                      placeholder="Evolução de composição corporal, redução de tecido adiposo, aumento de tônus muscular..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </InsetGroup>
              </InsetGroupedList>

              <View style={styles.actionContainer}>
                <Button
                  title="Salvar Nova Aferição"
                  onPress={handleSaveBioimpedance}
                  loading={saving}
                  size="large"
                  fullWidth
                />
              </View>

              {/* Lista Histórica de Aferições */}
              <View style={styles.historySection}>
                <Text style={styles.historySectionTitle}>
                  Histórico Evolutivo ({bioimpedanceList.length} Aferições)
                </Text>

                {bioimpedanceList.length === 0 ? (
                  <View style={styles.emptyHistoryBox}>
                    <Ionicons name="bar-chart-outline" size={32} color={Colors.textTertiary} />
                    <Text style={styles.emptyHistoryText}>
                      Nenhuma aferição de bioimpedância registrada ainda para este paciente.
                    </Text>
                  </View>
                ) : (
                  bioimpedanceList.map((bio) => {
                    const bmiInfo = calculateBMI(bio.weight, bio.height);
                    return (
                      <View key={bio.id} style={styles.historyCard}>
                        <View style={styles.historyCardHeader}>
                          <View style={styles.historyDateRow}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.primary} />
                            <Text style={styles.historyDateText}>
                              {formatDateBR(bio.evaluation_date)}
                            </Text>
                          </View>
                          <Badge
                            label={`IMC ${bio.bmi} • ${bmiInfo.classification}`}
                            variant={
                              bmiInfo.classification === 'Normal'
                                ? 'success'
                                : bmiInfo.classification === 'Sobrepeso'
                                ? 'warning'
                                : 'alert'
                            }
                            size="sm"
                          />
                        </View>

                        <View style={styles.historyMetricsGrid}>
                          <View style={styles.historyMetricItem}>
                            <Text style={styles.metricItemLabel}>Peso</Text>
                            <Text style={styles.metricItemValue}>{formatWeight(bio.weight)}</Text>
                          </View>
                          <View style={styles.historyMetricItem}>
                            <Text style={styles.metricItemLabel}>% Gordura</Text>
                            <Text style={styles.metricItemValue}>{formatPercent(bio.body_fat_percent)}</Text>
                          </View>
                          <View style={styles.historyMetricItem}>
                            <Text style={styles.metricItemLabel}>Massa Magra</Text>
                            <Text style={styles.metricItemValue}>{formatWeight(bio.muscle_mass_kg)}</Text>
                          </View>
                          <View style={styles.historyMetricItem}>
                            <Text style={styles.metricItemLabel}>Gord. Visceral</Text>
                            <Text style={styles.metricItemValue}>Nível {bio.visceral_fat}</Text>
                          </View>
                        </View>

                        {bio.clinical_opinion ? (
                          <Text style={styles.historyOpinionText}>
                            "{bio.clinical_opinion}"
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* Footer Clinic Identity */}
          <View style={styles.footerContainer}>
            <ClinicIdentity variant="footer" />
          </View>
        </>
      )}

      {activePatient ? (
        <PatientConditionPhotosModal
          visible={conditionPhotosVisible}
          patientId={activePatient.id}
          patientName={activePatient.name}
          onClose={() => setConditionPhotosVisible(false)}
        />
      ) : null}

      <BioimpedanceReferenceModal
        visible={referenceModalVisible}
        onClose={() => setReferenceModalVisible(false)}
      />
    </LargeTitleLayout>
  );
}

const styles = StyleSheet.create({
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    marginLeft: 2,
  },
  headerPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent, // Wine accent #6A1B15 for documents
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    ...Shadows.subtle,
  },
  headerPdfButtonText: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  patientSwitcherScroll: {
    marginHorizontal: -Layout.screenMarginHorizontal,
    marginBottom: Spacing.md,
  },
  patientSwitcherContent: {
    paddingHorizontal: Layout.screenMarginHorizontal,
    gap: 8,
  },
  patientPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  patientPillActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  patientPillText: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  patientPillTextActive: {
    color: Colors.textInverse,
  },
  segmentedWrapper: {
    marginBottom: Spacing.base,
  },
  loadingBox: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...Typography.subhead,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyNoticeText: {
    ...Typography.callout,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  tabContent: {
    paddingBottom: Spacing.xl,
  },
  patientHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  patientAvatarLarge: {
    width: 54,
    height: 54,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primarySubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: '#E6D8EF',
  },
  patientAvatarLargeText: {
    ...Typography.title3,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  patientHeroInfo: {
    flex: 1,
  },
  patientHeroName: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  patientHeroMeta: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: 6,
  },
  heroBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionContainer: {
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
  },
  inputCell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inputLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputSubLabel: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  textInputSingle: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  textInputMulti: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  nestedSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
    paddingTop: 8,
  },
  subFieldsBox: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  textInputSub: {
    ...Typography.subhead,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  inlineRowInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionBlock: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.hairline,
  },
  optionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionLabel: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    ...Typography.caption2,
    color: Colors.textSecondary,
  },
  optionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionChipSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primaryDark,
  },
  optionChipText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionChipTextSelected: {
    color: Colors.textInverse,
  },
  evaSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  evaHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  evaBadgeText: {
    ...Typography.caption1,
    fontWeight: '700',
  },
  evaScaleScroll: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  evaPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  evaPillSelected: {
    backgroundColor: Colors.accent, // Accent wine for pain
    borderColor: Colors.accent,
  },
  evaPillText: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  evaPillTextSelected: {
    color: Colors.textInverse,
  },
  biometricFormRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  biometricCol: {
    flex: 1,
  },
  textInputMetric: {
    ...Typography.subhead,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    textAlign: 'center',
    fontWeight: '600',
  },
  calculatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.primarySubtle,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 12,
    borderRadius: Radii.md,
  },
  calculatedItem: {
    alignItems: 'center',
  },
  calcLabel: {
    ...Typography.caption2,
    fontWeight: '600',
    color: Colors.primaryDark,
    textTransform: 'uppercase',
  },
  calcValue: {
    ...Typography.title3,
    fontWeight: '700',
    color: Colors.primaryDark,
    marginVertical: 2,
  },
  calcSub: {
    ...Typography.caption2,
    color: Colors.textSecondary,
  },
  calcSeparator: {
    width: 1,
    height: 40,
    backgroundColor: '#D9C8E5',
  },
  visceralPreviewRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  visceralPreviewText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
  },
  segmentalTitleRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  segmentalTitle: {
    ...Typography.footnote,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historySection: {
    marginTop: Spacing.lg,
  },
  historySectionTitle: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: 4,
  },
  emptyHistoryBox: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.base,
  },
  emptyHistoryText: {
    ...Typography.footnote,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  historyCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.card,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyDateText: {
    ...Typography.subhead,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  historyMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceSecondary,
    padding: 10,
    borderRadius: Radii.sm,
  },
  historyMetricItem: {
    alignItems: 'center',
  },
  metricItemLabel: {
    ...Typography.caption2,
    color: Colors.textSecondary,
  },
  metricItemValue: {
    ...Typography.footnote,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  historyOpinionText: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  footerContainer: {
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  ageComparisonCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: Radii.card,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  ageComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ageComparisonDescription: {
    ...Typography.caption1,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
