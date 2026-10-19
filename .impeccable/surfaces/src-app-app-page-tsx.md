---
version: 1
slug: "src-app-app-page-tsx"
primary_target: "src/app/(app)/page.tsx"
related_targets: ["src/app/login/page.tsx","src/app/(app)/saved/page.tsx","src/app/(app)/playlists/page.tsx","src/app/(app)/how-it-works/page.tsx"]
---

# Kazammi app surfaces

Scope: every authenticated route (`/`, `/saved`, `/playlists`, `/playlists/[id]`, `/how-it-works`) plus `/login`. Mode: **Operate** (identify, library) with `/how-it-works` in **Read**. Spec: `specs/08-ui`. Visual world pinned by the user: `specs/08-ui/design-references.md` is binding.

Audience and job: a presenter in front of a projector and a user with a phone identify a song by microphone, save it, file it into playlists, and see how the Fourier pipeline recognized it. Projection and phone weigh the same.

Confirmed answers (2026-10-19): `/how-it-works` is a step-by-step walk, one pipeline step per screen, big, with its equation. The result screen shows only position in the song and confidence; technical numbers stay in `/how-it-works`. Must not feel like a template, must not be illegible when projected.

## Direction contract

THESIS: The orb is the FFT made visible. The identify screen is one live instrument, not a dashboard with a microphone button: the ring is drawn from `live.spectrum` every frame, and the three cumulative attempts are marks on that same ring. It refuses the category default of a static pulsing button with a spinner.

OWN-WORLD: Black-to-indigo field (#050609 to #0b0726 to #1a1045) with a violet horizon glow (#342393). Neon ring gradient teal #1fd1a5, violet #6036a4, magenta #c03cff. Frosted glass cards rgba(255,255,255,.06) with a hairline top highlight. Geist at 300 for display titles set in two tones (first word white, second lavender #a49fc4), 400 to 600 for UI. White primary button, dark pill secondary actions, circular icon buttons. Login: pure black with a spectral horizon arc.

STORY: The visitor sees one obvious thing to touch, hears the room become a moving ring, watches the attempt marks fill, and sees the ring resolve into the cover. They save it in one tap and can follow the same audio through waveform, spectrogram, peaks, hashes and offset histogram.

FIRST VIEWPORT: Header row (Mono DJ mark and wordmark left; initials avatar and grid menu button right). Title "Identificar / canciones" in two light lines, left aligned, ~clamp(44px, 7vw, 88px). The orb dead center, about 60% of the short viewport side on phone and 44vh on desktop, mic glyph in its core, label "Toca para identificar" under it. "Mis canciones" glass row anchored to the bottom with "Ver todo".

FORM: Brief-pinned world from the reference videos (position 1 of 1). No concept-seed roll: the user made the references binding. Seed key: none (pinned).

SIGNATURE INTERACTION: Listening expands the orb to near full width; its radius breathes with `live.level` and its edge deforms with the 128 spectrum bands mirrored around the circle; an outer track fills over 12 s with ticks at 4, 8 and 12 s that flash when an attempt is processing. On match the ring collapses into the cover, which blooms with a halo sampled from the cover's own color. Motion grammar: slow ambient rotation at rest, audio-driven only while listening, one decisive resolve; everything static under `prefers-reduced-motion`.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
