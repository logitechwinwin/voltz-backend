export const generatePathToStoreImages = (partialPath: string) => {
  return `public/images/${partialPath}`;
};

export const extractPathOfImage = (path: string, splitOn: string = "public") => {
  return path ? encodeURI(path.split(splitOn)[1]) : "";
};
