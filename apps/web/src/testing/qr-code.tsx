import { QRCodeSVG } from "qrcode.react";
import { renderToStaticMarkup } from "react-dom/server";

// The path `d` attribute of the module-drawing path of the QR code that
// encodes `value` at the 136px size the order QR code renders, so a story can
// compare it with what a component drew.
export function qrCodePath(value: string) {
  const markup = renderToStaticMarkup(<QRCodeSVG value={value} size={136} />);
  const paths = new DOMParser()
    .parseFromString(markup, "image/svg+xml")
    .querySelectorAll("path");
  // The first path is the background, the last one draws the modules.
  return paths[paths.length - 1].getAttribute("d");
}
