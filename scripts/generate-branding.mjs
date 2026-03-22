import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");

const logoSvg = fs.readFileSync(path.join(publicDir, "happlogo.svg"), "utf8");
const logoBase64 = Buffer.from(logoSvg).toString("base64");
const logoDataUri = `data:image/svg+xml;base64,${logoBase64}`;
/** happlogo.svg — kwadrat 1:1 */
const logoRatio = 1;

const render = (svg, outPath) => {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  fs.writeFileSync(outPath, pngData.asPng());
};

const ogW = 1200;
const ogH = 630;
const ogLogoSize = 420;
const ogLogoH = ogLogoSize * logoRatio;
const ogX = (ogW - ogLogoSize) / 2;
const ogY = (ogH - ogLogoH) / 2;
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}" viewBox="0 0 ${ogW} ${ogH}">
  <rect width="${ogW}" height="${ogH}" fill="#F8F4F5"/>
  <image href="${logoDataUri}" x="${ogX}" y="${ogY}" width="${ogLogoSize}" height="${ogLogoH}"/>
</svg>`;
render(ogSvg, path.join(publicDir, "og-image.png"));

const makeSquare = (size, logoWidth, outPath, bg) => {
  const logoHeight = logoWidth * logoRatio;
  const x = (size - logoWidth) / 2;
  const y = (size - logoHeight) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${bg}"/>
    <image href="${logoDataUri}" x="${x}" y="${y}" width="${logoWidth}" height="${logoHeight}"/>
  </svg>`;
  render(svg, outPath);
};

makeSquare(32, 24, path.join(publicDir, "favicon.png"), "#FFFFFF");
makeSquare(180, 140, path.join(publicDir, "apple-touch-icon.png"), "#FFFFFF");
makeSquare(192, 150, path.join(publicDir, "icon-192.png"), "#FFFFFF");
makeSquare(512, 360, path.join(publicDir, "icon-512.png"), "#FFFFFF");

const fav16Path = path.join(publicDir, "favicon-16.png");
makeSquare(16, 12, fav16Path, "#FFFFFF");

try {
  const { default: pngToIco } = await import("png-to-ico");
  const icoBuf = await pngToIco([fav16Path, path.join(publicDir, "favicon.png")]);
  fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuf);
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("favicon.ico skipped (install devDependency png-to-ico):", e?.message || e);
} finally {
  try {
    fs.unlinkSync(fav16Path);
  } catch {
    /* ignore */
  }
}

// eslint-disable-next-line no-console
console.log("Branding PNG/ICO written from public/happlogo.svg");
