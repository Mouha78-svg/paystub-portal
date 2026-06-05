const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';

// Generates a random 8-char PIN guaranteed to contain at least one of each class.
function generatePin() {
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const all = UPPER + LOWER + DIGITS;
  const chars = [
    pick(UPPER),
    pick(UPPER),
    pick(LOWER),
    pick(LOWER),
    pick(DIGITS),
    pick(DIGITS),
    pick(all),
    pick(all),
  ];
  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

module.exports = { generatePin };
