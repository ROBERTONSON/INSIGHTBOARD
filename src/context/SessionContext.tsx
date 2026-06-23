import React, { createContext, useContext, useReducer } from 'react';
import type { SessionState, AnalysisResult, ColumnProfile, Warning } from '../types/index';

// ============================================================
// Action types
// ============================================================

type SessionAction =
  | { type: 'SET_DATASET'; payload: { meta: import('../types/index').DatasetMeta; rows: Record<string, string>[] } }
  | { type: 'SET_COLUMN_PROFILES'; payload: ColumnProfile[] }
  | { type: 'SET_SELECTED_COLUMNS'; payload: Set<string> }
  | { type: 'SET_ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ADD_WARNINGS'; payload: Warning[] }
  | { type: 'RESET' };

// ============================================================
// Initial state factory
// ============================================================

function createInitialState(): SessionState {
  return {
    sessionId: crypto.randomUUID(),
    dataset: null,
    columnProfiles: [],
    selectedColumns: new Set<string>(),
    analysisResult: null,
    warnings: [],
  };
}

// ============================================================
// Reducer
// ============================================================

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_DATASET':
      return {
        ...state,
        dataset: action.payload,
        // Clear derived state when a new dataset is loaded
        columnProfiles: [],
        selectedColumns: new Set<string>(),
        analysisResult: null,
        warnings: [],
      };

    case 'SET_COLUMN_PROFILES':
      return {
        ...state,
        columnProfiles: action.payload,
      };

    case 'SET_SELECTED_COLUMNS':
      return {
        ...state,
        selectedColumns: action.payload,
      };

    case 'SET_ANALYSIS_RESULT':
      return {
        ...state,
        analysisResult: action.payload,
      };

    case 'ADD_WARNINGS':
      return {
        ...state,
        warnings: [...state.warnings, ...action.payload],
      };

    case 'RESET':
      return {
        // Preserve the sessionId — only reset everything else
        ...createInitialState(),
        sessionId: state.sessionId,
      };

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<SessionAction>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * SessionProvider wraps the application and initialises an isolated
 * in-memory session for the current browser tab.
 *
 * - sessionId is generated once with crypto.randomUUID() at mount time.
 * - All dataset data lives exclusively in React state (never localStorage /
 *   sessionStorage), so it is automatically garbage-collected when the tab
 *   is closed (Requirements 12.1–12.4).
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, undefined, createInitialState);

  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

/**
 * Returns the current session state and dispatch function.
 * Must be used inside a <SessionProvider>.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (context === null) {
    throw new Error('useSession must be used within a SessionProvider');
  }

  return context;
}

export type { SessionAction };
