import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  ShieldCheck,
  TrendingUp,
  Percent,
  PoundSterling,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ActiveShift, HMRCTaxCalculations } from '../../types';
import {
  exportHMRCSelfAssessmentCSV,
  generateIcsCalendarFile,
} from '../../services/hmrc';
import { triggerHapticFeedback, speakUkVoicePrompt } from '../../services/telemetry';

interface HMRCVaultProps {
  shifts: ActiveShift[];
  taxMetrics: HMRCTaxCalculations;
}

export const HMRCVault: React.FC<HMRCVaultProps> = ({ shifts, taxMetrics }) => {
  const handleExportCSV = () => {
    triggerHapticFeedback('success');
    speakUkVoicePrompt('Exporting HMRC-compliant self-assessment spreadsheet for QuickBooks and Sage.');
    exportHMRCSelfAssessmentCSV(shifts);
  };

  const handleSyncIcsCalendar = () => {
    triggerHapticFeedback('success');
    speakUkVoicePrompt('Generating iCalendar schedule sync for Google Calendar and Outlook.');
    generateIcsCalendarFile(shifts);
  };

  return (
    <div id="module-hmrc-tax-vault" className="max-w-6xl mx-auto p-3 sm:p-5 space-y-5">
      {/* Top Banner */}
      <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/30 font-bold">
                UK Self-Assessment Engine
              </span>
              <span className="text-[10px] font-mono text-secondary">
                HMRC AMAP Simplified Mileage Scheme
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-primary font-mono flex items-center gap-2">
              HMRC AMAP Tax Vault & Accounting
            </h1>
            <p className="text-xs text-secondary max-w-xl">
              Automatic 45p/25p business mileage deductions, Class 2/4 National Insurance projections, weekly tax pot calculations, and one-tap bookkeeping exports.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              id="btn-sync-ics-calendar"
              onClick={handleSyncIcsCalendar}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-inset hover:bg-subtle border border-subtle text-primary text-xs font-bold transition-colors shadow-sm"
              title="Sync delivery blocks to Apple/Google/Outlook Calendar (.ics)"
            >
              <Calendar className="w-4 h-4 text-brand-cyan" />
              <span>Sync .ICS Calendar</span>
            </button>

            <button
              id="btn-export-hmrc-csv"
              onClick={handleExportCSV}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-brand-emerald to-brand-cyan text-canvas font-black text-xs shadow-lg hover:opacity-95 transition-all active:scale-95"
              title="Download formatted CSV for QuickBooks, Sage, and FreeAgent"
            >
              <Download className="w-4 h-4" />
              <span>Export Bookkeeping .CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tax Liability & Weekly Pot Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* Total AMAP Mileage Deduction */}
        <div className="p-4 rounded-2xl bg-surface border border-brand-emerald/40 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span>Total AMAP Tax Shield</span>
            <ShieldCheck className="w-4 h-4 text-brand-emerald" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-brand-emerald">
            £{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
          </div>
          <p className="text-[11px] text-secondary font-sans">
            Deducted from gross income at 45p/mi (first 10,000 miles).
          </p>
        </div>

        {/* Estimated Tax Liability */}
        <div className="p-4 rounded-2xl bg-surface border border-subtle space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-secondary text-xs">
            <span>Estimated Annual Tax & NI</span>
            <PoundSterling className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-primary">
            £{taxMetrics.totalEstimatedTaxLiability.toFixed(2)}
          </div>
          <p className="text-[11px] text-secondary font-sans">
            Includes 20% Basic Rate Income Tax + Class 2 & Class 4 NI.
          </p>
        </div>

        {/* Recommended Weekly Tax Pot */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-amber-500/10 to-[#161B26] border border-amber-500/40 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-amber-300 text-xs">
            <span className="font-bold">Weekly Tax Pot Recommendation</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-300">
            £{taxMetrics.recommendedWeeklyTaxPotSetAside.toFixed(2)} / wk
          </div>
          <p className="text-[11px] text-secondary font-sans">
            Transfer this sum weekly into your high-yield tax savings account.
          </p>
        </div>
      </div>

      {/* HMRC AMAP & Self-Assessment Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Detailed Calculation Steps */}
        <div className="lg:col-span-7 bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-cyan" />
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider font-mono">
                HMRC Self-Assessment Schedule (2026/27 Tax Year)
              </h2>
            </div>
            <span className="text-[10px] font-mono text-brand-emerald font-bold">
              UK Standard
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle">
              <span className="text-secondary">Gross Courier Revenue:</span>
              <span className="font-bold text-primary">
                £{taxMetrics.grossCourierEarnings.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-brand-emerald/30 text-brand-emerald">
              <span>Less: AMAP Mileage Allowance ({taxMetrics.totalBusinessMilesYTD} mi @ 45p):</span>
              <span className="font-bold">
                -£{taxMetrics.totalAmapMileageDeduction.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle">
              <span className="text-secondary">Net Taxable Trading Profit:</span>
              <span className="font-bold text-primary">
                £{taxMetrics.netTaxableProfit.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle text-secondary">
              <span>UK Tax-Free Personal Allowance:</span>
              <span className="font-bold text-slate-300">
                £{taxMetrics.personalAllowanceDeduction.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle">
              <span className="text-secondary">20% Basic Rate Income Tax:</span>
              <span className="font-bold text-primary">
                £{taxMetrics.basicRateIncomeTax.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle">
              <span className="text-secondary">Class 2 National Insurance (Flat Rate):</span>
              <span className="font-bold text-primary">
                £{taxMetrics.class2NationalInsurance.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-2.5 rounded-xl bg-inset border border-subtle">
              <span className="text-secondary">Class 4 National Insurance (6% on Profits):</span>
              <span className="font-bold text-primary">
                £{taxMetrics.class4NationalInsurance.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between p-3 rounded-xl bg-linear-to-r from-emerald-950/40 to-cyan-950/40 border border-brand-emerald/50 text-primary font-bold text-sm">
              <span>Total Estimated Tax Liability:</span>
              <span className="text-brand-emerald">
                £{taxMetrics.totalEstimatedTaxLiability.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Rules & Export Quick-Cards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3 text-xs">
            <h3 className="font-bold text-primary font-mono flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-brand-cyan" />
              <span>HMRC AMAP Mileage Rules Explained</span>
            </h3>

            <p className="text-secondary leading-relaxed">
              As a self-employed courier using your own vehicle, you can claim HMRC’s Approved Mileage Allowance Payments (AMAP) rather than logging individual fuel receipts and depreciation:
            </p>

            <ul className="space-y-1.5 text-secondary list-disc list-inside font-mono text-[11px]">
              <li>
                <strong className="text-primary">45p per business mile</strong> for the first 10,000 miles in a tax year.
              </li>
              <li>
                <strong className="text-primary">25p per business mile</strong> for every mile above 10,000.
              </li>
              <li>
                <strong className="text-primary">Motorcycle rate: 24p/mi</strong>, Bicycle rate: 20p/mi.
              </li>
            </ul>

            <div className="p-3 rounded-xl bg-inset border border-subtle text-[11px] text-cyan-300">
              💡 <strong>HMRC Advice:</strong> ShiftDrop maintains an immutable GPS odometer audit trail suitable for HMRC enquiry protection.
            </div>
          </div>

          <div className="bg-surface border border-subtle rounded-2xl p-5 shadow-xl space-y-3 text-xs">
            <h3 className="font-bold text-primary font-mono flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-emerald" />
              <span>Compatible Accountancy Software</span>
            </h3>
            <p className="text-secondary">
              Our .CSV export includes all mandated self-assessment headers ready for direct drag-and-drop import:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <a
                href="https://quickbooks.intuit.com/uk/self-employed/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-inset border border-subtle text-primary hover:border-brand-cyan hover:text-brand-cyan transition-all group"
                title="Open QuickBooks Self-Employed UK"
              >
                <span className="font-semibold">QuickBooks Self-Employed</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
              <a
                href="https://www.sage.com/en-gb/products/sage-accounting/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-inset border border-subtle text-primary hover:border-brand-cyan hover:text-brand-cyan transition-all group"
                title="Open Sage Accounting UK"
              >
                <span className="font-semibold">Sage Accounting</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
              <a
                href="https://www.freeagent.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-inset border border-subtle text-primary hover:border-brand-cyan hover:text-brand-cyan transition-all group"
                title="Open FreeAgent UK"
              >
                <span className="font-semibold">FreeAgent</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
              <a
                href="https://www.xero.com/uk/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 rounded-xl bg-inset border border-subtle text-primary hover:border-brand-cyan hover:text-brand-cyan transition-all group"
                title="Open Xero UK"
              >
                <span className="font-semibold">Xero</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
