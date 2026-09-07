import {FontVariant} from "@/lib/api/types/google-fonts/GoogleFont";

export interface FontFamily {
    name: string;
    generic: string;
    weightList: FontVariant[];
}

const FONT_FAMILY_LIST: FontFamily[] = [
    // ==================== Serif ====================
    {
        name: "Crimson Text",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true }
        ]
    },
    {
        name: "Merriweather",
        generic: "serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Playfair Display",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Zilla Slab",
        generic: "serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true }
        ]
    },
    {
        name: "Fraunces",
        generic: "serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "DM Serif Display",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: true }
        ]
    },
    {
        name: "Alfa Slab One",
        generic: "serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },

    // ==================== Sans-Serif ====================
    {
        name: "Fira Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Inter",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Lato",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Montserrat",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Nunito",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Open Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "Oswald",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: false },
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Poppins",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Raleway",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Roboto",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Source Sans 3",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Work Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Space Grotesk",
        generic: "sans-serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true }
        ]
    },
    {
        name: "Outfit",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Sora",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "DM Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true },
            { weight: 1000, isItalicSupported: true }
        ]
    },
    {
        name: "Manrope",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "Plus Jakarta Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "Lexend",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Archivo",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Figtree",
        generic: "sans-serif",
        weightList: [
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Urbanist",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Bricolage Grotesque",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    },
    {
        name: "Barlow",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Barlow Condensed",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "Fjalla One",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Pathway Gothic One",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "PT Sans",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: true },
            { weight: 700, isItalicSupported: true }
        ]
    },
    {
        name: "PT Sans Narrow",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Titillium Web",
        generic: "sans-serif",
        weightList: [
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 900, isItalicSupported: true }
        ]
    },
    {
        name: "League Gothic",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "League Spartan",
        generic: "sans-serif",
        weightList: [
            { weight: 100, isItalicSupported: false },
            { weight: 200, isItalicSupported: false },
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false },
            { weight: 800, isItalicSupported: false },
            { weight: 900, isItalicSupported: false }
        ]
    },
    {
        name: "Russo One",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },

    // ==================== Display ====================
    {
        name: "Anton",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Archivo Black",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Bebas Neue",
        generic: "sans-serif",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Bangers",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Luckiest Guy",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Righteous",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Bungee",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Staatliches",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Teko",
        generic: "display",
        weightList: [
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Paytone One",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Lilita One",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Fredoka",
        generic: "display",
        weightList: [
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Syne",
        generic: "display",
        weightList: [
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false },
            { weight: 800, isItalicSupported: false }
        ]
    },
    {
        name: "Unbounded",
        generic: "display",
        weightList: [
            { weight: 200, isItalicSupported: false },
            { weight: 300, isItalicSupported: false },
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false },
            { weight: 800, isItalicSupported: false },
            { weight: 900, isItalicSupported: false }
        ]
    },

    // ==================== Handwriting ====================
    {
        name: "Caveat",
        generic: "handwriting",
        weightList: [
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },
    {
        name: "Pacifico",
        generic: "handwriting",
        weightList: [
            { weight: 400, isItalicSupported: false }
        ]
    },
    {
        name: "Dancing Script",
        generic: "handwriting",
        weightList: [
            { weight: 400, isItalicSupported: false },
            { weight: 500, isItalicSupported: false },
            { weight: 600, isItalicSupported: false },
            { weight: 700, isItalicSupported: false }
        ]
    },

    // ==================== Monospace ====================
    {
        name: "JetBrains Mono",
        generic: "monospace",
        weightList: [
            { weight: 100, isItalicSupported: true },
            { weight: 200, isItalicSupported: true },
            { weight: 300, isItalicSupported: true },
            { weight: 400, isItalicSupported: true },
            { weight: 500, isItalicSupported: true },
            { weight: 600, isItalicSupported: true },
            { weight: 700, isItalicSupported: true },
            { weight: 800, isItalicSupported: true }
        ]
    }
];

export default FONT_FAMILY_LIST;