import { describe, it, expect } from 'vitest'
import type {
  DatasetMeta,
  ColumnProfile,
  DescriptiveStats,
  AnalysisResult,
  CorrelationMatrix,
  OutlierEntry,
  Distribution,
  Trend,
  Warning,
  AnalysisError,
  ParseResult,
  AnalysisInput,
  SessionState,
} from './index'

describe('Types smoke tests — structural validation', () => {
  it('DatasetMeta satisfies its shape', () => {
    const meta: DatasetMeta = {
      filename: 'data.csv',
      rowCount: 100,
      columnCount: 3,
      columns: ['a', 'b', 'c'],
      uploadedAt: new Date().toISOString(),
      sessionId: crypto.randomUUID(),
    }
    expect(meta.filename).toBe('data.csv')
    expect(meta.columns).toHaveLength(3)
  })

  it('DescriptiveStats allows null stdDev', () => {
    const stats: DescriptiveStats = {
      mean: 5,
      median: 5,
      stdDev: null,
      min: 1,
      max: 10,
      p25: 3,
      p75: 7,
    }
    expect(stats.stdDev).toBeNull()
  })

  it('ColumnProfile covers all four detected types', () => {
    const types: ColumnProfile['detectedType'][] = ['numeric', 'text', 'date', 'boolean']
    expect(types).toHaveLength(4)
  })

  it('Warning covers all four warning types', () => {
    const types: Warning['type'][] = ['pii', 'high_nulls', 'duplicate_header', 'insufficient_data']
    expect(types).toHaveLength(4)
  })

  it('OutlierEntry method is iqr or zscore', () => {
    const entry: OutlierEntry = { rowIndex: 0, column: 'col', value: 99, method: 'iqr' }
    expect(['iqr', 'zscore']).toContain(entry.method)
  })

  it('CorrelationMatrix has columns and values', () => {
    const matrix: CorrelationMatrix = { columns: ['a', 'b'], values: [[1, 0.5], [0.5, 1]] }
    expect(matrix.values[0][0]).toBe(1)
    expect(matrix.values[0][1]).toBe(matrix.values[1][0])
  })

  it('Distribution has frequencies with percent', () => {
    const dist: Distribution = {
      column: 'status',
      frequencies: [{ value: 'active', count: 80, percent: 80 }, { value: 'inactive', count: 20, percent: 20 }],
    }
    const total = dist.frequencies.reduce((s, f) => s + f.percent, 0)
    expect(total).toBe(100)
  })

  it('Trend direction is one of three values', () => {
    const directions: Trend['direction'][] = ['ascending', 'descending', 'stable']
    expect(directions).toHaveLength(3)
  })

  it('AnalysisError union covers all three kinds', () => {
    const errors: AnalysisError[] = [
      { kind: 'insufficient_data', column: 'x', minRequired: 2, actual: 1 },
      { kind: 'invalid_type', column: 'y', expectedType: 'numeric' },
      { kind: 'empty_column', column: 'z' },
    ]
    expect(errors.map(e => e.kind)).toEqual(['insufficient_data', 'invalid_type', 'empty_column'])
  })

  it('AnalysisResult initializes with empty arrays', () => {
    const result: AnalysisResult = {
      correlationMatrix: null,
      outliers: [],
      distributions: [],
      trends: [],
      warnings: [],
    }
    expect(result.correlationMatrix).toBeNull()
    expect(result.outliers).toHaveLength(0)
  })

  it('ParseResult has meta, rows and warnings', () => {
    const parsed: ParseResult = {
      meta: {
        filename: 'test.csv',
        rowCount: 1,
        columnCount: 1,
        columns: ['col'],
        uploadedAt: new Date().toISOString(),
        sessionId: 'abc',
      },
      rows: [{ col: 'value' }],
      warnings: [],
    }
    expect(parsed.rows).toHaveLength(1)
  })

  it('AnalysisInput includes all required fields', () => {
    const input: AnalysisInput = {
      rows: [{ a: '1', b: '2' }],
      selectedColumns: ['a', 'b'],
      columnProfiles: [],
      outlierMethod: 'iqr',
    }
    expect(input.outlierMethod).toBe('iqr')
    expect(input.temporalColumn).toBeUndefined()
  })

  it('SessionState initializes with null dataset', () => {
    const state: SessionState = {
      sessionId: crypto.randomUUID(),
      dataset: null,
      columnProfiles: [],
      selectedColumns: new Set(),
      analysisResult: null,
      warnings: [],
    }
    expect(state.dataset).toBeNull()
    expect(state.selectedColumns.size).toBe(0)
  })
})
