import { getSupabaseClient } from './supabase';
import {
  ActiveShift,
  ParcelStop,
  RegisteredVehicle,
  FuelExpenseLog,
  ParkingEvidence,
} from '../types';

// --------------------------------------------------------------------
// LIVE SUPABASE DATA SERVICE (Zero Mock Data / Production Backend)
// --------------------------------------------------------------------

export async function loadInitialDataFromSupabase(): Promise<{
  stops: ParcelStop[];
  shifts: ActiveShift[];
  vehicles: RegisteredVehicle[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase client not initialized. Database is operating in strict live mode with no local mock fallback.');
    return { stops: [], shifts: [], vehicles: [] };
  }

  try {
    const [stopsRes, shiftsRes, vehiclesRes] = await Promise.all([
      client.from('parcel_stops').select('*'),
      client.from('active_shifts').select('*'),
      client.from('registered_vehicles').select('*'),
    ]);

    return {
      stops: stopsRes.data || [],
      shifts: shiftsRes.data || [],
      vehicles: vehiclesRes.data || [],
    };
  } catch (err) {
    console.error('Failed to load live data from Supabase:', err);
    return { stops: [], shifts: [], vehicles: [] };
  }
}

export async function saveParcelStopsToSupabase(stops: ParcelStop[]) {
  const client = getSupabaseClient();
  if (!client || !stops || stops.length === 0) return;

  try {
    const { error } = await client.from('parcel_stops').upsert(stops);
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
    const { error } = await client.from('active_shifts').upsert(shift);
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
    const { error } = await client.from('registered_vehicles').upsert(vehicle);
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
    const { error } = await client.from('fuel_expenses').upsert(expense);
    if (error) {
      console.error('Error saving fuel expense to Supabase:', error.message);
    }
  } catch (err) {
    console.error('Failed to save fuel expense:', err);
  }
}

// --------------------------------------------------------------------
// DATABASE SEEDER (Initial Sample Data for Live Cloud Tables)
// --------------------------------------------------------------------

export async function seedSupabaseDatabaseWithSampleData() {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase client not initialized' };

  try {
    // 1. Sample Vehicle
    await client.from('registered_vehicles').upsert({
      id: 'veh_sample_1',
      registration_plate: 'MK61 FFE',
      make_model: 'Ford Fiesta Titanium (Diesel)',
      fuel_type: 'Diesel',
      caz_compliant: true,
      mot_due_date: '2027-04-15',
      insurance_due_date: '2027-01-20',
      current_odometer_miles: 48200,
    });

    // 2. Sample Active Shift
    await client.from('active_shifts').upsert({
      id: 'shift_sample_1',
      courier_id: 'uk_driver_1',
      platform: 'Amazon Flex',
      depot_location: 'DMC2 Manchester Depot',
      shift_date: new Date().toISOString().split('T')[0],
      clock_in_time: new Date(Date.now() - 3600000 * 2).toISOString(),
      hourly_rate_gbp: 21.50,
      planned_drops: 20,
      completed_drops: 5,
      undelivered_drops: 0,
      gross_earnings_gbp: 86.00,
      mileage_miles: 34.5,
      status: 'Active',
    });

    // 3. Sample Parcel Stops
    await client.from('parcel_stops').upsert([
      {
        id: 'stop_1',
        shift_id: 'shift_sample_1',
        stop_number: 1,
        tracking_number: 'TBA-8829-1029',
        recipient_name: 'Arthur Pendelton',
        address_line1: '42 Victoria Road',
        city: 'Manchester',
        postcode: 'M20 2QG',
        status: 'Pending',
        time_slot: '13:00 - 15:00',
        access_notes: 'Ring doorbell twice. Safe place in rear porch if out.',
      },
      {
        id: 'stop_2',
        shift_id: 'shift_sample_1',
        stop_number: 2,
        tracking_number: 'TBA-8829-1030',
        recipient_name: 'Beatrice Vance',
        address_line1: '15 Albert Avenue',
        city: 'Manchester',
        postcode: 'M19 3FX',
        status: 'Pending',
        time_slot: '13:00 - 15:00',
        access_notes: 'Gate code #4412. Leave inside communal lobby.',
      }
    ]);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// --------------------------------------------------------------------
// COMPATIBILITY ALIASED EXPORTS (For existing App.tsx imports)
// --------------------------------------------------------------------
export const loadInitialDataFromDexie = loadInitialDataFromSupabase;
export const saveParcelStopsToDexie = saveParcelStopsToSupabase;
export const saveShiftToDexie = saveShiftToSupabase;