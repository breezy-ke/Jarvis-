import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/demo-flag";
import * as demo from "@/lib/demo";

/**
 * Reference geography reads.
 *
 * These are the only tables the public form needs, and they are genuinely
 * public (RLS grants anon SELECT). They are also completely static between
 * IEBC imports, so callers are free to cache them hard — the signup form on a
 * 2G connection should not wait on a round trip to populate a dropdown.
 */

export type Constituency = { id: number; name: string };
export type Ward = { id: number; name: string; constituency_id: number };
export type Station = {
  id: number;
  name: string;
  iebc_code: string;
  // Per-station registered voters are not public, so this is usually null.
  // Saturation is computed at ward level; see 0009_ward_saturation.sql.
  registered_voters: number | null;
};
export type SubLocationOption = {
  id: number;
  name: string;
  location_name: string;
};

export async function getConstituencies(): Promise<Constituency[]> {
  if (isDemoMode()) return demo.demoConstituencies();
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("constituencies")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`Could not load constituencies: ${error.message}`);
  return data ?? [];
}

export async function getWards(constituencyId: number): Promise<Ward[]> {
  if (isDemoMode()) return demo.demoWards(constituencyId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wards")
    .select("id, name, constituency_id")
    .eq("constituency_id", constituencyId)
    .order("name");
  if (error) throw new Error(`Could not load wards: ${error.message}`);
  return data ?? [];
}

export async function getAllWards(): Promise<Ward[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wards")
    .select("id, name, constituency_id")
    .order("name");
  if (error) throw new Error(`Could not load wards: ${error.message}`);
  return data ?? [];
}

/**
 * Stations for a ward — and only for that ward.
 *
 * The form never offers a free-text station field or a county-wide list. A
 * supporter attached to the wrong station corrupts that station's saturation
 * figure in both directions, and nobody would notice until the number was
 * already being used to plan a caravan route.
 */
export async function getStationsForWard(wardId: number): Promise<Station[]> {
  if (isDemoMode()) return demo.demoStations(wardId);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("polling_stations")
    .select("id, name, iebc_code, registered_voters")
    .eq("ward_id", wardId)
    .order("name");
  if (error) throw new Error(`Could not load polling stations: ${error.message}`);
  return data ?? [];
}

/**
 * Sub-locations reachable from a ward.
 *
 * Wards and sub-locations overlap rather than nest, so this walks the
 * many-to-many mapping instead of assuming a tree. If a ward returns nothing,
 * the mapping table is incomplete for that ward — which is a data problem worth
 * surfacing rather than hiding behind an empty dropdown.
 */
export async function getSubLocationsForWard(
  wardId: number,
): Promise<SubLocationOption[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ward_sub_locations")
    .select("sub_locations!inner(id, name, locations!inner(name))")
    .eq("ward_id", wardId);

  if (error) throw new Error(`Could not load sub-locations: ${error.message}`);

  type Row = {
    sub_locations: { id: number; name: string; locations: { name: string } };
  };

  return ((data ?? []) as unknown as Row[])
    .map((r) => ({
      id: r.sub_locations.id,
      name: r.sub_locations.name,
      location_name: r.sub_locations.locations.name,
    }))
    .sort((a, b) =>
      a.location_name === b.location_name
        ? a.name.localeCompare(b.name)
        : a.location_name.localeCompare(b.location_name),
    );
}
