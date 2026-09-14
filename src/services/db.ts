import { getSupabaseClient } from './supabase';
import {
  ActiveShift,
  ParcelStop,
  RegisteredVehicle,
  FuelExpenseLog,
  ParkingEvidence,
} from '../types';

// --------------------------------------------------------------------
// LIVE SUPABASE DATA SERVICE (Production Backend / User-Scoped)
// --------------------------------------------------------------------

export async function loadInitialDataFromSupabase(): Promise<{
  stops: ParcelStop[];
  shifts: ActiveShift[];
  vehicles: RegisteredVehicle[];
}> {
  return {
    stops: [],
    shifts: [],
    vehicles: [],
  };
}

export async function saveParcelStopsToSupabase(stops: ParcelStop[]) {
  const client = getSupabaseClient();
  if (!client || !stops || stops.length === 0) return;

  try {
    const { data: userData } = await client.auth.getUser();
    const courierId = userData?.user?.id;

    const payload = stops.map((stop) => {
      const s = stop as any;
      return {
        id: s.id,
        tracking_number: s.trackingNumber || s.trackingBarcode || s.barcode || '',
        recipient_name: s.recipientName || s.recipient || '',
        address_line1: s.address || s.recipientAddress || s.street || '',
        postcode: s.postcode || '',
        status: s.status,
        assigned_zone: s.assignedZone || 'Front Seat',
        voice_note_url: s.voiceNoteUrl,
        delivery_timestamp: s.deliveryTimestamp,
        return_reason: s.returnReason,
        user_id: courierId,
      };
    });

    const { error } = await client.from('parcel_stops').upsert(payload);
    if (error) {
      console.error('Error saving parcel stops to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Failed to save parcel stops:', err);
  }
}

export async function saveShiftToSupabase(shift: ActiveShift) {
  const client = getSupabaseClient();
  if (!client || !shift) return;

  try {
    const { data: userData } = await client.auth.getUser();
    const courierId = userData?.user?.id;
    if (!courierId) return;

    const isValidUuid =
      typeof shift.id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(shift.id);

    const shiftId = isValidUuid ? shift.id : crypto.randomUUID();
    const todayIsoDate = new Date().toISOString().split('T')[0];

    const plannedCount = shift.stops?.length || 0;
    const completedCount = shift.stops?.filter((s) => s.status === 'Delivered').length || 0;
    const undeliveredCount = shift.stops?.filter((s) => s.status === 'Returned').length || 0;
    const grossEarnings = (shift.agreedBlockRate || 0) + (shift.bonusPay || 0);

    const payload: any = {
      id: shiftId,
      courier_id: courierId,
      platform: shift.network,
      clock_in_time: shift.startTime || new Date().toISOString(),
      clock_out_time: shift.endTime || null,
      mileage_miles: shift.totalMilesDriven || shift.currentOdometer || 0,
      hourly_rate_gbp: shift.agreedBlockRate || 0,
      gross_earnings_gbp: grossEarnings,
      status: shift.isActive ? 'Active' : 'Completed',
      depot_location: shift.notes?.replace('Depot: ', '') || 'UK Hub',
      shift_date: todayIsoDate,
      planned_drops: plannedCount,
      completed_drops: completedCount,
      undelivered_drops: undeliveredCount,
    };

    const { error } = await client.from('active_shifts').upsert(payload);
    if (error) {
      console.error('Error saving shift to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Failed to save shift:', err);
  }
}

export async function saveVehicleToSupabase(vehicle: RegisteredVehicle) {
  const client = getSupabaseClient();
  if (!client || !vehicle) return;

  try {
    const { data: userData } = await client.auth.getUser();
    const courierId = userData?.user?.id;

    const payload = {
      ...vehicle,
      courier_id: courierId,
    };

    const { error } = await client.from('registered_vehicles').upsert(payload);
    if (error) {
      console.error('Error saving vehicle to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Failed to save vehicle:', err);
  }
}

export async function saveFuelExpenseToSupabase(expense: FuelExpenseLog) {
  const client = getSupabaseClient();
  if (!client || !expense) return;

  try {
    const { data: userData } = await client.auth.getUser();
    const courierId = userData?.user?.id;

    const payload = {
      ...expense,
      courier_id: courierId,
    };

    const { error } = await client.from('fuel_expenses').upsert(payload);
    if (error) {
      console.error('Error saving fuel expense to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Failed to save fuel expense:', err);
  }
}