import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TeamSelectPage } from "./pages/TeamSelectPage";
import { BattlePage } from "./pages/BattlePage";
import { ResultPage } from "./pages/ResultPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { MyBeastsPage } from "./pages/MyBeastsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { GameSettingsPage } from "./pages/GameSettingsPage";
import { MyTokensPage } from "./pages/MyTokensPage";
import { TutorialPage } from "./pages/TutorialPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/matchmaking" element={<MatchmakingPage />} />
      <Route path="/my-beasts" element={<MyBeastsPage />} />
      <Route path="/my-tokens" element={<MyTokensPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route path="/settings" element={<GameSettingsPage />} />
      <Route path="/team-select/create" element={<TeamSelectPage />} />
      <Route path="/team-select/join/:gameId" element={<TeamSelectPage />} />
      <Route path="/team-select/match/:gameId" element={<TeamSelectPage />} />
      <Route path="/battle/:gameId" element={<BattlePage />} />
      <Route path="/result/:gameId" element={<ResultPage />} />
      <Route path="/tutorial" element={<TutorialPage />} />
    </Routes>
  );
}
