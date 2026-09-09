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