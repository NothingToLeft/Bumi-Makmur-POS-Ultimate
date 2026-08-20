import test from 'node:test';
import assert from 'node:assert/strict';
import { barcodeSvgMarkup, ean13CheckDigit, isValidEan13 } from '../src/utils/barcodeLabel.js';

test('EAN-13 menghitung check digit dan memvalidasi barcode pabrik', () => {
  assert.equal(ean13CheckDigit('400638133393'), '1');
  assert.equal(isValidEan13('4006381333931'), true);
  assert.equal(isValidEan13('4006381333932'), false);
  assert.equal(isValidEan13('BM-PHL-10W'), false);
});

test('barcode valid EAN-13 dicetak memakai pola EAN-13 asli', () => {
  const svg = barcodeSvgMarkup('4006381333931', { width: 1.2 });
  assert.match(svg, /aria-label="EAN-13 4006381333931"/);
  assert.doesNotMatch(svg, /Code 39/);
});

test('barcode internal non-EAN tetap kompatibel memakai Code 39', () => {
  const svg = barcodeSvgMarkup('BM-PHL-LED-10W');
  assert.match(svg, /aria-label="Code 39 BM-PHL-LED-10W"/);
  assert.match(svg, />BM-PHL-LED-10W<\/text>/);
});
