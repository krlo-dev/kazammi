import katex from "katex";

/** Display equation rendered on the server with KaTeX (UI-R23). */
export function Equation({ tex, label }: { tex: string; label: string }) {
  const html = katex.renderToString(tex, {
    displayMode: true,
    throwOnError: false,
    output: "htmlAndMathml",
  });
  return (
    <figure
      aria-label={label}
      className="max-w-full overflow-x-auto py-1 text-[0.92rem] min-[400px]:text-[1.05rem] sm:text-[1.3rem]"
    >
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
