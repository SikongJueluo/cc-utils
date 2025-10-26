export function toString(val: unknown): string {
  let value = String(val);
  if (value === "[object Object]") {
    try {
      value = textutils.serialize(val as object);
    } catch {
      return "";
    }
  }
  return value;
}
