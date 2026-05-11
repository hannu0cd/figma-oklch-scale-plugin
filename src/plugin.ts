import { generatePalette, TONE_STEPS } from './color';

const PALETTE_FRAME_NAME = 'COLOR PALETTE';
const COLLECTION_NAME = 'Color Palette';
// oklch(0.6 0.15 250) ≈ a medium blue
const DEFAULT_BASE: RGBA = { r: 0.11, g: 0.51, b: 0.93, a: 1 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function findPaletteFrame(): FrameNode | null {
  for (const node of figma.currentPage.children) {
    if (node.type === 'FRAME' && node.getPluginData('role') === 'palette') {
      return node;
    }
  }
  return null;
}

function findOrCreateCollection(): VariableCollection {
  const existing = figma.variables.getLocalVariableCollections()
    .find(c => c.name === COLLECTION_NAME);
  if (existing) return existing;
  return figma.variables.createVariableCollection(COLLECTION_NAME);
}

function sendInitState(): void {
  figma.ui.postMessage({ type: 'init-state', hasPalette: findPaletteFrame() !== null });
}

async function loadFonts(): Promise<void> {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
}

function createHeaderRow(): FrameNode {
  const header = figma.createFrame();
  header.name = 'header';
  header.layoutMode = 'HORIZONTAL';
  header.itemSpacing = 0;
  header.counterAxisSizingMode = 'AUTO';
  header.primaryAxisSizingMode = 'AUTO';
  header.fills = [];

  const nameLabel = figma.createText();
  nameLabel.characters = 'Name';
  nameLabel.resize(180, 20);

  const baseLabel = figma.createText();
  baseLabel.characters = 'Base';
  baseLabel.resize(60, 20);

  const tonesHeader = figma.createFrame();
  tonesHeader.name = 'tone-labels';
  tonesHeader.layoutMode = 'HORIZONTAL';
  tonesHeader.itemSpacing = 0;
  tonesHeader.counterAxisSizingMode = 'AUTO';
  tonesHeader.primaryAxisSizingMode = 'AUTO';
  tonesHeader.fills = [];

  for (const step of TONE_STEPS) {
    const label = figma.createText();
    label.characters = String(step);
    label.resize(60, 20);
    tonesHeader.appendChild(label);
  }

  header.appendChild(nameLabel);
  header.appendChild(baseLabel);
  header.appendChild(tonesHeader);
  return header;
}

function generateShortId(existingIds: string[]): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id: string;
  do {
    id = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (existingIds.includes(id));
  return id;
}

function getColorRows(palette: FrameNode): FrameNode[] {
  return palette.children.filter(
    n => n.type === 'FRAME' && n.getPluginData('role') === 'colorRow'
  ) as FrameNode[];
}

function bindFillToVariable(node: RectangleNode, variable: Variable): void {
  node.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 },
    boundVariables: { color: figma.variables.createVariableAlias(variable) },
  }];
}

function createColorRow(colorId: string, colorName: string, baseRgba: RGBA): FrameNode {
  const collection = findOrCreateCollection();
  const palette_ = generatePalette(baseRgba);

  // Create 19 variables
  const variables: Variable[] = TONE_STEPS.map(step => {
    const v = figma.variables.createVariable(`${colorName}/${step}`, collection.id, 'COLOR');
    v.setValueForMode(collection.defaultModeId, palette_[step]);
    return v;
  });

  const row = figma.createFrame();
  row.name = colorName;
  row.layoutMode = 'HORIZONTAL';
  row.itemSpacing = 0;
  row.counterAxisSizingMode = 'AUTO';
  row.primaryAxisSizingMode = 'AUTO';
  row.fills = [];

  // Name text
  const nameText = figma.createText();
  nameText.characters = colorName;
  nameText.resize(180, 60);
  nameText.setPluginData('role', 'name');

  // Base swatch (plain fill — user-editable input)
  const baseSwatch = figma.createRectangle();
  baseSwatch.resize(60, 60);
  baseSwatch.cornerRadius = 6;
  baseSwatch.fills = [{ type: 'SOLID', color: { r: baseRgba.r, g: baseRgba.g, b: baseRgba.b } }];
  baseSwatch.setPluginData('role', 'base');

  // Tones frame
  const tonesFrame = figma.createFrame();
  tonesFrame.name = 'tones';
  tonesFrame.layoutMode = 'HORIZONTAL';
  tonesFrame.itemSpacing = 0;
  tonesFrame.cornerRadius = 6;
  tonesFrame.clipsContent = true;
  tonesFrame.counterAxisSizingMode = 'AUTO';
  tonesFrame.primaryAxisSizingMode = 'AUTO';
  tonesFrame.fills = [];

  // 19 tone rects, each bound to its variable
  TONE_STEPS.forEach((step, i) => {
    const rect = figma.createRectangle();
    rect.resize(60, 60);
    rect.cornerRadius = 0;
    rect.name = String(step);
    bindFillToVariable(rect, variables[i]);
    tonesFrame.appendChild(rect);
  });

  row.appendChild(nameText);
  row.appendChild(baseSwatch);
  row.appendChild(tonesFrame);

  // Store metadata on the row
  row.setPluginData('role', 'colorRow');
  row.setPluginData('colorId', colorId);
  row.setPluginData('variableIds', JSON.stringify(variables.map(v => v.id)));

  return row;
}

