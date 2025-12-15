// /js/supabase/groups.js
import { supabase } from "../supabase-client.js";
import { normalizeGroupInput, calculatePayoutShares, advanceRotationIndex, nextPayoutDate } from "../core/group-engine.js";

/*
  Groups helper wrapper for Supabase.
  Each function returns { ok: boolean, data: any, error: null|object }
  Respect RLS: client-side calls require policies that permit action (e.g., insert own profile, create membership).
*/

export async function createGroup({ name, description = null, contribution_amount = 0, payout_cycle = 'monthly', adminId = null }) {
  try {
    const payload = normalizeGroupInput({
      name, description, contribution_amount, payout_cycle,
      members_count: 1,
      group_balance: 0,
      rotation_index: 0
    });

    // set admin as provided (should be auth.uid() on client)
    if (adminId) payload.admin = adminId;

    const { data, error } = await supabase
      .from("groups")
      .insert(payload)
      .select()
      .single();

    if (error) return { ok: false, error };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function getGroup(groupId) {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();

    if (error) return { ok: false, error };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function listGroupsForUser(profileId) {
  // Returns groups where profile is a member
  try {
    const { data, error } = await supabase
      .from("group_members")
      .select(`group_id, groups(*)`)
      .eq("profile_id", profileId);

    if (error) return { ok: false, error };
    // Map to groups
    const groups = (data || []).map(r => r.groups || null).filter(Boolean);
    return { ok: true, data: groups };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function joinGroup(groupId, profileId, role = "member") {
  try {
    // insert membership row (RLS should allow profile to insert their own membership)
    const { data, error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, profile_id: profileId, role })
      .select()
      .single();

    if (error) return { ok: false, error };

    // increment members_count on groups (only if policy allows admin OR use RPC)
    // safer: use a transaction on server side; here we attempt to increment via update if allowed
    await supabase
      .from("groups")
      .update({ members_count: supabase.raw("members_count + 1") })
      .eq("id", groupId);

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function leaveGroup(groupId, profileId) {
  try {
    const { data, error } = await supabase
      .from("group_members")
      .delete()
      .match({ group_id: groupId, profile_id: profileId });

    if (error) return { ok: false, error };

    // decrement members_count (best effort)
    await supabase
      .from("groups")
      .update({ members_count: supabase.raw("GREATEST(members_count - 1, 0)") })
      .eq("id", groupId);

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * updateGroup (admin-only) - change group metadata or rotate index/payout schedule
 * allowedFields: groupBalance, groupName, payoutCycle, contributionAmount, nextPayoutDate,
 * members_count, status, archivedAt, updatedAt, payoutSchedule, rotationIndex, lastPayoutDate
 */
export async function updateGroup(groupId, updates = {}) {
  try {
    const allowed = {
      group_balance: "group_balance",
      name: "name",
      payout_cycle: "payout_cycle",
      contribution_amount: "contribution_amount",
      next_payout_date: "next_payout_date",
      members_count: "members_count",
      status: "status",
      archived_at: "archived_at",
      updated_at: "updated_at",
      payout_schedule: "payout_schedule",
      rotation_index: "rotation_index",
      last_payout_date: "last_payout_date"
    };

    // map incoming to DB keys safely
    const payload = {};
    Object.keys(updates).forEach(k => {
      if (allowed[k] || allowed[camelToSnake(k)]) {
        payload[allowed[k] || allowed[camelToSnake(k)]] = updates[k];
      }
    });

    if (Object.keys(payload).length === 0) {
      return { ok: false, error: { message: "no_allowed_fields" } };
    }

    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("groups")
      .update(payload)
      .eq("id", groupId)
      .select()
      .single();

    if (error) return { ok: false, error };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/**
 * computeAndApplyPayout:
 * - computes payout shares using calculatePayoutShares
 * - creates transactions (payout type) via transactions helper (call createTransaction)
 * - advances rotation_index and updates group row (atomicity best done server-side; here best-effort)
 */
export async function computeAndApplyPayout(groupId) {
  try {
    // fetch group + members
    const grpRes = await getGroup(groupId);
    if (!grpRes.ok) return grpRes;
    const group = grpRes.data;

    const membersRes = await supabase
      .from("group_members")
      .select("profile_id, role, profiles(id, full_name)")
      .eq("group_id", groupId);

    if (membersRes.error) return { ok: false, error: membersRes.error };
    const members = (membersRes.data || []).map(m => ({ id: m.profile_id, name: m.profiles?.full_name || null }));

    if (!members.length) return { ok: false, error: { message: "no_members" }};

    const shares = calculatePayoutShares(Number(group.group_balance || 0), members);

    // create transactions (admin-only ideally)
    const createdTxns = [];
    for (const s of shares) {
      const tx = {
        group_id: groupId,
        profile_id: s.id,
        member_name: s.id,
        amount: s.share,
        type: "payout",
        method: "rotation",
        note: "Automated payout"
      };
      const { ok, data, error } = await import("./transactions.js").then(m => m.createTransaction(tx));
      if (!ok) return { ok: false, error };
      createdTxns.push(data);
    }

    // advance rotation index
    const newIndex = advanceRotationIndex(Number(group.rotation_index || 0), members.length);

    // update group: set group_balance to 0 (or deduct payouts) and rotation index and lastPayoutDate
    const updateRes = await updateGroup(groupId, {
      group_balance: 0,
      rotation_index: newIndex,
      last_payout_date: new Date().toISOString()
    });

    if (!updateRes.ok) return updateRes;

    return { ok: true, data: { transactions: createdTxns, group: updateRes.data } };
  } catch (err) {
    return { ok: false, error: err };
  }
}

/* Helpers */
function camelToSnake(s) {
  return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}
