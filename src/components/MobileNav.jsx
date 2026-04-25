import { NavLink } from "react-router-dom";
import { Home, PlusCircle, ListChecks, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/create", icon: PlusCircle, label: "Sell" },
  { to: "/mylistings", icon: ListChecks, label: "My Listings" },
  { to: "/profile", icon: User, label: "Me" },
];

export default function MobileNav() {
  const { user } = useAuth();
  if (!user) return null; // hide on auth pages

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 flex justify-around py-2"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
      }}
    >
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isActive
                ? "text-indigo-400"
                : "text-slate-500 hover:text-slate-300"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
