export default function isValidPhaseInput(input: any): boolean {
  if (Array.isArray(input)) {

    return input.every((phase) => Number.isInteger(phase) && phase > 0);
  }

  if (typeof input === "string") {
    const trimmedInput = input.trim();
    

    const rangeRegex = /^\d+\s*-\s*\d+$/;
    if (rangeRegex.test(trimmedInput)) {
      return true;
    }

    const arrayRegex = /^\[\s*\d+(\s*,\s*\d+)*\s*\]$/;
    if (arrayRegex.test(trimmedInput)) {
      try {
        const parsedArray = JSON.parse(trimmedInput);
        return Array.isArray(parsedArray) && 
               parsedArray.every((phase) => Number.isInteger(phase) && phase > 0);
      } catch {
        return false;
      }
    }
  }

  return false;
}