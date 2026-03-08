use crate::constants::{
    DEFAULT_ATTACK_RANGE, DEFAULT_HP, DEFAULT_LEVEL, DEFAULT_LUCK, DEFAULT_MOVE_RANGE, DEFAULT_TIER, MAX_TIER,
    MIN_TIER, SUBCLASS_BERSERKER, SUBCLASS_ENCHANTER, SUBCLASS_JUGGERNAUT, SUBCLASS_RANGER, SUBCLASS_STALKER,
    SUBCLASS_WARLOCK, TYPE_BRUTE, TYPE_HUNTER, TYPE_MAGICAL,
};

/// Derives beast type from beast ID using Loot Survivor ranges:
/// 1-25: Magical, 26-50: Hunter, 51-75: Brute
pub fn get_beast_type(beast_id: u32) -> u8 {
    if beast_id == 0 {
        TYPE_BRUTE
    } else if beast_id <= 25 {
        TYPE_MAGICAL
    } else if beast_id <= 50 {
        TYPE_HUNTER
    } else if beast_id <= 75 {
        TYPE_BRUTE
    } else {
        // Fallback for IDs outside standard range
        let remainder = beast_id % 3;
        if remainder == 0 {
            TYPE_BRUTE
        } else if remainder == 1 {
            TYPE_MAGICAL
        } else {
            TYPE_HUNTER
        }
    }
}

/// Same formula used in Loot Survivor (death_mountain_beast::ImplBeast::get_tier).
/// Derives tier from beast ID using Death Mountain rules:
/// Each type group (25 beasts) has 5 tiers, 5 beasts each
/// index 0-4 = T1(1), 5-9 = T2(2), 10-14 = T3(3), 15-19 = T4(4), 20-24 = T5(5)
pub fn derive_tier(beast_id: u8) -> u8 {
    if beast_id == 0 {
        return 5;
    }
    let index_in_group = ((beast_id - 1) % 25);
    (index_in_group / 5) + 1
}

/// Returns true if beast tier is valid for tactical combat (T2-T4 only).
pub fn is_valid_tier(beast_id: u8) -> bool {
    let tier = derive_tier(beast_id);
    tier >= MIN_TIER && tier <= MAX_TIER
}

/// Returns the subclass for a beast_id based on species identity.
/// Magic  -> Warlock (destructive) or Enchanter (subtle)
/// Hunter -> Stalker (fast melee) or Ranger (ranged)
/// Brute  -> Juggernaut (tank) or Berserker (aggressive)
pub fn get_subclass(beast_id: u32) -> u8 {
    match beast_id {
        // === MAGIC ===
        // Warlock: Gorgon(6), Lich(8), Wendigo(10), Rakshasa(11), Banshee(13), Vampire(15), Ghoul(17), Wraith(18)
        6 | 8 | 10 | 11 | 13 | 15 | 17 | 18 => SUBCLASS_WARLOCK,
        // Enchanter: Kitsune(7), Chimera(9), Werewolf(12), Draugr(14), Goblin(16), Sprite(19), Kappa(20)
        7 | 9 | 12 | 14 | 16 | 19 | 20 => SUBCLASS_ENCHANTER,

        // === HUNTER ===
        // Stalker: Skinwalker(34), Chupacabra(35), Weretiger(36), Harpy(39), Fenrir(42), Jaguar(43), Direwolf(45)
        34 | 35 | 36 | 39 | 42 | 43 | 45 => SUBCLASS_STALKER,
        // Ranger: Qilin(31), Ammit(32), Nue(33), Wyvern(37), Roc(38), Pegasus(40), Hippogriff(41), Satori(44)
        31 | 32 | 33 | 37 | 38 | 40 | 41 | 44 => SUBCLASS_RANGER,

        // === BRUTE ===
        // Juggernaut: Titan(56), Behemoth(58), Juggernaut(60), Jotunn(62), Cyclops(64), Giant(65), Golem(69), Ent(70)
        56 | 58 | 60 | 62 | 64 | 65 | 69 | 70 => SUBCLASS_JUGGERNAUT,
        // Berserker: Nephilim(57), Hydra(59), Oni(61), Ettin(63), Nemean Lion(66), Berserker(67), Yeti(68)
        57 | 59 | 61 | 63 | 66 | 67 | 68 => SUBCLASS_BERSERKER,

        // Fallback (should not happen for valid T2-T4 beasts)
        _ => {
            let beast_type = get_beast_type(beast_id);
            if beast_type == TYPE_MAGICAL {
                SUBCLASS_ENCHANTER
            } else if beast_type == TYPE_HUNTER {
                SUBCLASS_RANGER
            } else {
                SUBCLASS_JUGGERNAUT
            }
        },
    }
}

