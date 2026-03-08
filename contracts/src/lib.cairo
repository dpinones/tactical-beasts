pub mod constants;
pub mod interfaces;
pub mod types;

pub mod models {
    pub mod index;
}

pub mod events {
    pub mod index;
}

pub mod logic {
    pub mod beast;
    pub mod board;
    pub mod combat;
}

pub mod utils {
    pub mod death_mountain_combat;
}

pub mod systems {
    pub mod game_system;
}

#[cfg(test)]
pub mod tests {
    pub mod setup;
    pub mod test_combat;
    pub mod test_game;
}
