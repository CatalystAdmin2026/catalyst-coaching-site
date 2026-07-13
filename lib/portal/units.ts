const LBS_TO_KG = 0.453592;

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * LBS_TO_KG * 100) / 100;
}

export function kgToLbs(kg: number): number {
  return Math.round((kg / LBS_TO_KG) * 10) / 10;
}
