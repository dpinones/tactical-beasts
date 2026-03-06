-- Run this in Supabase SQL Editor to create the tables

-- Player configuration
CREATE TABLE player_config (
  wallet_address TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  recent_beasts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Friendships
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender, receiver)
);

-- Game invites
CREATE TABLE game_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host TEXT NOT NULL,
  guest TEXT NOT NULL,
  game_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes')
);

-- RLS (open for hackathon)
ALTER TABLE player_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON player_config FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON friendships FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE game_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON game_invites FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for friendships and game_invites
ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE game_invites;
