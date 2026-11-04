// Global DOMMatrix and Path2D required by PDF.js in Node/jsdom
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
    constructor() {}
    scale() { return this; }
    translate() { return this; }
    multiply() { return this; }
    transformPoint(p: any) { return p; }
  } as any;
}

if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {} as any;
}

// Blob & File arrayBuffer polyfill for jsdom
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = Blob.prototype.arrayBuffer;
}

// Polyfill Uint8Array.prototype.toHex for PDF.js in Node/Vitest
if (!(Uint8Array.prototype as any).toHex) {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this as Uint8Array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  };
}
if (!(Uint8Array as any).fromHex) {
  (Uint8Array as any).fromHex = function (hexString: string) {
    const bytes = new Uint8Array(Math.floor((hexString || '').length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
  };
}

// Polyfill Map.prototype.getOrInsertComputed and getOrInsert for PDF.js
if (!(Map.prototype as any).getOrInsertComputed) {
  (Map.prototype as any).getOrInsertComputed = function (key: any, callback: (k: any) => any) {
    if (this.has(key)) {
      return this.get(key);
    }
    const val = callback(key);
    this.set(key, val);
    return val;
  };
}
if (!(Map.prototype as any).getOrInsert) {
  (Map.prototype as any).getOrInsert = function (key: any, defaultValue: any) {
    if (this.has(key)) {
      return this.get(key);
    }
    this.set(key, defaultValue);
    return defaultValue;
  };
}
