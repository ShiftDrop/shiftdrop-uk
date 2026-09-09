/**
 * ShiftDrop - Core TypeScript Domain Definitions
 * UK HMRC Edition by PixelNotch Studio
 * Strictly enforcing UK English spelling throughout
 */

export type CourierNetwork =
  | 'Amazon Flex'
  | 'Evri'
  | 'DPD'
  | 'Stuart'
  | 'Deliveroo'
  | 'Uber Eats'
  | 'B2B Sameday'
  | 'Yodel'
  | 'Just Eat'
  | 'Gophr';

export type CourierCompany = CourierNetwork;

export type ActiveModuleId =
  | 'hub'
  | 'hud'
  | 'realtime'
  | 'loadin'
  | 'doorstep'
  | 'returns'
  | 'radar'
  | 'calculator'
  | 'garage'
  | 'pcn'
  | 'hmrc'
  | 'auth'
  | 'settings'
  | 'landing'
  | 'studio'
  | 'pro';

export type NavigationTab = ActiveModuleId;

export type DoorstepCategory =
  | 'Gate Code'
  | 'Tradesman Buzzer'
  | 'Safe Place Secret'
  | 'Dog / Hazard Warning'
  | 'Concierge Desk'
  | 'Parking Tip';

export interface DoorstepIntelItem {
  id: string;
  postcode: string; // UK Postcode e.g. M1 4BT, SW1A 1AA
  addressOrBuilding: string; // Building or street identifier
  category: DoorstepCategory;
  accessCode?: string; // e.g. #4492, KeySafe 8812
  tradesmanBuzzerRule?: string; // e.g. Press 'Bell' + 0 between 07:00-13:00
  instructionNotes: string; // e.g. Safe place in meter box behind bike sheds
  hazardWarning?: string; // e.g. Beware free-roaming dog behind side gate
  conciergeHours?: string; // e.g. Mon-Sat 08:00 - 18:00
  isCommunityShared: boolean;
  upvotes: number;
  contributorName: string;
  lastUpdated: string;
}


export type ParcelSize = 'Small Envelope' | 'Standard Box' | 'Large Parcel' | 'Heavy / XL Bulk';

export type VanCompartmentZone =
  | 'Rear Fast-Access Zone'
  | 'Passenger Footwell'
  | 'Bulkhead Upper'
  | 'Bulkhead Lower'
  | 'Left Shelf Mid'
  | 'Right Shelf Mid'
  | 'Sliding Door Zone'
  | 'Underfloor Vault';

export type VehicleLayoutType =
  | 'Hatchback / City Car'
  | 'Estate / SUV'
  | 'SWB Van (e.g. Ford Transit Custom)'
  | 'MWB / LWB Van (e.g. Mercedes Sprinter)';

export type ParcelStatus = 'Pending' | 'Delivered' | 'Returned' | 'In-Transit';

export type ReturnReasonCode =
  | 'Access Blocked / Gate Code Invalid'
  | 'Customer Unavailable / No Safe Place'
  | 'Damaged Parcel / Leaking'
  | 'Address Incomplete / Incorrect Postcode'
  | 'Business Closed'
  | 'Delivery Timed Out / Exceeded Shift Limit';

export interface ParcelStop {
  id: string;
  shiftId: string;
  stopNumber: number;
  trackingBarcode: string;
  recipientName: string;
  addressLine1: string;
  townCity: string;
  postcode: string; // UK Postcode e.g. EC1A 1BB, M1 1AE, B1 1BB
  gateAccessCode?: string;
  customerInstructions?: string;
  parcelSize: ParcelSize;
  assignedZone: VanCompartmentZone;
  status: ParcelStatus;
  deliveryTimestamp?: string;
  returnReason?: ReturnReasonCode;
  photoEvidenceUrl?: string;
  voiceNoteUrl?: string;
  latitude: number;
  longitude: number;
  contactNumber?: string;
  attemptCount: number;
  communityIntel?: string[];
}

export interface ActiveShift {
  id: string;
  network: CourierNetwork;
  startTime: string;
  endTime?: string;
  startingOdometer: number;
  currentOdometer: number;
  agreedBlockRate: number; // £ GBP
  bonusPay: number; // £ GBP
  stops: ParcelStop[];
  isActive: boolean;
  notes?: string;
  totalMilesDriven: number;
}

