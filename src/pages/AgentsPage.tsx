import { Navigate } from "react-router-dom";

/** @deprecated Agents live in Chat with an Agent mode toggle. */
export function AgentsPage() {
  return <Navigate to="/app?mode=agent" replace />;
}
