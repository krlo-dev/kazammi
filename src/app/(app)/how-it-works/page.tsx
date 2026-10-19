import "katex/dist/katex.min.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Equation } from "@/app/_components/explain/Equation";
import {
  HashExampleView,
  HistogramView,
  PeakCount,
  RecognitionGate,
  RecognizedLead,
  SpectrogramView,
  WaveformView,
  WinnerLine,
} from "@/app/_components/explain/Visuals";

export const metadata: Metadata = { title: "Cómo funciona" };

/**
 * The pipeline, step by step, with the data of the last listening (UI-R22 to UI-R24).
 * Equations follow specs/00-foundation/math-model.md and render on the server.
 */
export default function HowItWorksPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-10 lg:pt-12">
      <h1 className="display text-[clamp(2.5rem,8vw,4.75rem)]">
        Cómo se <span className="text-fg-2">reconoció</span>
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        <RecognizedLead />
      </p>

      <RecognitionGate>
        <div className="mt-12 flex flex-col">
          <Step
            n={1}
            title="La grabación"
            text={
              <>
                El micrófono entrega presión de aire convertida en números. Kazammi toma hasta 12 s,
                los pasa a mono y los remuestrea a 11.025 Hz: alcanza para las frecuencias que
                distinguen una canción (hasta 5,5 kHz por Nyquist) y reduce el trabajo a la cuarta
                parte.
              </>
            }
            equation={
              <Equation
                label="Muestreo"
                tex={String.raw`x[n] = x(nT), \quad f_s = \frac{1}{T} = 11\,025\ \text{Hz}`}
              />
            }
          >
            <WaveformView />
          </Step>

          <Step
            n={2}
            title="El espectrograma"
            text={
              <>
                La transformada de Fourier dice qué frecuencias hay en un trozo de señal. Kazammi la
                calcula con su propia FFT radix-2 sobre ventanas de 1024 muestras (93 ms) que
                avanzan de a 512, cada una suavizada con una ventana de Hann. Cada columna es un
                instante; cada fila, una frecuencia; el color, cuánta energía hay.
              </>
            }
            equation={
              <>
                <Equation
                  label="Transformada discreta de Fourier"
                  tex={String.raw`X[k] = \sum_{n=0}^{N-1} x[n]\, e^{-j \frac{2\pi}{N} k n}`}
                />
                <Equation
                  label="Transformada de Fourier de tiempo corto"
                  tex={String.raw`X[m, k] = \sum_{n=0}^{N-1} x[n + mH]\, w[n]\, e^{-j \frac{2\pi}{N} k n}`}
                />
              </>
            }
          >
            <SpectrogramView />
          </Step>

          <Step
            n={3}
            title="La constelación"
            text={
              <>
                De todo el espectrograma solo importan los picos: en cada instante, el bin más
                fuerte de cada banda de frecuencia, si supera el promedio y empieza una nota. Esos
                puntos sobreviven al ruido y al volumen. Aquí hay <PeakCount />.
              </>
            }
            equation={
              <Equation label="Conjunto de picos" tex={String.raw`\mathcal{P} = \{(m_i, k_i)\}`} />
            }
          >
            <SpectrogramView withPeaks />
          </Step>

          <Step
            n={4}
            title="Los hashes"
            text={
              <>
                Cada pico funciona como ancla <em>a</em> y se empareja con hasta cinco picos de su
                zona objetivo, un poco más adelante en el tiempo. Cada par se guarda como un número
                de 32 bits: la frecuencia del ancla, la del punto y la distancia en frames. Un par
                es mucho más específico que un pico suelto.
              </>
            }
            equation={
              <Equation
                label="Hash de un par"
                tex={String.raw`h = (k_a \ll 23)\ \vert\ (k_p \ll 14)\ \vert\ (m_p - m_a)`}
              />
            }
          >
            <HashExampleView />
          </Step>

          <Step
            n={5}
            title="El desfase"
            text={
              <>
                Los hashes de la grabación se buscan en la base de datos. Si la grabación es de una
                canción, sus coincidencias comparten el mismo desfase δ: el momento de la canción en
                que empezaste a escuchar. Las coincidencias al azar se dispersan. El ganador es el
                track con el pico más alto.
              </>
            }
            equation={
              <>
                <Equation label="Desfase" tex={String.raw`\delta = m_{db} - m_q`} />
                <Equation
                  label="Puntaje"
                  tex={String.raw`\text{score}(track) = \max_{\delta} H_{track}(\delta)`}
                />
              </>
            }
          >
            <HistogramView />
            <WinnerLine />
          </Step>
        </div>
      </RecognitionGate>
    </main>
  );
}

function Step({
  n,
  title,
  text,
  equation,
  children,
}: {
  n: number;
  title: string;
  text: ReactNode;
  equation: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`step-${n}`}
      className="flex min-h-[min(100svh,64rem)] flex-col justify-center border-t border-hairline py-14"
    >
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <h2
            id={`step-${n}`}
            className="flex items-baseline gap-4 text-[clamp(1.75rem,4.5vw,2.75rem)] font-light tracking-[-0.03em]"
          >
            <span aria-hidden className="tabular-nums text-fg-3">
              {n}
            </span>
            <span>{title}</span>
          </h2>
          <p className="mt-4 max-w-[60ch] text-pretty text-[1.0625rem] leading-relaxed text-fg-2">
            {text}
          </p>
        </div>
        <div className="text-fg">{equation}</div>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
