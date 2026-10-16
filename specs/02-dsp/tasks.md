# 02 DSP: tareas

- [x] **T1. Helpers de test**
  - PRNG con semilla (mulberry32), generador de senoidales e impulsos.
  - Commit: `test(dsp): add seeded signal generators for tests`

- [ ] **T2. DFT de referencia**
  - Cubre: DSP-R2.
  - Verifica: DFT de impulso y de constante.
  - Commit: `feat(dsp): add reference o(n^2) dft`

- [ ] **T3. Plan de FFT y transformada directa**
  - Cubre: DSP-R1, DSP-R3, DSP-R4.
  - Verifica: todos los criterios de DSP-R1 y DSP-R3 (comparación con DFT, casos analíticos, Parseval).
  - Commit: `feat(dsp): add iterative radix-2 fft with bit-reversal`

- [ ] **T4. Transformada inversa**
  - Cubre: DSP-R8.
  - Commit: `feat(dsp): add inverse fft`

- [ ] **T5. Ventana de Hann**
  - Cubre: DSP-R5.
  - Commit: `feat(dsp): add hann window`

- [ ] **T6. STFT y conversiones**
  - Cubre: DSP-R6, DSP-R7.
  - Verifica: senoidal de 1 kHz con pico en el bin 93; número de frames.
  - Commit: `feat(dsp): add stft and spectrogram helpers`

- [ ] **T7. Benchmark**
  - Cubre: DSP-R10.
  - Anotar el resultado en este archivo (sirve para el informe).
  - Commit: `perf(dsp): add stft benchmark`

- [ ] **T8. API pública y cobertura**
  - Cubre: DSP-R9.
  - Verifica: `index.ts` exporta solo lo de `design.md`; cobertura >= 90%.
  - Commit: `refactor(dsp): expose public api through module index`

## Resultados medidos

| Medida | Valor |
|---|---|
| Error máx. FFT vs DFT (N = 4096) | pendiente |
| STFT de 10 s (Node) | pendiente |
| FFT de 1024 puntos (promedio) | pendiente |
