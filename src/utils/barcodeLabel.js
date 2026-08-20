const CODE39 = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn'
};

const EAN13_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN13_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN13_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

const escapeXml = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));

export function ean13CheckDigit(firstTwelve = '') {
  const value = String(firstTwelve || '').trim();
  if (!/^\d{12}$/.test(value)) return '';
  const sum = [...value].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function isValidEan13(rawValue = '') {
  const value = String(rawValue || '').trim();
  return /^\d{13}$/.test(value) && ean13CheckDigit(value.slice(0, 12)) === value[12];
}

function renderEan13(value, options = {}) {
  const moduleWidth = Math.max(0.7, Number(options.width || 1.25));
  const height = Math.max(24, Number(options.height || 52));
  const quietModules = Math.max(9, Number(options.quietModules || 11));
  const fontSize = Math.max(7, Number(options.fontSize || 11));
  const parity = EAN13_PARITY[Number(value[0])];
  let bits = '101';
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(value[index]);
    bits += parity[index - 1] === 'G' ? EAN13_G[digit] : EAN13_L[digit];
  }
  bits += '01010';
  for (let index = 7; index <= 12; index += 1) bits += EAN13_R[Number(value[index])];
  bits += '101';

  const rects = [];
  const startX = quietModules * moduleWidth;
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] !== '1') continue;
    const guard = index < 3 || (index >= 45 && index < 50) || index >= 92;
    rects.push(`<rect x="${(startX + index * moduleWidth).toFixed(2)}" y="0" width="${moduleWidth.toFixed(2)}" height="${(height + (guard ? 5 : 0)).toFixed(2)}" fill="#000"/>`);
  }
  const totalWidth = (quietModules * 2 + 95) * moduleWidth;
  const totalHeight = height + fontSize + 12;
  const left = value.slice(1, 7);
  const right = value.slice(7);
  const textY = height + fontSize + 7;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight.toFixed(2)}" width="100%" height="${totalHeight.toFixed(2)}" role="img" aria-label="EAN-13 ${escapeXml(value)}"><rect width="100%" height="100%" fill="#fff"/>${rects.join('')}<text x="${(moduleWidth * 2).toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="start" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#000">${value[0]}</text><text x="${(startX + 24 * moduleWidth).toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#000">${left}</text><text x="${(startX + 71 * moduleWidth).toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#000">${right}</text></svg>`;
}

function renderCode39(rawValue, options = {}) {
  const value = String(rawValue || '').trim().toUpperCase().replace(/[^0-9A-Z.\- $/+%]/g, '-');
  if (!value) return '';
  const narrow = Math.max(0.7, Number(options.width || 1.6));
  const wide = narrow * 3;
  const height = Math.max(24, Number(options.height || 52));
  const margin = Math.max(4, Number(options.margin ?? 6));
  const fontSize = Math.max(7, Number(options.fontSize || 11));
  const encoded = `*${value}*`;
  let x = margin;
  const rects = [];
  for (const char of encoded) {
    const pattern = CODE39[char] || CODE39['-'];
    for (let index = 0; index < pattern.length; index += 1) {
      const width = pattern[index] === 'w' ? wide : narrow;
      if (index % 2 === 0) rects.push(`<rect x="${x.toFixed(2)}" y="${margin}" width="${width.toFixed(2)}" height="${height}" fill="#000"/>`);
      x += width;
    }
    x += narrow;
  }
  const totalWidth = x + margin;
  const totalHeight = margin + height + fontSize + 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="100%" height="${totalHeight}" role="img" aria-label="Code 39 ${escapeXml(value)}"><rect width="100%" height="100%" fill="#fff"/>${rects.join('')}<text x="${(totalWidth / 2).toFixed(2)}" y="${margin + height + fontSize}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(value)}</text></svg>`;
}

export function barcodeSvgMarkup(rawValue, options = {}) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  const symbology = String(options.symbology || 'auto').toLowerCase();
  if ((symbology === 'auto' || symbology === 'ean13') && isValidEan13(value)) return renderEan13(value, options);
  return renderCode39(value, options);
}
