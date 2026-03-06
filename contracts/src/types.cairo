#[derive(Copy, Drop, Serde)]
pub struct Action {
    pub beast_index: u8,
    pub action_type: u8,
    pub target_index: u8,
    pub target_row: u8,
    pub target_col: u8,
}
