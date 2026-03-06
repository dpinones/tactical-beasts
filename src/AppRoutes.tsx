import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { TeamSelectPage } from "./pages/TeamSelectPage";
import { BattlePage } from "./pages/BattlePage";
import { ResultPage } from "./pages/ResultPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/team-select/create" element={<TeamSelectPage />} />
      <Route path="/team-select/join/:gameId" element={<TeamSelectPage />} />
      <Route path="/battle/:gameId" element={<BattlePage />} />
      <Route path="/result/:gameId" element={<ResultPage />} />
    </Routes>
  );
}
