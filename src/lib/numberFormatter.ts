export function formatCompactNumber(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue < 1_000) {
    return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
  }

  const units = [
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];
  const unit = units.find((item) => absoluteValue >= item.value);

  if (!unit) {
    return String(value);
  }

  const scaled = value / unit.value;
  const formatted = new Intl.NumberFormat("en", {
    maximumFractionDigits: scaled < 10 ? 1 : 0,
    minimumFractionDigits: 0,
  }).format(scaled);

  return `${formatted}${unit.suffix}`;
}
