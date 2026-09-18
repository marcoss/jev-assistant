import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { default: mermaid } = await import("mermaid");
const files = process.argv.slice(2);

if (files.length === 0) {
  throw new Error("Pass at least one Markdown file.");
}

for (const file of files) {
  const markdown = await readFile(file, "utf8");
  const diagrams = [...markdown.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)];

  for (const [index, match] of diagrams.entries()) {
    try {
      await mermaid.parse(match[1]);
    } catch (error) {
      console.error(`${file}: Mermaid block ${index + 1} is invalid.`);
      throw error;
    }
  }
}
