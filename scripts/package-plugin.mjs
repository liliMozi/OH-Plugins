import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OFFICIAL_PLUGINS_DIR = path.join(ROOT, "official-plugins");
const DIST_DIR = path.join(ROOT, "dist");
const EXCLUDED_DIRS = new Set(["tests", "ui", "node_modules"]);
const EXCLUDED_FILES = new Set([".DS_Store", "package-lock.json"]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function collectFiles(rootDir, dir = rootDir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;
    if (entry.isFile() && EXCLUDED_FILES.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(rootDir, fullPath));
    } else if (entry.isFile()) {
      const relativePath = path.relative(rootDir, fullPath).split(path.sep).join("/");
      files.push({ fullPath, relativePath });
    }
  }
  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function createStoredZip({ rootDir, prefix, outFile }) {
  const files = await collectFiles(rootDir);
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const zipName = `${prefix}/${file.relativePath}`;
    const nameBuf = Buffer.from(zipName);
    const data = await fs.readFile(file.fullPath);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  const zip = Buffer.concat([...locals, ...centrals, end]);
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, zip);
  return {
    fileCount: files.length,
    bytes: zip.length,
    sha256: crypto.createHash("sha256").update(zip).digest("hex"),
  };
}

async function main() {
  const pluginId = process.argv[2];
  if (!pluginId) throw new Error("Usage: node scripts/package-plugin.mjs <plugin-id>");
  const sourceDirArg = process.argv[3];
  const pluginDir = sourceDirArg ? path.resolve(sourceDirArg) : path.join(OFFICIAL_PLUGINS_DIR, pluginId);
  const manifestPath = path.join(pluginDir, "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.id !== pluginId) throw new Error(`${pluginId}: manifest id mismatch`);

  const outFile = path.join(DIST_DIR, `${pluginId}.zip`);
  const result = await createStoredZip({ rootDir: pluginDir, prefix: pluginId, outFile });
  console.log(JSON.stringify({
    pluginId,
    version: manifest.version,
    file: path.relative(ROOT, outFile),
    ...result,
  }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
