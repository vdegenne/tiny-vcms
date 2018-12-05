import * as fs from 'fs';

export function dashToCamelCase(text: string): string {
  return text.replace(/-([a-z])/g, (v) => v[1].toUpperCase());
}

export function fileExists(filepath: string) {
  try {
    const stat = fs.statSync(filepath);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}
