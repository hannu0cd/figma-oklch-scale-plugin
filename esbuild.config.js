const esbuild = require('esbuild');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

async function build() {
  fs.mkdirSync('dist', { recursive: true });

  // Bundle main thread
  const pluginCtx = await esbuild.context({
    entryPoints: ['src/plugin.ts'],
    bundle: true,
    outfile: 'dist/plugin.js',
    target: 'es2017',
    format: 'iife',
  });

  // Bundle UI thread and inline into HTML
  const uiResult = await esbuild.build({
    entryPoints: ['src/ui.ts'],
    bundle: true,
    write: false,
    target: 'es2017',
    format: 'iife',
  });
  if (!uiResult.outputFiles?.length) throw new Error('UI bundle produced no output');
  const uiScript = uiResult.outputFiles[0].text;
  const uiHtml = fs.readFileSync('src/ui.html', 'utf8');
  fs.writeFileSync('dist/ui.html', uiHtml.replace('</body>', `<script>${uiScript}</script></body>`));

  if (isWatch) {
    // Note: --watch only rebuilds plugin.js. ui.html is built once at startup.
    // To pick up ui.ts changes, stop and restart the watcher.
    await pluginCtx.watch();
    console.log('Watching...');
  } else {
    await pluginCtx.rebuild();
    await pluginCtx.dispose();
    console.log('Build complete');
  }
}

build().catch(err => { console.error(err); process.exit(1); });
