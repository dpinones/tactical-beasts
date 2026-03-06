pub mod constants;

pub mod models {
    pub mod index;
}

pub mod events {
    pub mod index;
}

pub mod systems {
    pub mod game_system;
}

#[cfg(test)]
pub mod tests {
    pub mod setup;
    pub mod test_game;
}
