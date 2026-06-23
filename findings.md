# Findings

- Edge case: Archivos grandes bloquean el thread principal, se usará PapaParse en chunks si es necesario.
- Edge case: Detección de tipos nulos requiere límite de 80%.
- Restricción: No usar servidor backend, todo en el cliente por privacidad.
