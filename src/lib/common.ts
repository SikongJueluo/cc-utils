export function parseBoolean(obj: string): boolean | undefined {
  const str = obj.toLowerCase();
  if (str === "true") return true;
  else if (str === "false") return false;
  else return undefined;
}
