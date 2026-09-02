import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo-flag";

const DEMO_STAFF: StaffMember = {
  id: "demo-admin",
  full_name: "Demo Admin",
  role: "admin",
  ward_ids: [],
};

export type StaffMember = {
  id: string;
  full_name: string;
  role: "admin" | "county_coordinator" | "ward_agent";
  ward_ids: number[];
};

/**
 * Resolves the signed-in staff member, or sends them to login.
 *
 * A valid Supabase session is not enough — an auth user with no row in `staff`
 * is somebody who signed up but was never given a campaign role, and they see
 * nothing.
 */
export async function requireStaff(): Promise<StaffMember> {
  if (isDemoMode()) return DEMO_STAFF;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("id, full_name, role, ward_ids")
    .eq("id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!staff) redirect("/login?error=no-role");

  return staff as StaffMember;
}

export async function requireAdmin(): Promise<StaffMember> {
  const staff = await requireStaff();
  if (staff.role !== "admin") redirect("/admin?error=admin-only");
  return staff;
}
