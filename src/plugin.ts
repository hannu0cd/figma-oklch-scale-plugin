import { generatePalette, TONE_STEPS } from './color';

const PALETTE_FRAME_NAME = 'COLOR PALETTE';
const COLLECTION_NAME = 'Color Palette';
const DEBOUNCE_MS = 300;
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

async function findOrCreateCollection(): Promise<VariableCollection> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const existing = collections.find(c => c.name === COLLECTION_NAME);
  if (existing) return existing;
  return figma.variables.createVariableCollection(COLLECTION_NAME);
}

let lastHasPalette: boolean | null = null;

function sendInitState(): void {
  lastHasPalette = findPaletteFrame() !== null;
  figma.ui.postMessage({ type: 'init-state', hasPalette: lastHasPalette });
}

function reportError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[Color Palette] ${context}:`, err);
  figma.notify(`${context}: ${message}`, { error: true });
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

function findRowByColorId(palette: FrameNode, colorId: string): FrameNode | undefined {
  return getColorRows(palette).find(r => r.getPluginData('colorId') === colorId);
}

function bindFillToVariable(node: RectangleNode, variable: Variable): void {
  node.fills = [{
    type: 'SOLID',
    color: { r: 0, g: 0, b: 0 },
    boundVariables: { color: figma.variables.createVariableAlias(variable) },
  }];
}

async function createColorRow(colorId: string, colorName: string, baseRgba: RGBA): Promise<FrameNode> {
  const collection = await findOrCreateCollection();
  const tones = generatePalette(baseRgba);

  // Create 19 variables
  const variables: Variable[] = TONE_STEPS.map(step => {
    const v = figma.variables.createVariable(`${colorName}/${step}`, collection, 'COLOR');
    v.setValueForMode(collection.defaultModeId, tones[step]);
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

async function getStoredVariables(row: FrameNode): Promise<Variable[]> {
  const ids: string[] = JSON.parse(row.getPluginData('variableIds') || '[]');
  const variables = await Promise.all(ids.map(id => figma.variables.getVariableByIdAsync(id)));
  return variables.filter((v): v is Variable => v !== null);
}

async function recalculateRow(row: FrameNode): Promise<void> {
  const baseNode = getBaseNode(row);
  if (!baseNode) return;

  const fills = baseNode.fills;
  if (!Array.isArray(fills)) return;
  const fill = fills[0];
  if (!fill || fill.type !== 'SOLID') return;

  const baseRgba: RGBA = { ...fill.color, a: 1 };
  const tones = generatePalette(baseRgba);
  const variables = await getStoredVariables(row);
  const collection = await findOrCreateCollection();

  TONE_STEPS.forEach((step, i) => {
    variables[i]?.setValueForMode(collection.defaultModeId, tones[step]);
  });
}

/**
 * Renames the row's 19 variables to `{newName}/{step}`.
 * Figma throws on empty, malformed, or duplicate variable names, so the name
 * is validated against the collection first to avoid a partial rename.
 */
async function renameRowVariables(row: FrameNode, newName: string): Promise<void> {
  const name = newName.trim();
  if (!name) {
    figma.notify('Color name cannot be empty', { error: true });
    return;
  }

  const variables = await getStoredVariables(row);
  if (variables.length === 0) return;

  const ownIds = new Set(variables.map(v => v.id));
  const collection = await findOrCreateCollection();
  const allColorVariables = await figma.variables.getLocalVariablesAsync('COLOR');
  const takenNames = new Set(
    allColorVariables
      .filter(v => v.variableCollectionId === collection.id && !ownIds.has(v.id))
      .map(v => v.name)
  );

  const clash = TONE_STEPS.find(step => takenNames.has(`${name}/${step}`));
  if (clash !== undefined) {
    figma.notify(`A color named "${name}" already exists in the palette`, { error: true });
    return;
  }

  TONE_STEPS.forEach((step, i) => {
    if (variables[i]) variables[i].name = `${name}/${step}`;
  });
  row.name = name;
}

// ── Entry point ───────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 220, height: 130 });
sendInitState();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const pendingRecalc = new Set<string>(); // colorIds whose base color changed
const pendingRename = new Set<string>(); // colorIds whose name text changed

async function flushPendingChanges(): Promise<void> {
  const palette = findPaletteFrame();
  if (!palette) {
    pendingRecalc.clear();
    pendingRename.clear();
    return;
  }

  const recalcIds = [...pendingRecalc];
  const renameIds = [...pendingRename];
  pendingRecalc.clear();
  pendingRename.clear();

  for (const colorId of recalcIds) {
    const row = findRowByColorId(palette, colorId);
    if (row) await recalculateRow(row);
  }

  for (const colorId of renameIds) {
    const row = findRowByColorId(palette, colorId);
    const nameNode = row && getNameNode(row);
    if (row && nameNode) await renameRowVariables(row, nameNode.characters);
  }
}

figma.on('documentchange', (event) => {
  const palette = findPaletteFrame();
  const hasPalette = palette !== null;
  if (hasPalette !== lastHasPalette) sendInitState();
  if (!palette) return;

  for (const change of event.documentChanges) {
    if (change.type !== 'PROPERTY_CHANGE') continue;
    if (change.node.removed) continue;

    const node = change.node as SceneNode;
    const role = node.getPluginData('role');
    if (role !== 'base' && role !== 'name') continue;

    const row = node.parent as FrameNode | null;
    if (row?.getPluginData('role') !== 'colorRow') continue;
    const colorId = row.getPluginData('colorId');

    if (role === 'base' && change.properties.includes('fills')) pendingRecalc.add(colorId);
    if (role === 'name' && change.properties.includes('characters')) pendingRename.add(colorId);
  }

  if (pendingRecalc.size === 0 && pendingRename.size === 0) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flushPendingChanges().catch(err => reportError('Failed to sync palette', err));
  }, DEBOUNCE_MS);
});

figma.ui.onmessage = async (msg: { type: string }) => {
  try {
    if (msg.type === 'new-palette') await handleNewPalette();
    if (msg.type === 'new-color') await handleNewColor();
    if (msg.type === 'update-all') await handleUpdateAll();
  } catch (err) {
    reportError('Color Palette error', err);
  }
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

  await findOrCreateCollection(); // ensure collection exists

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

  const row = await createColorRow(colorId, colorName, DEFAULT_BASE);
  palette.appendChild(row);
}

async function handleUpdateAll(): Promise<void> {
  const palette = findPaletteFrame();
  if (!palette) return;

  for (const row of getColorRows(palette)) {
    await recalculateRow(row);

    const nameNode = getNameNode(row);
    if (nameNode) await renameRowVariables(row, nameNode.characters);
  }
  figma.notify('Palette updated');
}
