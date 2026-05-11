const btnNewPalette = document.getElementById('btn-new-palette') as HTMLButtonElement;
const btnNewColor = document.getElementById('btn-new-color') as HTMLButtonElement;
const btnUpdateAll = document.getElementById('btn-update-all') as HTMLButtonElement;

btnNewPalette.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'new-palette' } }, '*');
});

btnNewColor.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'new-color' } }, '*');
});

btnUpdateAll.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'update-all' } }, '*');
});

window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage as { type: string; hasPalette: boolean };
  if (msg?.type === 'init-state') {
    btnNewPalette.disabled = msg.hasPalette;
    btnNewColor.disabled = !msg.hasPalette;
    btnUpdateAll.disabled = !msg.hasPalette;
  }
};
