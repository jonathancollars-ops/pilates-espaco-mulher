/**
 * Pilates Espaço Mulher — Navigation Shell & Clinical Tab Navigator
 * Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Apple Human Interface Guidelines (HIG) Bottom Tab Navigation
 * with 5 core clinical tabs, collapsible Large Titles, Inset Grouped Lists,
 * Segmented Controls, and Haptic feedback.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Typography,
  Spacing,
  Radii,
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
} from '../design-system';
import { PatientsDashboardScreen } from '../features/patients';

export type RootTabParamList = {
  Pacientes: undefined;
  Treinos: undefined;
  Aparelhos: undefined;
  Relatórios: undefined;
  Ajustes: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// ---------------------------------------------------------------------------
// Shell Screen 1: Pacientes (Patients Dashboard) — Milestone 3
// ---------------------------------------------------------------------------
export function PacientesScreen() {
  return <PatientsDashboardScreen />;
}

// ---------------------------------------------------------------------------
// Shell Screen 2: Treinos (Workouts)
// ---------------------------------------------------------------------------
function TreinosScreen() {
  const [selectedTab, setSelectedTab] = useState(0);
  const tabs = ['Rotinas Ativas', 'Histórico', 'Prescrever'] as const;

  const handleStartSession = (patient: string) => {
    Haptics.success();
    Alert.alert('Sessão Iniciada', `Iniciando atendimento de ${patient}. Registro de execução e percepção de esforço no M5.`);
  };

  return (
    <LargeTitleLayout
      title="Treinos"
      subtitle="Prescrições Clínicas & Sessões"
      rightAction={
        <TouchableOpacity
          onPress={() => {
            Haptics.impactMedium();
            Alert.alert('Nova Prescrição', 'Montagem personalizada de treino por aparelho no M5.');
          }}
          style={styles.headerIconButton}
        >
          <Ionicons name="create-outline" size={26} color={Colors.primary} />
        </TouchableOpacity>
      }
    >
      <View style={styles.segmentedWrapper}>
        <SegmentedControl
          values={tabs}
          selectedIndex={selectedTab}
          onChange={(index) => setSelectedTab(index)}
        />
      </View>

      <InsetGroupedList scrollable={false}>
        <InsetGroup
          header="Rotinas Prescritas Recentes"
          footer="Prescrições individualizadas com molas, repetições e orientações posturais."
        >
          <InsetRow
            icon="fitness"
            label="Mariana Silva"
            subtitle="Foco: Descompressão lombar"
            value="Reformer & Cadillac (50 min)"
            onPress={() => handleStartSession('Mariana Silva')}
          />
          <InsetRow
            icon="fitness"
            label="Beatriz Costa"
            subtitle="Foco: Simetria escapular"
            value="Wunda Chair & Barrel (50 min)"
            onPress={() => handleStartSession('Beatriz Costa')}
          />
          <InsetRow
            icon="fitness"
            label="Camila Santos"
            subtitle="Foco: Ativação transverso"
            value="Mat Pilates & Overball (45 min)"
            onPress={() => handleStartSession('Camila Santos')}
          />
        </InsetGroup>

        <InsetGroup header="Controle de Aula">
          <InsetRow
            icon="play-circle"
            label="Iniciar Aula ao Vivo"
            value="Cronômetro & EVA"
            onPress={() => {
              Haptics.success();
              Alert.alert('Aula ao Vivo', 'Timer de sessão e feedback EVA no M5.');
            }}
          />
          <InsetRow
            icon="time"
            label="Histórico de Sessões Concluídas"
            value="142 aulas registradas"
            onPress={() => {
              Haptics.selection();
              Alert.alert('Histórico', 'Histórico completo local no SQLite no M5.');
            }}
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
// Shell Screen 3: Aparelhos (Apparatus)
// ---------------------------------------------------------------------------
function AparelhosScreen() {
  const handleSelectApparatus = (name: string, count: number) => {
    Haptics.selection();
    Alert.alert(name, `Catálogo clássico com ${count} exercícios cadastrados.\nNavegação e filtros disponíveis no M5.`);
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
          Catálogo estruturado com configurações de molas, alinhamento anatômico e variações para patologias de coluna e membros.
        </Text>
      </Card>

      <InsetGroupedList scrollable={false}>
        <InsetGroup
          header="Equipamentos Clássicos"
          footer="Exercícios categorizados por nível de habilidade e restrições posturais."
        >
          <InsetRow
            icon="cube"
            label="Universal Reformer"
            value="14 exercícios"
            onPress={() => handleSelectApparatus('Universal Reformer', 14)}
          />
          <InsetRow
            icon="bed"
            label="Cadillac / Trapeze Table"
            value="12 exercícios"
            onPress={() => handleSelectApparatus('Cadillac', 12)}
          />
          <InsetRow
            icon="file-tray-stacked"
            label="Wunda Chair"
            value="10 exercícios"
            onPress={() => handleSelectApparatus('Wunda Chair', 10)}
          />
          <InsetRow
            icon="git-commit"
            label="Ladder Barrel"
            value="8 exercícios"
            onPress={() => handleSelectApparatus('Ladder Barrel', 8)}
          />
          <InsetRow
            icon="body"
            label="Matwork / Solo"
            value="16 exercícios"
            onPress={() => handleSelectApparatus('Mat / Solo', 16)}
          />
          <InsetRow
            icon="radio-button-on"
            label="Pequenos Acessórios"
            value="11 exercícios"
            subtitle="Magic Circle, Faixas elásticas, Overball"
            onPress={() => handleSelectApparatus('Pequenos Acessórios', 11)}
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
// Shell Screen 4: Relatórios (Reports)
// ---------------------------------------------------------------------------
function RelatóriosScreen() {
  const handleExportPdf = () => {
    Haptics.success();
    Alert.alert(
      'Exportar Relatório Clínico',
      'Gerando modelo HTML5 A4 profissional com assinatura digital da Dra. Rogéria Collares via expo-print (M6).'
    );
  };

  const handleShareWhatsApp = () => {
    Haptics.success();
    Alert.alert(
      'Compartilhar via WhatsApp',
      'Link direto wa.me com resumo clínico formatado e anexo PDF da evolução (M6).'
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
              Alert.alert('Evolução Gráfica', 'Curvas de evolução temporal Bezier SVG disponíveis no M4.');
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
// Shell Screen 5: Ajustes (Settings)
// ---------------------------------------------------------------------------
function AjustesScreen() {
  const [syncing, setSyncing] = useState(false);

  const handleSyncNow = () => {
    Haptics.impactLight();
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      Haptics.success();
      Alert.alert(
        'Sincronização Concluída',
        'Todos os dados locais do SQLite foram consolidados com a nuvem Firebase espacomulher-84137 com 0 ouvintes persistentes.'
      );
    }, 1200);
  };

  return (
    <LargeTitleLayout
      title="Ajustes"
      subtitle="Clínica & Sincronização"
    >
      <InsetGroupedList scrollable={false}>
        <InsetGroup
          header="Sincronização & Nuvem (Firebase Spark)"
          footer="Proteção estrita da cota gratuita: 0 ouvintes em tempo real e sincronização consolidada por demanda."
        >
          <InsetRow
            icon="cloud-done"
            label="Status da Nuvem"
            value={syncing ? 'Sincronizando...' : '🟢 Tudo sincronizado'}
            accessory={<Badge label="Spark Seguro" variant="success" styleType="subtle" size="sm" />}
          />
          <InsetRow
            icon="sync"
            label="Sincronizar Agora"
            value="Consolidar Documentos"
            onPress={handleSyncNow}
          />
          <InsetRow
            icon="server"
            label="Banco de Dados Local"
            value="SQLite (WAL Mode Ativo)"
          />
        </InsetGroup>

        <InsetGroup header="Identidade Profissional da Clínica">
          <InsetRow
            icon="medkit"
            label="Responsável Técnica"
            value={CLINIC_IDENTITY.professionalName}
          />
          <InsetRow
            icon="card"
            label="Registro Profissional"
            value={CLINIC_IDENTITY.crefito}
          />
          <InsetRow
            icon="location"
            label="Localização"
            value={CLINIC_IDENTITY.location}
          />
          <InsetRow
            icon="call"
            label="Contato WhatsApp"
            value={CLINIC_IDENTITY.phone}
          />
        </InsetGroup>
      </InsetGroupedList>

      <View style={styles.identityHeaderContainer}>
        <ClinicIdentity variant="header" />
      </View>

      <View style={styles.identityFooterContainer}>
        <ClinicIdentity variant="footer" />
      </View>
    </LargeTitleLayout>
  );
}

// ---------------------------------------------------------------------------
// Root Bottom Tab Navigator
// ---------------------------------------------------------------------------
export function RootNavigator() {
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
      <Tab.Screen name="Pacientes" component={PacientesScreen} />
      <Tab.Screen name="Treinos" component={TreinosScreen} />
      <Tab.Screen name="Aparelhos" component={AparelhosScreen} />
      <Tab.Screen name="Relatórios" component={RelatóriosScreen} />
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  headerIconButton: {
    padding: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    height: 38,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.subhead,
    color: Colors.text,
    paddingVertical: 0,
  },
  segmentedWrapper: {
    marginBottom: Spacing.base,
  },
  apparatusOverviewCard: {
    marginBottom: Spacing.base,
    marginHorizontal: Spacing.base,
  },
  overviewBody: {
    ...Typography.callout,
    color: Colors.textSecondary,
  },
  identityHeaderContainer: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  identityFooterContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
  },
});
