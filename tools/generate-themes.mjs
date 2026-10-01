#!/usr/bin/env node
/**
 * Generates `tokens.css` — complete MD3 color schemes (light + dark,
 * all standard color roles) for every accent seed of the portfolio site.
 *
 * Algorithm: SchemeTonalSpot from Material Color Utilities — the same
 * pipeline Material Theme Builder uses to turn one seed color into
 * a full set of accessible color roles.
 *
 * The published package ships extensionless ESM imports, so bundle it
 * before running (Node cannot resolve the bare specifiers as-is):
 *
 *   npm install @material/material-color-utilities esbuild
 *   npx esbuild tools/generate-themes.mjs --bundle --platform=node \
 *       --format=esm --outfile=/tmp/generate-themes.mjs
 *   node /tmp/generate-themes.mjs > tokens.css
 *
 * Output selector order matters for cascade correctness:
 *   :root (default light) -> [data-accent] light -> [data-theme=dark] dark.
 */

import {
    argbFromHex,
    hexFromArgb,
    Hct,
    SchemeTonalSpot,
    MaterialDynamicColors,
} from '@material/material-color-utilities';

const ROLES = [
    'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
    'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
    'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
    'error', 'onError', 'errorContainer', 'onErrorContainer',
    'background', 'onBackground',
    'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
    'surfaceDim', 'surfaceBright',
    'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
    'surfaceContainerHigh', 'surfaceContainerHighest',
    'outline', 'outlineVariant',
    'inverseSurface', 'inverseOnSurface', 'inversePrimary',
    'shadow', 'scrim',
];

// Source seeds for the selectable accent themes (first one is the default).
const ACCENTS = [
    ['orange', '#C86F43'],
    ['purple', '#6750A4'],
    ['blue', '#3A66B8'],
    ['green', '#3B6E48'],
    ['rose', '#B3476A'],
];

const materialColors = new MaterialDynamicColors();

function schemeColors(hex, isDark) {
    const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(hex)), isDark, 0);
    const out = {};
    for (const role of ROLES) {
        out[role] = hexFromArgb(materialColors[role]().getArgb(scheme)).toUpperCase();
    }
    return out;
}

function cssVarName(role) {
    return `--md-sys-color-${role.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
}

function block(selector, colors, comment) {
    const lines = ROLES.map((role) => `  ${cssVarName(role)}: ${colors[role]};`);
    return `/* ${comment} */\n${selector} {\n${lines.join('\n')}\n}\n`;
}

let css = `/* ============================================================
 * MD3 color tokens — AUTO-GENERATED, do not edit by hand.
 * Generator: tools/generate-themes.mjs
 * (Material Color Utilities, SchemeTonalSpot = Material Theme Builder).
 * Each accent seed produces a complete light + dark scheme.
 * ============================================================ */\n\n`;

const [defaultAccent, ...otherAccents] = ACCENTS;
css += block(':root', schemeColors(defaultAccent[1], false),
    `Default accent: ${defaultAccent[0]} (seed ${defaultAccent[1]}) — light`);
css += '\n' + otherAccents.map(([name, hex]) =>
    block(`:root[data-accent="${name}"]`, schemeColors(hex, false),
        `Accent ${name} (seed ${hex}) — light`)).join('\n');
css += '\n' + ACCENTS.map(([name, hex]) =>
    block(`:root[data-theme="dark"][data-accent="${name}"]`, schemeColors(hex, true),
        `Accent ${name} (seed ${hex}) — dark`)).join('\n');

process.stdout.write(css);
