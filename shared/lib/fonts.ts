// Ad headline font stacks (34 curated families).
//
// Loaded at runtime via the Google Fonts CSS import in src/app/globals.css.
// next/font/google is intentionally NOT used here: it is incompatible with
// the Cloudflare Workers build (esbuild has no .woff2 loader for the
// server-bundled font CSS). Consumers only ever need `.style.fontFamily`,
// so this map carries plain CSS stacks — same contract, zero build cost.

const SANS = "sans-serif";
const SERIF = "serif";

const FONT_STACKS: Record<string, string> = {
    'Anton': `'Anton', ${SANS}`,
    'Archivo Black': `'Archivo Black', ${SANS}`,
    'Barlow': `'Barlow', ${SANS}`,
    'Barlow Condensed': `'Barlow Condensed', ${SANS}`,
    'Bebas Neue': `'Bebas Neue', ${SANS}`,
    'Crimson Text': `'Crimson Text', ${SERIF}`,
    'Fira Sans': `'Fira Sans', ${SANS}`,
    'Fjalla One': `'Fjalla One', ${SANS}`,
    'Fredoka': `'Fredoka', ${SANS}`,
    'Inter': `'Inter', ${SANS}`,
    'Lato': `'Lato', ${SANS}`,
    'League Gothic': `'League Gothic', ${SANS}`,
    'League Spartan': `'League Spartan', ${SANS}`,
    'Merriweather': `'Merriweather', ${SERIF}`,
    'Montserrat': `'Montserrat', ${SANS}`,
    'Nunito': `'Nunito', ${SANS}`,
    'Open Sans': `'Open Sans', ${SANS}`,
    'Oswald': `'Oswald', ${SANS}`,
    'Pathway Gothic One': `'Pathway Gothic One', ${SANS}`,
    'Paytone One': `'Paytone One', ${SANS}`,
    'Playfair Display': `'Playfair Display', ${SERIF}`,
    'Poppins': `'Poppins', ${SANS}`,
    'PT Sans': `'PT Sans', ${SANS}`,
    'PT Sans Narrow': `'PT Sans Narrow', ${SANS}`,
    'Raleway': `'Raleway', ${SANS}`,
    'Roboto': `'Roboto', ${SANS}`,
    'Russo One': `'Russo One', ${SANS}`,
    'Source Sans 3': `'Source Sans 3', ${SANS}`,
    'Staatliches': `'Staatliches', ${SANS}`,
    'Syne': `'Syne', ${SANS}`,
    'Teko': `'Teko', ${SANS}`,
    'Titillium Web': `'Titillium Web', ${SANS}`,
    'Unbounded': `'Unbounded', ${SANS}`,
    'Work Sans': `'Work Sans', ${SANS}`,
};

export const fontMap: Record<string, { style: { fontFamily: string } }> =
    Object.fromEntries(
        Object.entries(FONT_STACKS).map(([name, stack]) => [
            name,
            { style: { fontFamily: stack } },
        ]),
    );

export type FontName = keyof typeof fontMap;
