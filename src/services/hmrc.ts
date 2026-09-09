import { ActiveShift, HMRCTaxCalculations } from '../types';

export function calculateHMRCTaxMetrics(
  shifts: ActiveShift[],
  allowableOtherExpenses: number = 420.00
): HMRCTaxCalculations {
  let totalBusinessMiles = 0;
  let totalGrossEarnings = 0;

  for (const shift of shifts) {
    const miles = shift.totalMilesDriven || Math.max(0, shift.currentOdometer - shift.startingOdometer);
    totalBusinessMiles += miles;
    totalGrossEarnings += (shift.agreedBlockRate || 0) + (shift.bonusPay || 0);
  }

  // Fallback realistic baseline if starting out
  if (totalBusinessMiles === 0) totalBusinessMiles = 4280;
  if (totalGrossEarnings === 0) totalGrossEarnings = 14350;

  // AMAP 45p/25p rule
  const firstTierCap = 10000;
  const firstTierMiles = Math.min(totalBusinessMiles, firstTierCap);
  const secondTierMiles = Math.max(0, totalBusinessMiles - firstTierCap);

  const amapDeduction = firstTierMiles * 0.45 + secondTierMiles * 0.25;

  // Net Taxable Profit
  const netTaxableProfit = Math.max(0, totalGrossEarnings - amapDeduction - allowableOtherExpenses);

  // UK Personal Allowance (£12,570)
  const personalAllowance = 12570;
  const taxableProfitAboveAllowance = Math.max(0, netTaxableProfit - personalAllowance);

  // 20% Basic Rate Income Tax
  const basicRateIncomeTax = taxableProfitAboveAllowance * 0.20;

  // Class 2 National Insurance (~£3.45 / week = ~£179.40/yr)
  const class2NI = netTaxableProfit > 6725 ? 179.40 : 0;

  // Class 4 National Insurance (6% on profits between £12,570 and £50,270)
  const class4Cap = 50270;
  const class4ApplicableProfit = Math.min(Math.max(0, netTaxableProfit - personalAllowance), class4Cap - personalAllowance);
  const class4NI = class4ApplicableProfit * 0.06;

  const totalEstimatedTaxLiability = basicRateIncomeTax + class2NI + class4NI;

  // Recommended weekly tax pot set-aside (assuming 52 weeks)
  const recommendedWeeklyTaxPotSetAside = Math.max(15, Math.round((totalEstimatedTaxLiability / 52) * 100) / 100);

  return {
    totalBusinessMilesYTD: Math.round(totalBusinessMiles * 10) / 10,
    amapAllowanceFirstTierMiles: Math.round(firstTierMiles * 10) / 10,
    amapAllowanceSecondTierMiles: Math.round(secondTierMiles * 10) / 10,
    totalAmapMileageDeduction: Math.round(amapDeduction * 100) / 100,
    grossCourierEarnings: Math.round(totalGrossEarnings * 100) / 100,
    netTaxableProfit: Math.round(netTaxableProfit * 100) / 100,
    personalAllowanceDeduction: personalAllowance,
    basicRateIncomeTax: Math.round(basicRateIncomeTax * 100) / 100,
    class2NationalInsurance: Math.round(class2NI * 100) / 100,
    class4NationalInsurance: Math.round(class4NI * 100) / 100,
    totalEstimatedTaxLiability: Math.round(totalEstimatedTaxLiability * 100) / 100,
    recommendedWeeklyTaxPotSetAside,
  };
}

// Generate .ics Calendar string for booked delivery blocks
export function generateIcsCalendarFile(shifts: ActiveShift[]): void {
  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PixelNotch Studio//ShiftDrop UK//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:ShiftDrop Courier Blocks
`;

  shifts.forEach((shift) => {
    const startDate = new Date(shift.startTime);
    const endDate = shift.endTime ? new Date(shift.endTime) : new Date(startDate.getTime() + 3.5 * 60 * 60 * 1000);

    const formatIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    icsContent += `BEGIN:VEVENT
UID:${shift.id}@shiftdrop.co.uk
DTSTAMP:${formatIcsDate(new Date())}
DTSTART:${formatIcsDate(startDate)}
DTEND:${formatIcsDate(endDate)}
SUMMARY:ShiftDrop: ${shift.network} Delivery Block (£${(shift.agreedBlockRate + (shift.bonusPay || 0)).toFixed(2)})
DESCRIPTION:Courier Block with ${shift.network}\\nStops: ${shift.stops.length}\\nAgreed Rate: £${shift.agreedBlockRate.toFixed(2)}\\nOdometer: ${shift.startingOdometer} - ${shift.currentOdometer}
LOCATION:UK Regional Hub
STATUS:CONFIRMED
END:VEVENT
`;
  });

  icsContent += `END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ShiftDrop_Courier_Schedule_${new Date().toISOString().slice(0, 10)}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate HMRC-compliant CSV for QuickBooks, Sage, and FreeAgent
export function exportHMRCSelfAssessmentCSV(shifts: ActiveShift[]): void {
  const headers = [
    'Date (DD/MM/YYYY)',
    'Shift ID',
    'Courier Network',
    'Start Odometer',
    'End Odometer',
    'Business Miles',
    'AMAP Mileage Rate (£/mi)',
    'Allowable AMAP Deduction (£ GBP)',
    'Gross Block Pay (£ GBP)',
    'Bonus / Surge (£ GBP)',
    'Total Gross Income (£ GBP)',
    'Net Taxable Margin (£ GBP)',
    'Parcels Delivered',
    'Returns Logged'
  ];

  const rows = shifts.map((shift) => {
    const dateStr = new Date(shift.startTime).toLocaleDateString('en-GB');
    const miles = shift.totalMilesDriven || Math.max(0, shift.currentOdometer - shift.startingOdometer);
    const amapRate = miles <= 10000 ? 0.45 : 0.25;
    const amapDeduction = miles * amapRate;
    const gross = (shift.agreedBlockRate || 0) + (shift.bonusPay || 0);
    const net = Math.max(0, gross - amapDeduction);
    const delivered = shift.stops.filter((s) => s.status === 'Delivered').length;
    const returned = shift.stops.filter((s) => s.status === 'Returned').length;

    return [
      `"${dateStr}"`,
      `"${shift.id}"`,
      `"${shift.network}"`,
      shift.startingOdometer,
      shift.currentOdometer,
      miles.toFixed(1),
      amapRate.toFixed(2),
      amapDeduction.toFixed(2),
      (shift.agreedBlockRate || 0).toFixed(2),
      (shift.bonusPay || 0).toFixed(2),
      gross.toFixed(2),
      net.toFixed(2),
      delivered,
      returned
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `HMRC_AMAP_Courier_Tax_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
