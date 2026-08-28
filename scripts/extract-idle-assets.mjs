import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Informe o HTML de origem.");

const html = await readFile(source, "utf8");
const output = resolve("public/idle/assets");
const wanted = new Set(["cowboyWalk", "cowboyAttack", "vampireMoveV12", "vampireAttackV12"]);
const pattern = /const\s+(\w+)\s*=\s*loadImage\('data:image\/(\w+);base64,([^']+)'\)/g;

await mkdir(output, { recursive: true });
let match;
let count = 0;
while ((match = pattern.exec(html))) {
  const [, name, extension, encoded] = match;
  if (!wanted.has(name)) continue;
  const file = resolve(output, `${name}.${extension}`);
  if (dirname(file) !== output) throw new Error("Caminho de asset invalido.");
  await writeFile(file, Buffer.from(encoded, "base64"));
  count += 1;
}

if (count !== wanted.size) throw new Error(`Esperados ${wanted.size} assets, extraidos ${count}.`);
console.log(`${count} sprites extraidos para public/idle/assets.`);
