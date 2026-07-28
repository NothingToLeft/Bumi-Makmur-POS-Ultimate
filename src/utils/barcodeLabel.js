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

const escapeXml = value => String(value).replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[char]));

export function barcodeSvgMarkup(rawValue, options = {}) {
  const value = String(rawValue || '').trim().toUpperCase().replace(/[^0-9A-Z.\- $/+%]/g, '-');
  if (!value) return '';
  const narrow = Number(options.width || 1.6);
  const wide = narrow * 3;
  const height = Number(options.height || 52);
  const margin = Number(options.margin ?? 6);
  const fontSize = Number(options.fontSize || 11);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(2)} ${totalHeight}" width="100%" height="${totalHeight}" role="img" aria-label="Barcode ${escapeXml(value)}"><rect width="100%" height="100%" fill="#fff"/>${rects.join('')}<text x="${(totalWidth / 2).toFixed(2)}" y="${margin + height + fontSize}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="#000">${escapeXml(value)}</text></svg>`;
}
