import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const source = process.argv[2];
if (!source) throw new Error("Informe o HTML de referencia.");

const html = await readFile(source, "utf8");
const output = resolve("public/idle/assets");
const names = {
  mageSheet: "reference-mage",
  tileSheet: "reference-terrain",
  gothicSheet: "reference-gothic",
  vampireSheet: "reference-vampire",
};
const pattern = /(mageSheet|tileSheet|gothicSheet|vampireSheet)\.src\s*=\s*['"]data:image\/([a-z0-9.+-]+);base64,([^'"]+)['"]/gi;

await mkdir(output, { recursive: true });
const found = new Set();
let match;
while ((match = pattern.exec(html))) {
  const [, variable, mimeSubtype, encoded] = match;
  const extension = mimeSubtype.includes("webp") ? ".webp" : mimeSubtype.includes("jpeg") ? ".jpg" : ".png";
  const file = resolve(output, `${names[variable]}${extension}`);
  if (!extname(file)) throw new Error("Formato de imagem invalido.");
  await writeFile(file, Buffer.from(encoded, "base64"));
  found.add(variable);
}

if (found.size !== Object.keys(names).length) {
  throw new Error(`Esperados ${Object.keys(names).length} assets, extraidos ${found.size}: ${[...found].join(", ")}`);
}
console.log(`${found.size} folhas de referencia extraidas.`);
