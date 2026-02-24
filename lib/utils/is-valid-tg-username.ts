export function isValidTelegramUsername(username: string): boolean {
  if (!username.startsWith("@")) return false;
  const name = username.slice(1);
  if (name.length < 5 || name.length > 32) return false;
  return /^[a-zA-Z0-9_]+$/.test(name);
}