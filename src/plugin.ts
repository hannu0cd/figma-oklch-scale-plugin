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

// ── Entry point ───────────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 220, height: 130 });
sendInitState();

figma.ui.onmessage = async (msg: { type: string }) => {
  if (msg.type === 'new-palette') await handleNewPalette();
  if (msg.type === 'new-color') await handleNewColor();
  if (msg.type === 'update-all') await handleUpdateAll();
};

async function handleNewPalette(): Promise<void> {
  // Task 5
}

async function handleNewColor(): Promise<void> {
  // Task 6
}

async function handleUpdateAll(): Promise<void> {
  // Task 8
}
