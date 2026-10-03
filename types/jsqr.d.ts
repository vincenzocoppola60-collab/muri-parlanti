declare module "jsqr" {
  type Point = { x: number; y: number };

  interface QRCode {
    binaryData: Uint8ClampedArray;
    data: string;
    chunks: { type: number; text: string }[];
    version: number;
    location: {
      topRightCorner: Point;
      topLeftCorner: Point;
      bottomRightCorner: Point;
      bottomLeftCorner: Point;
      topRightFinderPattern: Point;
      topLeftFinderPattern: Point;
      bottomLeftFinderPattern: Point;
      bottomRightFinderPattern: Point;
    };
  }

  interface JsQRCodeOptions {
    inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst";
  }

  function jsQR(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    options?: JsQRCodeOptions
  ): QRCode | null;

  export default jsQR;
}
