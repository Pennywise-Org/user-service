export const maskSSN = (ssn: string): string => {
  return `***-**-${ssn.slice(-4)}`;
};
