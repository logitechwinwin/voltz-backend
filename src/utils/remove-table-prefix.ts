function removePrefix(rawResult: any, prefix: string) {
  const newObj = {};
  for (const key in rawResult) {
    if (key.startsWith(prefix)) {
      newObj[key.replace(`${prefix}_`, "")] = rawResult[key];
    } else {
      newObj[key] = rawResult[key];
    }
  }
  return newObj;
}

export const removeTablePrefix = (rawResults: any[], prefix?: string) => {
  return rawResults.map(result => removePrefix(result, prefix));
};
