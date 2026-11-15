import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const distDir = path.resolve("dist");
const html = await readFile(path.join(distDir, "index.html"), "utf8");
const scriptPath = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1];
const stylePath = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)"\s*\/?>/)?.[1];

if (!scriptPath || !stylePath) {
  throw new Error("Could not find the bundled app script and stylesheet in dist/index.html");
}

let js = await readFile(path.join(distDir, scriptPath.replace(/^\/+/, "")), "utf8");
const imageAssets = [
  "doctor.png",
  "doctor-bbgun.png",
  "doctor-sword.png",
  "doctor-rainbow.png",
  "shield.png",
  ...["bug", "octopus", "toad", "moss", "twoleg", "jellyfish", "heart", "whale"].map(
    (name) => `jellies/${name}.png`,
  ),
];
for (const asset of imageAssets) {
  const image = await readFile(path.join(distDir, asset));
  const dataUrl = `data:image/png;base64,${image.toString("base64")}`;
  for (const quote of ['"', "'", "`"]) {
    js = js.replaceAll(`${quote}./${asset}${quote}`, `${quote}${dataUrl}${quote}`);
  }
}
js = js.replace(/<\/script/gi, "<\\/script");
const css = (await readFile(path.join(distDir, stylePath.replace(/^\/+/, "")), "utf8"))
  .replace(/<\/style/gi, "<\\/style");
const standalone = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#b9a9ec" />
    <title>보건교사 안은영: 젤리슈터</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>`;

await Promise.all([
  writeFile(path.resolve("game.html"), standalone, "utf8"),
  writeFile(path.join(distDir, "game.html"), standalone, "utf8"),
]);
console.log("Created game.html for direct local use.");
