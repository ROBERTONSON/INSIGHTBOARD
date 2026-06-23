# Esquema de Datos JSON

```json
{
  "DatasetMeta": {
    "filename": "string",
    "rowCount": "number",
    "columnCount": "number",
    "columns": "ColumnProfile[]",
    "uploadedAt": "string",
    "sessionId": "string"
  },
  "ColumnProfile": {
    "name": "string",
    "detectedType": "string",
    "nullCount": "number",
    "nullPercent": "number",
    "uniqueCount": "number",
    "stats": "object"
  },
  "AnalysisResult": {
    "correlationMatrix": "object",
    "outliers": "object[]",
    "distributions": "object[]",
    "trends": "object[]",
    "warnings": "Warning[]"
  },
  "Warning": {
    "type": "pii | high_nulls | duplicate_header | insufficient_data",
    "column": "string",
    "message": "string"
  }
}
```
