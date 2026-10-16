# 03 Fingerprint: tareas

- [ ] **T1. Parámetros y versión**
  - Cubre: FP-R5.
  - Commit: `feat(fingerprint): add versioned fingerprint parameters`

- [ ] **T2. Codificación de hashes**
  - Cubre: FP-R3 (encode/decode).
  - Verifica: ida y vuelta con valores límite; resultado siempre >= 0.
  - Commit: `feat(fingerprint): add 32-bit hash encoding and decoding`

- [ ] **T3. Normalización**
  - Cubre: FP-R8.
  - Commit: `feat(fingerprint): add peak amplitude normalization`

- [ ] **T4. Detección de picos**
  - Cubre: FP-R2.
  - Verifica: silencio sin picos; senoidales con picos en los bins esperados; ruido con densidad acotada.
  - Commit: `feat(fingerprint): add band-based spectral peak picking`

- [ ] **T5. Hashes combinatorios**
  - Cubre: FP-R3.
  - Verifica: fan-out respetado; Δt y Δbin dentro de la zona objetivo.
  - Commit: `feat(fingerprint): add combinatorial hashing with target zone`

- [ ] **T6. Pipeline completo y modo debug**
  - Cubre: FP-R1, FP-R7.
  - Commit: `feat(fingerprint): add fingerprint pipeline with debug output`

- [ ] **T7. Propiedades de invariancia**
  - Cubre: FP-R4, FP-R6, FP-R8.
  - Verifica: snapshot determinista, desplazamiento temporal, escala de amplitud.
  - Commit: `test(fingerprint): add determinism and invariance tests`
