import Home from "./Home";
import OwnerDashboard from "./owner/OwnerDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import ProjectStatusPage from "./track/ProjectStatusPage";
import SiteSupervisor from "./supervisor/SiteSupervisor";
import PendingStaff from "./PendingStaff";
import NotificationBell from "./NotificationBell";

function route() {
  const path = window.location.pathname.replace(/index\.html$/i, "").replace(/\/+$/, "");
  if (path.endsWith("/owner")) return "owner";
  if (path.endsWith("/admin")) return "admin";
  if (path.endsWith("/site-supervisor")) return "supervisor";
  if (path.endsWith("/track") || path.endsWith("/customer")) return "track";
  if (path.endsWith("/team/pending")) return "pending";
  return "home";
}

export default function App() {
  const active = route();
  let page;
  switch (active) {
    case "owner": page = <OwnerDashboard ownerName="Owner" ownerEmail="" />; break;
    case "admin": page = <AdminDashboard viewerName="Admin" viewerEmail="" previewAsOwner={false} />; break;
    case "supervisor": page = <SiteSupervisor />; break;
    case "track": page = <ProjectStatusPage />; break;
    case "pending": page = <PendingStaff />; break;
    default: page = <Home />;
  }
  return <>{page}{["owner","admin","supervisor"].includes(active) && <NotificationBell />}</>;
}
