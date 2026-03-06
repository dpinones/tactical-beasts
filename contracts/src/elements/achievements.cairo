use achievement::types::metadata::{AchievementMetadata, MetadataTrait};
use achievement::types::task::{Task as AchievementTask, TaskTrait as AchievementTaskTrait};
use crate::constants::{TASK_FLAWLESS, TASK_WINNER};

pub const ACHIEVEMENT_COUNT: u8 = 3;

#[derive(Copy, Drop)]
pub enum Achievement {
    None,
    FirstBlood,
    Veteran,
    Flawless,
}

#[generate_trait]
pub impl AchievementImpl of AchievementTrait {
    fn identifier(self: Achievement) -> felt252 {
        match self {
            Achievement::None => 0,
            Achievement::FirstBlood => 'FIRST_BLOOD',
            Achievement::Veteran => 'VETERAN',
            Achievement::Flawless => 'FLAWLESS',
        }
    }

    fn tasks(self: Achievement) -> Span<AchievementTask> {
        match self {
            Achievement::None => [].span(),
            Achievement::FirstBlood => { [AchievementTaskTrait::new(TASK_WINNER, 1, "Win your first match")].span() },
            Achievement::Veteran => { [AchievementTaskTrait::new(TASK_WINNER, 10, "Win 10 matches")].span() },
            Achievement::Flawless => {
                [AchievementTaskTrait::new(TASK_FLAWLESS, 1, "Win without losing any beast")].span()
            },
        }
    }

    fn metadata(self: Achievement) -> AchievementMetadata {
        match self {
            Achievement::None => MetadataTrait::new(
                title: '',
                description: "",
                icon: '',
                points: 0,
                hidden: false,
                index: 0,
                group: '',
                rewards: array![].span(),
                data: "",
            ),
            Achievement::FirstBlood => MetadataTrait::new(
                title: 'First Blood',
                description: "Win your first Tactical Beasts match",
                icon: 'fa-sword',
                points: 10,
                hidden: false,
                index: 0,
                group: 'Combat',
                rewards: array![].span(),
                data: "",
            ),
            Achievement::Veteran => MetadataTrait::new(
                title: 'Veteran',
                description: "Win 10 Tactical Beasts matches",
                icon: 'fa-shield',
                points: 25,
                hidden: false,
                index: 1,
                group: 'Combat',
                rewards: array![].span(),
                data: "",
            ),
            Achievement::Flawless => MetadataTrait::new(
                title: 'Flawless Victory',
                description: "Win a match without losing any of your beasts",
                icon: 'fa-crown',
                points: 50,
                hidden: false,
                index: 2,
                group: 'Combat',
                rewards: array![].span(),
                data: "",
            ),
        }
    }
}

impl IntoAchievementU8 of core::traits::Into<Achievement, u8> {
    fn into(self: Achievement) -> u8 {
        match self {
            Achievement::None => 0,
            Achievement::FirstBlood => 1,
            Achievement::Veteran => 2,
            Achievement::Flawless => 3,
        }
    }
}

impl IntoU8Achievement of core::traits::Into<u8, Achievement> {
    fn into(self: u8) -> Achievement {
        let val: felt252 = self.into();
        match val {
            0 => Achievement::None,
            1 => Achievement::FirstBlood,
            2 => Achievement::Veteran,
            3 => Achievement::Flawless,
            _ => Achievement::None,
        }
    }
}