export interface WeatherTelemetry {
  temperature: number; // Celsius
  feelsLike: number;
  windSpeedMph: number;
  precipitationProbability: number;
  weatherCode: number;
  conditionDescription: string;
  isFrostWarning: boolean; // <= 2.5°C
  frostAdvisory: string;
  city: string;
  lastUpdated: string;
}

export interface CAZComplianceCheck {
  city: string;
  zoneName: string;
  isCompliant: boolean;
  standardRequired: string;
  dailyCharge: number; // £ GBP
  notes: string;
}

export type FuelType = 'Diesel' | 'Petrol' | 'PHEV' | 'Full Electric (EV)';

export interface RegisteredVehicle {
  id: string;
  regPlate: string; // UK Format e.g. VK22 KYL
  makeModel: string;
  fuelType: FuelType;
  layoutType: VehicleLayoutType;
  motDueDate: string;
  serviceDueDate: string;
  tyrePressureFrontLeftPsi: number;
  tyrePressureFrontRightPsi: number;
  tyrePressureRearLeftPsi: number;
  tyrePressureRearRightPsi: number;
  recommendedFrontPsi: number;
  recommendedRearPsi: number;
  euroStatus: 'Euro 6 (Compliant)' | 'Euro 5 (Non-Compliant)' | 'Zero Emission (EV)';
}

export interface FuelExpenseLog {
  id: string;
  vehicleId: string;
  date: string;
  fuelType: FuelType;
  litresOrKWh: number;
  unitPriceGbp: number; // £/L or £/kWh
  totalCostGbp: number;
  odometerReading: number;
  locationName: string;
  receiptImageBase64?: string;
}

export interface ParkingEvidence {
  id: string;
  timestamp: string;
  locationAddress: string;
  postcode: string;
  bayType: 'Commercial Loading Only' | 'Pay & Display' | 'Permit Holder' | 'Yellow Line (Commercial)';
  expiryTime: string;
  timeRemainingSeconds: number;
  photoBase64?: string;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface HMRCTaxCalculations {
  totalBusinessMilesYTD: number;
  amapAllowanceFirstTierMiles: number; // Up to 10,000 miles @ 45p
  amapAllowanceSecondTierMiles: number; // Above 10,000 miles @ 25p
  totalAmapMileageDeduction: number; // £ GBP
  grossCourierEarnings: number; // £ GBP
  netTaxableProfit: number; // Gross - Mileage deduction & allowable expenses
  personalAllowanceDeduction: number; // £12,570
  basicRateIncomeTax: number; // 20% on taxable excess
  class2NationalInsurance: number; // £3.45/week if applicable
  class4NationalInsurance: number; // 6% on profits between £12,570 and £50,270
  totalEstimatedTaxLiability: number;
  recommendedWeeklyTaxPotSetAside: number;
}

export interface CourierBenchmarkRate {
  network: CourierNetwork;
  averageHourlyRateGbp: number;
  averageDropRateGbp: number;
  peakHourWindows: string;
  reliabilityScore: number; // 1-100
  fuelSurchargeProvided: boolean;
  payoutFrequency: 'Daily' | 'Weekly' | 'Fortnightly';
  averageMileagePerBlock: number;
}

export interface DriverAppSettings {
  isDarkMode: boolean;
  isVoiceGuidanceEnabled: boolean;
  isHapticFeedbackEnabled: boolean;
  isFrostWarningAlertActive: boolean;
  isAutoCloudSyncEnabled: boolean;
  preferredSatNavApp: 'Google Maps' | 'Waze' | 'Apple Maps';
  soundVolume: number;
  voiceGenderPreference: 'en-GB-Female' | 'en-GB-Male';
  supabaseUrl: string;
  supabaseAnonKey: string;
  offlineVoiceNoteQueueCount: number;
  isGeofencedAutoCheckInEnabled?: boolean;
}

export interface UserSessionProfile {
  id: string;
  email: string;
  fullName: string;
  courierLicenceNumber: string;
  driverBadgeId: string;
  phone: string;
  isDemoUser: boolean;
  avatarUrl?: string;
}
