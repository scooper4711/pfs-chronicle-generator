export interface Layout {
    id: string;
    description: string;
    parent?: string;
    flags?: string[];
    aspectratio?: string;
    defaultChronicleLocation?: string;
    parameters?: { [group: string]: { [name: string]: Parameter } };
    canvas?: { [name: string]: Canvas };
    presets?: { [name: string]: Preset };
    content?: ContentElement[];
    // New format fields
    regions?: { [name: string]: number[] };  // [x, y, width, height] in percentages
    checkboxes?: Array<{
        x_pct: number;
        y_pct: number;
        bbox_pct: number[];  // [width, height] in percentages
        fill_ratio: number;
    }>;
    item_lines?: Array<{
        text: string;
        top_left_pct: number[];  // [x, y] in percentages
        bottom_right_pct: number[];  // [x, y] in percentages
    }>;
    notes?: string;  // Optional documentation
}

export interface Parameter {
    type: 'text' | 'societyid' | 'choice' | 'multiline';
    description: string;
    example: string;
    choices?: string[];
    lines?: number;
}

export interface Canvas {
    parent?: string;
    x: number;
    y: number;
    x2: number;
    y2: number;
}

export interface Preset {
    presets?: string[];
    canvas?: string;
    font?: string;
    fontweight?: 'normal' | 'bold';
    fontstyle?: 'normal' | 'italic';
    fontsize?: number;
    align?: string;
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    linewidth?: number;
    color?: string;
    size?: number;
    lines?: number;
    dummy?: number;
}

export interface ContentElement {
    type: 'text' | 'rectangle' | 'trigger' | 'choice' | 'line' | 'multiline' | 'strikeout' | 'checkbox';
    value?: string;
    presets?: string[];
    content?: ContentElement[] | { [key: string]: ContentElement[] };
    choices?: string | { [key: string]: ContentElement[] };
    trigger?: string;
    x?: number;
    y?: number;
    x2?: number;
    y2?: number;
    align?: string;
    color?: string;
    linewidth?: number;
    canvas?: string;
    fontweight?: 'normal' | 'bold';
    fontstyle?: 'normal' | 'italic';
}
