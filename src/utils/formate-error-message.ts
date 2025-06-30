export const formatErrorMessage = (errMessage: string): string => {
  let formattedMessage = errMessage[0].toUpperCase();

  for (let i = 1; i < errMessage.length; i++) {
    const char = errMessage[i];
    if (char === " ") {
      formattedMessage += errMessage.slice(i);
      break;
    } else if (char === char.toUpperCase()) {
      formattedMessage += " " + char.toLowerCase();
    } else {
      formattedMessage += char;
    }
  }

  return formattedMessage;
};
