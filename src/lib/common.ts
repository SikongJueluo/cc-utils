export function parseBoolean(obj: string): boolean | undefined {
  const str = obj.toLowerCase();
  if (str === "true") return true;
  else if (str === "false") return false;
  else return undefined;
}

export function concatSentence(words: string[], length: number): string[] {
  let i = 0,
    j = 1;
  const ret: string[] = [];
  while (i < words.length) {
    let sentence = words[i];
    while (j < words.length && sentence.length + words[j].length < length) {
      sentence += words[j];
      j++;
    }
    ret.push(sentence);
    i = j;
    j++;
  }

  return ret;
}

/**
 * Deep copy function for TypeScript.
 * @param T Generic type of target/copied value.
 * @param target Target value to be copied.
 * @see Source project, ts-deepcopy https://github.com/ykdr2017/ts-deepcopy
 * @see Code pen https://codepen.io/erikvullings/pen/ejyBYg
 */
export function deepCopy<T>(target: T): T {
  if (target === null) {
    return target;
  }
  if (Array.isArray(target)) {
    return (target as unknown[]).map((v: unknown) => deepCopy(v)) as T;
  }
  if (typeof target === "object") {
    const cp = { ...(target as Record<string, unknown>) } as Record<
      string,
      unknown
    >;
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<unknown>(cp[k]);
    });
    return cp as T;
  }
  return target;
}
