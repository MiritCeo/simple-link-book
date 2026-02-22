import fs from "fs";
import { Resvg } from "@resvg/resvg-js";

const logoSvg = fs.readFileSync("public/purebooklogo.svg", "utf8");
const logoBase64 = Buffer.from(logoSvg).toString("base64");
const logoDataUri = `data:image/svg+xml;base64,${logoBase64}`;
const logoRatio = 123 / 117;

const render = (svg, outPath) => {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  fs.writeFileSync(outPath, pngData.asPng());
};

const ogW = 1200;
const ogH = 630;
const ogLogoW = 360;
const ogLogoH = ogLogoW * logoRatio;
const ogX = (ogW - ogLogoW) / 2;
const ogY = (ogH - ogLogoH) / 2;
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ogW}" height="${ogH}" viewBox="0 0 ${ogW} ${ogH}">
  <rect width="${ogW}" height="${ogH}" fill="#F8F4F5"/>
  <image href="${logoDataUri}" x="${ogX}" y="${ogY}" width="${ogLogoW}" height="${ogLogoH}"/>
</svg>`;
render(ogSvg, "public/og-image.png");

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

makeSquare(180, 140, "public/apple-touch-icon.png", "#FFFFFF");
makeSquare(192, 140, "public/icon-192.png", "#FFFFFF");
makeSquare(512, 320, "public/icon-512.png", "#FFFFFF");
