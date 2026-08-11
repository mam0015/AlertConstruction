import Home from "./Home";
import OwnerDashboard from "./owner/OwnerDashboard";
import AdminDashboard from "./admin/AdminDashboard";
import ProjectStatusPage from "./track/ProjectStatusPage";
import SiteSupervisor from "./supervisor/SiteSupervisor";
import PendingStaff from "./PendingStaff";

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
  switch (route()) {
    case "owner": return <OwnerDashboard ownerName="Ali Mobini" ownerEmail="mamobiniali@gmail.com" />;
    case "admin": return <AdminDashboard viewerName="Admin Preview" viewerEmail="admin.preview@alerttradiepro.demo" previewAsOwner={false} />;
    case "supervisor": return <SiteSupervisor />;
    case "track": return <ProjectStatusPage />;
    case "pending": return <PendingStaff />;
    default: return <Home />;
  }
}
