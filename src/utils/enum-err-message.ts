export const enumErrorMessage = (fieldName: string, enumValue: object): string => {
  let arr = [];
  for (const i in enumValue) {
    arr.push(enumValue[i]);
  }

  return `${fieldName} can be one of ${arr.join(" or ")}`;
};
