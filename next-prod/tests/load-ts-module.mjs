import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const projectRoot = resolve(".");
const tmpRoot = resolve("tests/.tmp-ts-modules");

function resolveLocalSpecifier(sourceFile, specifier) {
  const basePath = resolve(dirname(sourceFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    join(basePath, "index.ts"),
    join(basePath, "index.tsx"),
  ];

  return candidates.find((candidate) => {
    try {
      readFileSync(candidate, "utf8");
      return true;
    } catch {
      return false;
    }
  });
}

function rewriteImports(outputText) {
  return outputText
    .replace(/^import\s+["']server-only["'];?\s*$/gm, "")
    .replace(
    /(from\s+["'])(\.[^"']+)(["'])/g,
    (_match, prefix, specifier, suffix) => {
      if (specifier.endsWith(".mjs")) {
        return `${prefix}${specifier}${suffix}`;
      }

      if (specifier.endsWith(".ts") || specifier.endsWith(".tsx")) {
        return `${prefix}${specifier.replace(/\.tsx?$/, ".mjs")}${suffix}`;
      }

      return `${prefix}${specifier}.mjs${suffix}`;
    },
  );
}

function transpileRecursive(entryFile, seen = new Set()) {
  if (seen.has(entryFile)) {
    return;
  }

  seen.add(entryFile);

  const source = readFileSync(entryFile, "utf8");
  const relPath = relative(projectRoot, entryFile).replace(/\\/g, "/");
  const outputPath = resolve(
    tmpRoot,
    relPath.replace(/\.tsx?$/, ".mjs"),
  );

  mkdirSync(dirname(outputPath), { recursive: true });

  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: entryFile,
  }).outputText;

  writeFileSync(outputPath, rewriteImports(transpiled), "utf8");

  const importPattern =
    /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["'](\.[^"']+)["']/g;

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    const resolved = resolveLocalSpecifier(entryFile, specifier);
    if (resolved) {
      transpileRecursive(resolved, seen);
    }
  }
}

export async function loadTsModule(relativeEntryFile) {
  rmSync(tmpRoot, { force: true, recursive: true });

  const entryFile = resolve(projectRoot, relativeEntryFile);
  transpileRecursive(entryFile);

  const outputFile = resolve(
    tmpRoot,
    relative(projectRoot, entryFile).replace(/\.tsx?$/, ".mjs"),
  );

  return import(`${pathToFileURL(outputFile).href}?t=${Date.now()}`);
}
