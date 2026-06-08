export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomItem(array) {
  return array[randomInt(0, array.length - 1)];
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
