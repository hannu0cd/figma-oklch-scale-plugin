import { generatePalette, TONE_STEPS } from './color';

const PALETTE_FRAME_NAME = 'COLOR PALETTE';
const COLLECTION_NAME = 'Color Palette';

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

// ── Entry point ───────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 220, height: 130 });
sendInitState();

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
  // Task 6
}

async function handleUpdateAll(): Promise<void> {
  // Task 8
}