/// Returns (beast_id, tier, level, hp) for a token_id.
/// Uses real stats from beasts-average.json for tiers 2-4.
/// In mainnet the contract reads from the NFT directly; this is the local dev fallback.
pub fn get_beast_stats_by_token(token_id: u32) -> (u8, u8, u16, u16) {
    match token_id {
        // Gorgon (beastId=6, Magic T2)
        47101 => (6, 2, 37, 278),
        2018 => (6, 2, 35, 286),
        // Kitsune (beastId=7, Magic T2)
        65040 => (7, 2, 37, 289),
        53536 => (7, 2, 33, 281),
        // Lich (beastId=8, Magic T2)
        26275 => (8, 2, 36, 293),
        3376 => (8, 2, 35, 295),
        // Chimera (beastId=9, Magic T2)
        61515 => (9, 2, 37, 290),
        62942 => (9, 2, 35, 285),
        // Wendigo (beastId=10, Magic T2)
        601 => (10, 2, 37, 275),
        9483 => (10, 2, 39, 282),
        // Rakshasa (beastId=11, Magic T3)
        62550 => (11, 3, 37, 269),
        21576 => (11, 3, 38, 262),
        // Werewolf (beastId=12, Magic T3)
        11817 => (12, 3, 37, 263),
        12939 => (12, 3, 40, 255),
        // Banshee (beastId=13, Magic T3)
        30226 => (13, 3, 37, 269),
        69843 => (13, 3, 39, 275),
        // Draugr (beastId=14, Magic T3)
        4508 => (14, 3, 37, 267),
        68751 => (14, 3, 36, 270),
        // Vampire (beastId=15, Magic T3)
        50726 => (15, 3, 36, 272),
        71921 => (15, 3, 36, 263),
        // Goblin (beastId=16, Magic T4)
        4394 => (16, 4, 40, 242),
        24091 => (16, 4, 37, 249),
        // Ghoul (beastId=17, Magic T4)
        37152 => (17, 4, 38, 243),
        62949 => (17, 4, 38, 243),
        // Wraith (beastId=18, Magic T4)
        57243 => (18, 4, 39, 240),
        57029 => (18, 4, 39, 241),
        // Sprite (beastId=19, Magic T4)
        17841 => (19, 4, 40, 245),
        19167 => (19, 4, 38, 251),
        // Kappa (beastId=20, Magic T4)
        33398 => (20, 4, 31, 275),
        60490 => (20, 4, 40, 237),
        77926 => (20, 4, 37, 244),
        // Qilin (beastId=31, Hunter T2)
        15481 => (31, 2, 37, 303),
        54141 => (31, 2, 38, 298),
        // Ammit (beastId=32, Hunter T2)
        30268 => (32, 2, 37, 267),
        11993 => (32, 2, 34, 278),
        // Nue (beastId=33, Hunter T2)
        31620 => (33, 2, 37, 297),
        67792 => (33, 2, 36, 291),
        // Skinwalker (beastId=34, Hunter T2)
        64110 => (34, 2, 37, 292),
        29527 => (34, 2, 37, 295),
        // Chupacabra (beastId=35, Hunter T2)
        58567 => (35, 2, 37, 293),
        69820 => (35, 2, 36, 283),
        // Weretiger (beastId=36, Hunter T3)
        17790 => (36, 3, 37, 267),
        57791 => (36, 3, 40, 265),
        // Wyvern (beastId=37, Hunter T3)
        67439 => (37, 3, 39, 270),
        66978 => (37, 3, 38, 285),
        // Roc (beastId=38, Hunter T3)
        62436 => (38, 3, 39, 270),
        38893 => (38, 3, 38, 266),
        // Harpy (beastId=39, Hunter T3)
        33365 => (39, 3, 48, 16),
        52786 => (39, 3, 36, 287),
        64047 => (39, 3, 38, 297),
        // Pegasus (beastId=40, Hunter T3)
        45386 => (40, 3, 38, 273),
        53390 => (40, 3, 39, 282),
        // Hippogriff (beastId=41, Hunter T4)
        19588 => (41, 4, 39, 255),
        29180 => (41, 4, 40, 253),
        // Fenrir (beastId=42, Hunter T4)
        51253 => (42, 4, 38, 246),
        7675 => (42, 4, 40, 243),
        // Jaguar (beastId=43, Hunter T4)
        13172 => (43, 4, 38, 239),
        27414 => (43, 4, 38, 247),
        // Satori (beastId=44, Hunter T4)
        52065 => (44, 4, 38, 246),
        23994 => (44, 4, 40, 242),
        // Direwolf (beastId=45, Hunter T4)
        34719 => (45, 4, 19, 89),
        40109 => (45, 4, 39, 247),
        45364 => (45, 4, 39, 257),
        // Titan (beastId=56, Brute T2)
        52697 => (56, 2, 36, 291),
        53579 => (56, 2, 38, 292),
        // Nephilim (beastId=57, Brute T2)
        37131 => (57, 2, 37, 266),
        9734 => (57, 2, 36, 268),
        // Behemoth (beastId=58, Brute T2)
        53268 => (58, 2, 36, 274),
        71243 => (58, 2, 37, 275),
        // Hydra (beastId=59, Brute T2)
        36481 => (59, 2, 36, 272),
        49711 => (59, 2, 37, 284),
        // Juggernaut (beastId=60, Brute T2)
        57684 => (60, 2, 36, 265),
        75261 => (60, 2, 36, 279),
        // Oni (beastId=61, Brute T3)
        39316 => (61, 3, 36, 268),
        62375 => (61, 3, 38, 253),
        // Jotunn (beastId=62, Brute T3)
        13007 => (62, 3, 39, 242),
        19313 => (62, 3, 36, 259),
        // Ettin (beastId=63, Brute T3)
        34723 => (63, 3, 39, 245),
        52516 => (63, 3, 37, 247),
        // Cyclops (beastId=64, Brute T3)
        41868 => (64, 3, 39, 258),
        62685 => (64, 3, 37, 255),
        // Giant (beastId=65, Brute T3)
        2707 => (65, 3, 39, 272),
        32430 => (65, 3, 38, 272),
        // Nemean Lion (beastId=66, Brute T4)
        9070 => (66, 4, 37, 238),
        30150 => (66, 4, 37, 242),
        // Berserker (beastId=67, Brute T4)
        27863 => (67, 4, 38, 231),
        43187 => (67, 4, 37, 232),
        // Yeti (beastId=68, Brute T4)
        3194 => (68, 4, 38, 238),
        57194 => (68, 4, 35, 234),
        // Golem (beastId=69, Brute T4)
        15301 => (69, 4, 39, 248),
        27264 => (69, 4, 39, 248),
        // Ent (beastId=70, Brute T4)
        38992 => (70, 4, 38, 237),
        18061 => (70, 4, 38, 239),
        // Default beasts (fictional token IDs for players without owned beasts)
        100000 => (16, 4, 37, 249),  // Goblin (Magical T4)
        100001 => (43, 4, 38, 239),  // Jaguar (Hunter T4)
        100002 => (68, 4, 35, 234),  // Yeti (Brute T4)
        _ => (0, DEFAULT_TIER, DEFAULT_LEVEL, DEFAULT_HP),
    }
}

pub fn get_luck(_beast_id: u32) -> u8 {
    DEFAULT_LUCK
}

/// Move range depends on subclass: Stalker = 3, all others = 2
pub fn get_move_range(beast_id: u32) -> u8 {
    let subclass = get_subclass(beast_id);
    if subclass == SUBCLASS_STALKER {
        3
    } else {
        DEFAULT_MOVE_RANGE
    }
}

/// Attack range depends on subclass:
/// Ranger = 4, Warlock = 3, Enchanter = 2, melee subclasses = 1
pub fn get_attack_range(beast_id: u32) -> u8 {
    let subclass = get_subclass(beast_id);
    if subclass == SUBCLASS_RANGER {
        4
    } else if subclass == SUBCLASS_WARLOCK {
        3
    } else if subclass == SUBCLASS_ENCHANTER {
        2
    } else {
        DEFAULT_ATTACK_RANGE
    }
}
