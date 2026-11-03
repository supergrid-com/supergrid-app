import { Outlet } from "react-router";
import { AdminApp } from "~/components/admin/shell";
import manifest from "../../../supergrid.app.json";

// Every admin screen inside the admin shell: connected to SuperGrid when embedded, with a plain menu when standalone.
export default function AdminLayout() {
  return (
    <AdminApp manifest={manifest}>
      <Outlet />
    </AdminApp>
  );
}
