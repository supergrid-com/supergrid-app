import { CalendarIcon, FileTextIcon, GlobeIcon, GraduationCapIcon, MailIcon, ShoppingBagIcon, UsersIcon, type LucideIcon } from "lucide-react";

// MOCK: installed apps for designing the rail's Apps section. A new workspace has none yet, so
// these stand in until real apps are installed; the workspace's own apps (ws.apps) list first.

export type MockApp = { id: string; name: string; icon: LucideIcon };

export const mockApps: MockApp[] = [
  { id: "site", name: "Website", icon: GlobeIcon },
  { id: "booking", name: "Booking", icon: CalendarIcon },
  { id: "newsletter", name: "Newsletter", icon: MailIcon },
  { id: "courses", name: "Courses", icon: GraduationCapIcon },
  { id: "store", name: "Store", icon: ShoppingBagIcon },
  { id: "community", name: "Community", icon: UsersIcon },
  { id: "forms", name: "Forms", icon: FileTextIcon },
];
