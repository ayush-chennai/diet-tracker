// generate-icons.mjs
// Run: node generate-icons.mjs
// Requires: npm install sharp
// This creates icon-192.png, icon-512.png, apple-touch-icon.png from icon.svg

import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/icon.svg')

await sharp(svg).resize(192, 192).png().toFile('./public/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('./public/icon-512.png')
await sharp(svg).resize(180, 180).png().toFile('./public/apple-touch-icon.png')

console.log('✅ Icons generated!')
