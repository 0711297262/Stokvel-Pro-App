// /js/supabase/transactions.js
import { supabase } from "../supabase-client.js";
import { applyTransaction } from "../core/payment-engine.js";

/*
  Transactions helper functions.
  Important: writes like createTransaction should be executed by admins (or via server RPC)
  if they change balances or require atomic updates.
*/

export async function createTransaction(txn = {}) {
  /**
   txn should include:
   - group_id (uuid)
   - profile_id (uuid) (who made it or who received it)
   - member_name
   - amount (number)
   - type ('contribution'|'payout')
   - method (string)
   - note (string)
  */
  try {
    // validate
    if (!txn.group_id || !txn.amount || !txn.type) {
      return { ok: false, error: { message: "missing_required_fields" } };
    }

    // insert transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        group_id: txn.group_id,
        profile_id: txn.profile_id || null,
        member_name: txn.member_name || null,
        amount: Number(txn.amount),
        type: txn.type,
        method: txn.method || null,
        note: txn.note || null
      })
      .select()
      .single();

    if (error) return { ok: false, error };

    // Update group's balance (best-effort)
    // NOTE: atomic ops are better done server-side (RPC). Here we attempt a safe client update.
    const groupResp = await supabase
      .from("groups")
      .select("group_balance")
      .eq("id", txn.group_id)
      .maybeSingle();

    if (groupResp.error) return { ok: true, data }; // transaction created; group update failed but return success

    const currentBalance = Number(groupResp.data?.group_balance || 0);
    const newBalance = applyTransaction(currentBalance, { type: txn.type, amount: Number(txn.amount) });

    // attempt update
    await supabase
      .from("groups")
      .update({ group_balance: newBalance, updated_at: new Date().toISOString() })
      .eq("id", txn.group_id);

    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function listTransactionsForGroup(groupId, limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("group_id", groupId)
      .order("timestamp", { ascending: false })
      .limit(limit)
      .offset(offset);

    if (error) return { ok: false, error };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err };
  }
}

export async function getGroupBalance(groupId) {
  try {
    const { data, error } = await supabase
      .from("groups")
      .select("group_balance")
      .eq("id", groupId)
      .maybeSingle();

    if (error) return { ok: false, error };
    return { ok: true, data: Number(data?.group_balance || 0) };
  } catch (err) {
    return { ok: false, error: err };
  }
}
