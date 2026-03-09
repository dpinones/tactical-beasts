import { supabase } from "../lib/supabase";

// --- Player Config ---

export interface PlayerConfig {
  wallet_address: string;
  display_name: string;
  recent_beasts: { id: number; name: string; used_at: string }[];
  created_at: string;
  updated_at: string;
}

export async function getOrCreateProfile(wallet: string): Promise<PlayerConfig | null> {
  const { data } = await supabase
    .from("player_config")
    .select("*")
    .eq("wallet_address", wallet)
    .maybeSingle();

  if (data) return data as PlayerConfig;

  const randomNum = Math.floor(Math.random() * 90) + 10;
  const displayName = `Guest-${randomNum}`;

  const { data: created, error } = await supabase
    .from("player_config")
    .insert({ wallet_address: wallet, display_name: displayName, recent_beasts: [] })
    .select()
    .single();

  if (error) {
    console.error("[Supabase] Failed to create profile:", error);
    return null;
  }
  return created as PlayerConfig;
}

export async function getProfile(wallet: string): Promise<PlayerConfig | null> {
  const { data } = await supabase
    .from("player_config")
    .select("*")
    .eq("wallet_address", wallet)
    .maybeSingle();
  return data as PlayerConfig | null;
}

export async function updateRecentBeasts(
  wallet: string,
  beasts: { id: number; name: string }[]
) {
  const now = new Date().toISOString();
  const recentBeasts = beasts.slice(0, 3).map((b) => ({
    id: b.id,
    name: b.name,
    used_at: now,
  }));

  await supabase
    .from("player_config")
    .update({ recent_beasts: recentBeasts, updated_at: now })
    .eq("wallet_address", wallet);
}

export async function updateDisplayName(wallet: string, displayName: string) {
  await supabase
    .from("player_config")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("wallet_address", wallet);
}

// --- Friendships ---

export interface Friendship {
  id: string;
  sender: string;
  receiver: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  sender_profile?: PlayerConfig;
  receiver_profile?: PlayerConfig;
}

export async function sendFriendRequest(sender: string, receiver: string) {
  const { error } = await supabase
    .from("friendships")
    .insert({ sender, receiver });
  if (error) console.error("[Supabase] sendFriendRequest:", error);
  return !error;
}

export async function respondFriendRequest(id: string, accept: boolean) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "rejected", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[Supabase] respondFriendRequest:", error);
  return !error;
}

export async function getFriends(wallet: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .or(`sender.eq.${wallet},receiver.eq.${wallet}`)
    .eq("status", "accepted");
  return (data || []) as Friendship[];
}

export async function getPendingRequests(wallet: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .eq("receiver", wallet)
    .eq("status", "pending");
  return (data || []) as Friendship[];
}

export async function getSentRequests(wallet: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .eq("sender", wallet)
    .eq("status", "pending");
  return (data || []) as Friendship[];
}

export async function searchPlayers(query: string, myWallet: string): Promise<PlayerConfig[]> {
  const { data } = await supabase
    .from("player_config")
    .select("*")
    .neq("wallet_address", myWallet)
    .or(`display_name.ilike.%${query}%,wallet_address.ilike.%${query}%`)
    .limit(10);
  return (data || []) as PlayerConfig[];
}

// --- Game Invites ---

export interface GameInvite {
  id: string;
  host: string;
  guest: string;
  game_id: string | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  expires_at: string;
  host_profile?: PlayerConfig;
  guest_profile?: PlayerConfig;
}

export async function sendGameInvite(host: string, guest: string): Promise<GameInvite | null> {
  const { data, error } = await supabase
    .from("game_invites")
    .insert({ host, guest })
    .select()
    .single();
  if (error) {
    console.error("[Supabase] sendGameInvite:", error);
    return null;
  }
  return data as GameInvite;
}

export async function respondGameInvite(id: string, accept: boolean) {
  const { error } = await supabase
    .from("game_invites")
    .update({ status: accept ? "accepted" : "rejected" })
    .eq("id", id);
  if (error) console.error("[Supabase] respondGameInvite:", error);
  return !error;
}

export async function updateGameInviteGameId(id: string, gameId: number) {
  const { error } = await supabase
    .from("game_invites")
    .update({ game_id: String(gameId) })
    .eq("id", id);
  if (error) console.error("[Supabase] updateGameInviteGameId:", error);
  return !error;
}

export async function getGameInvites(wallet: string): Promise<GameInvite[]> {
  const { data } = await supabase
    .from("game_invites")
    .select("*")
    .eq("guest", wallet)
    .eq("status", "pending");
  return (data || []) as GameInvite[];
}

export async function getMyPendingInvites(wallet: string): Promise<GameInvite[]> {
  const { data } = await supabase
    .from("game_invites")
    .select("*")
    .eq("host", wallet)
    .eq("status", "pending");
  return (data || []) as GameInvite[];
}

// --- Realtime Subscriptions ---

export function subscribeFriendRequests(
  wallet: string,
  onNew: (friendship: Friendship) => void
) {
  return supabase
    .channel(`friend-requests-${wallet}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "friendships",
        filter: `receiver=eq.${wallet}`,
      },
      (payload) => onNew(payload.new as Friendship)
    )
    .subscribe();
}

export function subscribeGameInvites(
  wallet: string,
  onNew: (invite: GameInvite) => void,
  onUpdate: (invite: GameInvite) => void
) {
  return supabase
    .channel(`game-invites-${wallet}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "game_invites",
        filter: `guest=eq.${wallet}`,
      },
      (payload) => onNew(payload.new as GameInvite)
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "game_invites",
        filter: `host=eq.${wallet}`,
      },
      (payload) => onUpdate(payload.new as GameInvite)
    )
    .subscribe();
}
