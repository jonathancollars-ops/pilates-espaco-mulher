/**
 * Pilates Espaço Mulher — Navigation Shell & Clinical Tab Navigator
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) Bottom Tab Navigation
 * with core clinical tabs (Pacientes, Treinos, Aparelhos, Relatórios, Ajustes),
 * deep Stack navigation (EvaluationWizard, RoutineManager), collapsible Large Titles,
 * Inset Grouped Lists, and Haptic feedback.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  LargeTitleLayout,
  Haptics,
  InsetGroupedList,
  InsetGroup,
  InsetRow,
  Card,
  ClinicIdentity,
} from '../design-system';
import { PatientsDashboardScreen } from '../features/patients';
import { EvaluationWizardScreen } from '../features/evaluation';
import { RoutineManagerScreen } from '../features/routines';
import { SettingsScreen } from '../features/settings';
import { generateClinicalReportPdf } from '../services/pdfService';
import { usePatients } from '../features/patients/PatientContext';

export type RootTabParamList = {
  Pacientes: undefined;
  Treinos: undefined;
  Aparelhos: undefined;
  Relatórios: undefined;
  Ajustes: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  EvaluationWizard: { patientId: string };
  RoutineManager: { patientId?: string };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------------------------------------------------------------------
// Screen 1: Pacientes Tab (Wrapper with deep stack navigation)
// ---------------------------------------------------------------------------
function PacientesTabScreen({ navigation }: any) {
  return (
    <PatientsDashboardScreen
      onNavigateToEvaluation={(patientId: string) => {
        navigation.navigate('EvaluationWizard', { patientId });
      }}
      onNavigateToWorkouts={(patientId: string) => {
        navigation.navigate('RoutineManager', { patientId });
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen 2: Treinos Tab
// ---------------------------------------------------------------------------
function TreinosTabScreen({ route }: any) {
  return <RoutineManagerScreen patientId={route.params?.patientId} />;
}

// ---------------------------------------------------------------------------
// Screen 3: Aparelhos Tab
// ---------------------------------------------------------------------------
function AparelhosScreen() {
  const handleSelectApparatus = (name: string, count: number) => {
    Haptics.selection();
    Alert.alert(name, `Catálogo clássico com ${count} exercícios cadastrados.\nPrescrição individual disponível na aba Treinos.`);
  };

  return (
    <LargeTitleLayout
      title="Aparelhos"
      subtitle="Catálogo Clássico Joseph Pilates"
    >
      <Card
        title="Estúdio Clínico"
        subtitle="Equipamentos originais calibrados para reabilitação"
        style={styles.apparatusOverviewCard}
      >
        <Text style={styles.overviewBody}>
          Catálogo estruturado com 49 exercícios distribuídos entre Reformer, Cadillac, Wunda Chair, Ladder Barrel, Solo/Mat e Cinesioterapia.
        </Text>
      </Card>

      <InsetGroupedList scrollable={false}>
        <InsetGroup
          header="Equipamentos Clássicos"
          footer="Exercícios pré-carregados e customizados com foco postural e molas."
        >
          <InsetRow
            icon="cube"
            label="Universal Reformer"
            value="8 exercícios clássicos"
            onPress={() => handleSelectApparatus('Universal Reformer', 8)}
          />
          <InsetRow
            icon="bed"
            label="Cadillac / Trapeze Table"
            value="8 exercícios clássicos"
            onPress={() => handleSelectApparatus('Cadillac', 8)}
          />
          <InsetRow
            icon="file-tray-stacked"
            label="Wunda Chair"
            value="7 exercícios clássicos"
            onPress={() => handleSelectApparatus('Wunda Chair', 7)}
          />
          <InsetRow
            icon="git-commit"
            label="Ladder Barrel"
            value="6 exercícios clássicos"
            onPress={() => handleSelectApparatus('Ladder Barrel', 6)}
          />
          <InsetRow
            icon="body"
            label="Matwork / Solo"
            value="13 exercícios clássicos"
            onPress={() => handleSelectApparatus('Mat / Solo', 13)}
          />
          <InsetRow
            icon="radio-button-on"
            label="Cinesioterapia & Acessórios"
            value="7 exercícios clássicos"
            subtitle="Bola Suíça, Faixas, Overball, Magic Circle"
            onPress={() => handleSelectApparatus('Cinesioterapia & Acessórios', 7)}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Screen 4: Relatórios Tab
// ---------------------------------------------------------------------------
function RelatóriosScreen() {
  const { patients } = usePatients();

  const handleExportPdf = async () => {
    if (patients.length === 0) {
      Alert.alert('Nenhum Paciente', 'Cadastre ao menos um paciente para emitir o relatório.');
      return;
    }
    Haptics.success();
    try {
      const firstPatient = patients[0];
      await generateClinicalReportPdf(firstPatient, null, null, null, {
        share: true,
        dialogTitle: `Relatório Clínico - ${firstPatient.name}`,
      });
    } catch (err: any) {
      Alert.alert('Erro ao Gerar PDF', err?.message || 'Falha ao emitir relatório.');
    }
  };

  const handleShareWhatsApp = () => {
    Haptics.success();
    Alert.alert(
      'Compartilhar via WhatsApp',
      'Abra a Ficha Clínica de qualquer paciente na aba Pacientes para exportar o PDF e enviar pelo WhatsApp.'
    );
  };

  return (
    <LargeTitleLayout
      title="Relatórios"
      subtitle="Evolução & Compartilhamento"
    >
      <InsetGroupedList scrollable={false}>
        <InsetGroup
          header="Emissão de Relatório Clínico"
          footer="Documento oficial com timbre, dados do CREFITO 23093-F e assinatura da fisioterapeuta."
        >
          <InsetRow
            icon="document-text"
            label="Relatório de Avaliação Postural"
            value="PDF A4 Timbrado"
            onPress={handleExportPdf}
          />
          <InsetRow
            icon="logo-whatsapp"
            label="Enviar Resumo no WhatsApp"
            value="Link Direto wa.me"
            onPress={handleShareWhatsApp}
          />
        </InsetGroup>

        <InsetGroup header="Evolução da Bioimpedância">
          <InsetRow
            icon="trending-up"
            label="Comparativo de Composição Corporal"
            value="Massa Magra & % Gordura"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Evolução Gráfica', 'Acesse a aba Bioimpedância na Ficha Clínica do paciente para acompanhar o histórico.');
            }}
          />
          <InsetRow
            icon="print"
            label="Imprimir Resumo Trimestral"
            value="expo-print"
            onPress={handleExportPdf}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Screen 5: Ajustes Tab
// ---------------------------------------------------------------------------
function AjustesTabScreen() {
  return <SettingsScreen />;
}

// ---------------------------------------------------------------------------
// Main Bottom Tabs Navigator
// ---------------------------------------------------------------------------
function MainTabsNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Pacientes"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 30 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          ...Typography.caption2,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'people';

          if (route.name === 'Pacientes') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Treinos') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Aparelhos') {
            iconName = focused ? 'layers' : 'layers-outline';
          } else if (route.name === 'Relatórios') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Ajustes') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
      screenListeners={{
        tabPress: () => {
          Haptics.selection();
        },
      }}
    >
      <Tab.Screen name="Pacientes" component={PacientesTabScreen} />
      <Tab.Screen name="Treinos" component={TreinosTabScreen} />
      <Tab.Screen name="Aparelhos" component={AparelhosScreen} />
      <Tab.Screen name="Relatórios" component={RelatóriosScreen} />
      <Tab.Screen name="Ajustes" component={AjustesTabScreen} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root Stack Navigator (Zero Login direct launch into MainTabs)
// ---------------------------------------------------------------------------
export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabsNavigator} />
      <Stack.Screen
        name="EvaluationWizard"
        component={({ route, navigation }: any) => (
          <EvaluationWizardScreen
            patientId={route.params?.patientId}
            onGoBack={() => navigation.goBack()}
            onNavigateToWorkouts={(patientId) =>
              navigation.navigate('RoutineManager', { patientId })
            }
          />
        )}
      />
      <Stack.Screen
        name="RoutineManager"
        component={({ route, navigation }: any) => (
          <RoutineManagerScreen
            patientId={route.params?.patientId}
            onGoBack={() => navigation.goBack()}
          />
        )}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  apparatusOverviewCard: {
    marginBottom: Spacing.base,
    marginHorizontal: Spacing.base,
  },
  overviewBody: {
    ...Typography.callout,
    color: Colors.textSecondary,
  },
  identityFooterContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
  },
});
