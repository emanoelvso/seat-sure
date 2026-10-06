import { QRCodeSVG } from "qrcode.react";

// The order id as a QR code (ORDDETAIL-02 AC 5), 136px in tint-400 on a
// transparent background as Figma's vector 5011:121655 (design.md assumed
// primary). The wrapper is the one image screen readers see.
export function OrderQrCode({ orderId }: { orderId: string }) {
  return (
    <div role="img" aria-label="Order QR code" className="text-tint-400">
      <QRCodeSVG
        value={orderId}
        size={136}
        fgColor="currentColor"
        bgColor="transparent"
        aria-hidden
      />
    </div>
  );
}