function getBaseNode(row: FrameNode): RectangleNode | null {
  return (row.children.find(
    n => n.type === 'RECTANGLE' && n.getPluginData('role') === 'base'
  ) as RectangleNode) ?? null;
}

function getNameNode(row: FrameNode): TextNode | null {
  return (row.children.find(
    n => n.type === 'TEXT' && n.getPluginData('role') === 'name'
  ) as TextNode) ?? null;
}

function getStoredVariables(row: FrameNode): Variable[] {
  const ids: string[] = JSON.parse(row.getPluginData('variableIds') || '[]');
  return ids.map(id => figma.variables.getVariableById(id)).filter(Boolean) as Variable[];
}

function recalculateRow(row: FrameNode): void {
  const baseNode = getBaseNode(row);
  if (!baseNode) return;

  const fill = baseNode.fills[0];
  if (!fill || fill.type !== 'SOLID') return;

  const baseRgba: RGBA = { ...fill.color, a: 1 };
  const palette = generatePalette(baseRgba);
  const variables = getStoredVariables(row);
  const collection = findOrCreateCollection();

  TONE_STEPS.forEach((step, i) => {
    variables[i]?.setValueForMode(collection.defaultModeId, palette[step]);
  });
}

function renameRowVariables(row: FrameNode, newName: string): void {
  const variables = getStoredVariables(row);
  TONE_STEPS.forEach((step, i) => {
    if (variables[i]) variables[i].name = `${newName}/${step}`;
  });
  row.name = newName;
}

// ── Entry point ───────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 220, height: 130 });
sendInitState();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingRows = new Set<string>(); // colorIds awaiting recalculation

figma.on('documentchange', (event) => {
  const palette = findPaletteFrame();
  if (!palette) return;

  for (const change of event.documentChanges) {
    if (change.type !== 'PROPERTY_CHANGE') continue;

    const node = change.node as SceneNode & { getPluginData?: (key: string) => string };
    if (!node.getPluginData) continue;

    const role = node.getPluginData('role');

    if (role === 'base' && (change as any).properties.includes('fills')) {
      // Find parent color row
      const row = (node as SceneNode).parent as FrameNode;
      if (row?.getPluginData('role') === 'colorRow') {
        pendingRows.add(row.getPluginData('colorId'));
      }
    }

    if (role === 'name' && (change as any).properties.includes('characters')) {
      const row = (node as SceneNode).parent as FrameNode;
      if (row?.getPluginData('role') === 'colorRow') {
        const nameNode = node as TextNode;
        renameRowVariables(row, nameNode.characters);
      }
    }
  }

  if (pendingRows.size === 0) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const palette = findPaletteFrame();
    if (!palette) return;

    for (const colorId of pendingRows) {
      const row = getColorRows(palette).find(r => r.getPluginData('colorId') === colorId);
      if (row) recalculateRow(row);
    }
    pendingRows.clear();
    debounceTimer = null;
  }, 300);
});

figma.ui.onmessage = async (msg: { type: string }) => {
  if (msg.type === 'new-palette') await handleNewPalette();
  if (msg.type === 'new-color') await handleNewColor();
  if (msg.type === 'update-all') await handleUpdateAll();
};

async function handleNewPalette(): Promise<void> {
  if (findPaletteFrame()) return;

  await loadFonts();

  const palette = figma.createFrame();
  palette.name = PALETTE_FRAME_NAME;
  palette.layoutMode = 'VERTICAL';
  palette.itemSpacing = 23;
  palette.counterAxisSizingMode = 'AUTO';
  palette.primaryAxisSizingMode = 'AUTO';
  palette.fills = [];
  palette.setPluginData('role', 'palette');

  figma.currentPage.appendChild(palette);
  palette.appendChild(createHeaderRow());

  findOrCreateCollection(); // ensure collection exists

  figma.viewport.scrollAndZoomIntoView([palette]);
  sendInitState();
}

async function handleNewColor(): Promise<void> {
  const palette = findPaletteFrame();
  if (!palette) return;

  await loadFonts();

  const existingIds = getColorRows(palette).map(r => r.getPluginData('colorId'));
  const colorId = generateShortId(existingIds);
  const colorName = `color-${colorId}`;

  const row = createColorRow(colorId, colorName, DEFAULT_BASE);
  palette.appendChild(row);
}

async function handleUpdateAll(): Promise<void> {
  const palette = findPaletteFrame();
  if (!palette) return;

  for (const row of getColorRows(palette)) {
    recalculateRow(row);

    const nameNode = getNameNode(row);
    if (nameNode) renameRowVariables(row, nameNode.characters);
  }
}
