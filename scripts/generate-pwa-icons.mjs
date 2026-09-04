// Script de manutenção, não roda no build. Gera os PNGs de public/icons/ a partir de
// public/favicon.svg. Se o logo mudar, rode `npm install -D sharp`, depois
// `node scripts/generate-pwa-icons.mjs`, depois `npm uninstall sharp` de novo.
import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'icons')

// Mesmo ícone do favicon, mas em fundo quadrado full-bleed (sem cantos arredondados) e com a
// tesoura reduzida/centralizada dentro do "safe zone" de 80% exigido pelo spec de maskable icon
// — o SO aplica sua própria máscara (círculo, squircle, etc.) por cima, então o conteúdo não
// pode encostar nas bordas.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0a0a0a"/>
  <g transform="translate(50 50) scale(0.7) translate(-55 -50)" fill="none" stroke="#d4af37" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="70" r="10"/>
    <circle cx="30" cy="30" r="10"/>
    <line x1="38" y1="36" x2="80" y2="78"/>
    <line x1="38" y1="64" x2="80" y2="22"/>
  </g>
</svg>`

async function main() {
  await mkdir(outDir, { recursive: true })
  const source = await readFile(path.join(root, 'public', 'favicon.svg'))

  await sharp(source, { density: 384 }).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'))
  await sharp(source, { density: 384 }).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))
  await sharp(Buffer.from(maskableSvg), { density: 384 })
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512-maskable.png'))

  console.log('Ícones gerados em public/icons/')
}

main()
