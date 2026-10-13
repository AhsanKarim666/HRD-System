const PTKP_TK0 = 54000000;

const calculateAnnualPph21 = (taxableIncome) => {
  const brackets = [
    { limit: 60000000, rate: 0.05 },
    { limit: 250000000, rate: 0.15 },
    { limit: 500000000, rate: 0.25 },
    { limit: 5000000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];
  let remaining = taxableIncome;
  let lowerLimit = 0;
  let tax = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.max(0, Math.min(remaining, bracket.limit - lowerLimit));
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    lowerLimit = bracket.limit;
    if (remaining <= 0) break;
  }

  return tax;
};

const calculateMonthlyPph21 = (monthlyGross) => {
  const gross = Number(monthlyGross);
  if (!Number.isFinite(gross) || gross < 0) {
    throw new RangeError('Penghasilan bruto bulanan harus berupa angka nol atau lebih.');
  }

  const annualGross = gross * 12;
  if (!Number.isFinite(annualGross)) {
    throw new RangeError('Penghasilan bruto tahunan berada di luar rentang kalkulasi.');
  }
  const annualJobExpense = Math.min(annualGross * 0.05, 6000000);
  const annualTaxableIncome = Math.max(
    0,
    Math.floor((annualGross - annualJobExpense - PTKP_TK0) / 1000) * 1000
  );
  return Math.round(calculateAnnualPph21(annualTaxableIncome) / 12);
};

module.exports = { PTKP_TK0, calculateAnnualPph21, calculateMonthlyPph21 };
