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
