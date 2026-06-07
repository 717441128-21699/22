import { create } from 'zustand';
import type { Alert, AlertLevel, AlertType, AlertStatus } from '../../shared/types';

interface AlertFilters {
  level: AlertLevel | 'all';
  type: AlertType | 'all';
  status: AlertStatus | 'all';
  regionCode: string;
  keyword: string;
  dateRange: { start: string; end: string } | null;
}

interface AlertState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  filters: AlertFilters;
  total: number;
  page: number;
  pageSize: number;
  setAlerts: (alerts: Alert[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<AlertFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setTotal: (total: number) => void;
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, updates: Partial<Alert>) => void;
  removeAlert: (id: string) => void;
  getFilteredAlerts: () => Alert[];
  getActiveCount: () => number;
  getLevel1Count: () => number;
  getLevel2Count: () => number;
}

const defaultFilters: AlertFilters = {
  level: 'all',
  type: 'all',
  status: 'all',
  regionCode: '',
  keyword: '',
  dateRange: null,
};

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  loading: false,
  error: null,
  filters: defaultFilters,
  total: 0,
  page: 1,
  pageSize: 20,

  setAlerts: (alerts) => set({ alerts }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    })),

  resetFilters: () =>
    set({
      filters: defaultFilters,
      page: 1,
    }),

  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  setTotal: (total) => set({ total }),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts],
      total: state.total + 1,
    })),

  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
      total: state.total - 1,
    })),

  getFilteredAlerts: () => {
    const { alerts, filters } = get();
    return alerts.filter((alert) => {
      if (filters.level !== 'all' && alert.level !== filters.level) return false;
      if (filters.type !== 'all' && alert.type !== filters.type) return false;
      if (filters.status !== 'all' && alert.status !== filters.status) return false;
      if (filters.regionCode && !alert.regionCode.startsWith(filters.regionCode)) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        if (
          !alert.regionName.toLowerCase().includes(kw) &&
          !alert.responsiblePerson.toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      if (filters.dateRange) {
        const alertDate = new Date(alert.triggeredAt).getTime();
        const start = new Date(filters.dateRange.start).getTime();
        const end = new Date(filters.dateRange.end).getTime();
        if (alertDate < start || alertDate > end) return false;
      }
      return true;
    });
  },

  getActiveCount: () => {
    const { alerts } = get();
    return alerts.filter((a) => a.status === 'active' || a.status === 'processing').length;
  },

  getLevel1Count: () => {
    const { alerts } = get();
    return alerts.filter(
      (a) => a.level === 1 && (a.status === 'active' || a.status === 'processing')
    ).length;
  },

  getLevel2Count: () => {
    const { alerts } = get();
    return alerts.filter(
      (a) => a.level === 2 && (a.status === 'active' || a.status === 'processing')
    ).length;
  },
}));
