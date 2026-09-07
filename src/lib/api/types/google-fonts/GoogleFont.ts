export interface FontVariant {
    weight: number;
    isItalicSupported: boolean;
}

export interface GoogleFont {
    family: string;
    variants: string[];
    subsets: string[];
    version: string;
    lastModified: string;
    files: Record<string, string>;
    category: FontCategory;
    kind: string;
    menu?: string;
    // 추가 계산된 필드
    supportedWeights: FontVariant[];
}

export enum FontCategory {
    SERIF = 'serif',
    SANS_SERIF = 'sans-serif',
    MONOSPACE = 'monospace',
    DISPLAY = 'display',
    HANDWRITING = 'handwriting',
}

export enum FontSort {
    ALPHA = "alpha",
    DATE = "date",
    POPULARITY = "popularity",
    STYLE = "style",
    TRENDING = "trending",
}