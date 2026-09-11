/**
 * PatientContext.tsx
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Reactive State Provider for Patient Management (Milestone 3)
 * Connects patientRepository directly to the UI layer, enabling instant
 * re-renders after additions, edits, or deletions without page reloads.
 * 
 * Features:
 * - 100% Local-First SSOT backed by SQLite
 * - Instant reactive updates for create, update, delete
 * - Real-time client-side and repository-level search filtering
 * - Case-insensitive and accent-insensitive matching by name and phone
 * - Filter by clinical status ('all', 'active', 'archived', 'discharged')
 * - Pull-to-refresh support
 * - Haptic feedback integration
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  PatientStatus,
} from '../../types/patient';
import { patientRepository } from '../../database/repositories/patientRepository';
import { Haptics } from '../../design-system/Haptics';

export type PatientFilterStatus = 'all' | PatientStatus;

export interface PatientContextValue {
  // State
  patients: Patient[];
  filteredPatients: Patient[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: PatientFilterStatus;
  totalCount: number;

  // Search & Filter controls
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: PatientFilterStatus) => void;
  clearFilters: () => void;

  // CRUD Operations
  createPatient: (input: CreatePatientInput) => Promise<Patient>;
  updatePatient: (id: string, input: UpdatePatientInput) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<boolean>;
  refreshPatients: () => Promise<void>;

  // Synchronous & Asynchronous Lookups
  getPatientById: (id: string) => Patient | undefined;
  fetchPatientById: (id: string) => Promise<Patient | null>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

export interface PatientProviderProps {
  children: ReactNode;
  initialPatients?: Patient[]; // Useful for unit testing and storybooks
}

/**
 * Normalizes text for accent-insensitive and case-insensitive comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Cleans non-digit characters from phone string
 */
function extractDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function PatientProvider({
  children,
  initialPatients,
}: PatientProviderProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients || []);
  const [loading, setLoading] = useState<boolean>(!initialPatients);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<PatientFilterStatus>('all');

  // Load patients from SQLite repository on mount
  const loadPatients = useCallback(async () => {
    try {
      setError(null);
      const data = await patientRepository.listAll();
      setPatients(data);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao carregar lista de pacientes do SQLite.';
      console.error('[PatientContext] Error loading patients:', err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialPatients) {
      loadPatients();
    }
  }, [initialPatients, loadPatients]);

  // Pull-to-refresh handler
  const refreshPatients = useCallback(async () => {
    setRefreshing(true);
    await loadPatients();
  }, [loadPatients]);

  // Create Patient
  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<Patient> => {
      try {
        setError(null);
        const created = await patientRepository.create(input);
        
        // Optimistic / instant state update
        setPatients((prev) => {
          const next = [created, ...prev];
          // Keep sorted alphabetically by name
          return next.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        });

        Haptics.success();
        return created;
      } catch (err: any) {
        const msg = err?.message || 'Erro ao cadastrar paciente no banco de dados.';
        setError(msg);
        Haptics.error();
        throw err;
      }
    },
    []
  );

  // Update Patient
  const updatePatient = useCallback(
    async (id: string, input: UpdatePatientInput): Promise<Patient | null> => {
      try {
        setError(null);
        const updated = await patientRepository.update(id, input);
        if (updated) {
          setPatients((prev) =>
            prev.map((p) => (p.id === id ? updated : p))
          );
          Haptics.success();
        }
        return updated;
      } catch (err: any) {
        const msg = err?.message || 'Erro ao atualizar dados do paciente.';
        setError(msg);
        Haptics.error();
        throw err;
      }
    },
    []
  );

  // Delete Patient
  const deletePatient = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);
        const deleted = await patientRepository.delete(id);
        if (deleted) {
          setPatients((prev) => prev.filter((p) => p.id !== id));
          Haptics.warning();
        }
        return deleted;
      } catch (err: any) {
        const msg = err?.message || 'Erro ao remover paciente do banco de dados.';
        setError(msg);
        Haptics.error();
        throw err;
      }
    },
    []
  );

  // Synchronous in-memory lookup
  const getPatientById = useCallback(
    (id: string): Patient | undefined => {
      return patients.find((p) => p.id === id);
    },
    [patients]
  );

  // Asynchronous repository lookup
  const fetchPatientById = useCallback(
    async (id: string): Promise<Patient | null> => {
      return await patientRepository.findById(id);
    },
    []
  );

  // Reset filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    Haptics.selection();
  }, []);

  // Filtered patients calculation (instant client-side filtering)
  const filteredPatients = useMemo(() => {
    let result = patients;

    // Filter by clinical status
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Filter by search query (name or phone)
    const query = searchQuery.trim();
    if (query.length > 0) {
      const normalizedQuery = normalizeText(query);
      const queryDigits = extractDigits(query);

      result = result.filter((p) => {
        // Name match (accent and case-insensitive)
        const normalizedName = normalizeText(p.name);
        if (normalizedName.includes(normalizedQuery)) {
          return true;
        }

        // Phone formatted match or digit match
        if (p.phone) {
          if (p.phone.includes(query)) {
            return true;
          }
          if (queryDigits.length > 0) {
            const patientPhoneDigits = extractDigits(p.phone);
            if (patientPhoneDigits.includes(queryDigits)) {
              return true;
            }
          }
        }

        // Neighborhood match (e.g. Costa Azul)
        if (p.neighborhood && normalizeText(p.neighborhood).includes(normalizedQuery)) {
          return true;
        }

        // Insurance match
        if (p.insurance && normalizeText(p.insurance).includes(normalizedQuery)) {
          return true;
        }

        return false;
      });
    }

    return result;
  }, [patients, searchQuery, statusFilter]);

  const value = useMemo<PatientContextValue>(
    () => ({
      patients,
      filteredPatients,
      loading,
      refreshing,
      error,
      searchQuery,
      statusFilter,
      totalCount: patients.length,
      setSearchQuery,
      setStatusFilter,
      clearFilters,
      createPatient,
      updatePatient,
      deletePatient,
      refreshPatients,
      getPatientById,
      fetchPatientById,
    }),
    [
      patients,
      filteredPatients,
      loading,
      refreshing,
      error,
      searchQuery,
      statusFilter,
      clearFilters,
      createPatient,
      updatePatient,
      deletePatient,
      refreshPatients,
      getPatientById,
      fetchPatientById,
    ]
  );

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}

/**
 * Hook to access the Patient reactive context.
 * Throws a descriptive error if called outside of <PatientProvider>.
 */
export function usePatients(): PatientContextValue {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error(
      'usePatients must be used within a <PatientProvider>. ' +
      'Wrap your root component or navigation container with <PatientProvider>.'
    );
  }
  return context;
}
