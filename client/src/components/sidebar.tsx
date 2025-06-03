import { Link, useLocation } from "wouter";
import { 
  Phone, 
  BarChart3, 
  Megaphone, 
  MicOff, 
  TrendingUp,
  User
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, current: location === "/" || location === "/dashboard" },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone, current: location === "/campaigns" },
    { name: "Voice Library", href: "/voices", icon: MicOff, current: location === "/voices" },
    { name: "Analytics", href: "/analytics", icon: TrendingUp, current: location === "/analytics" },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col shadow-lg">
      {/* Brand */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet-500 rounded-xl flex items-center justify-center shadow-md">
            <Phone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">AI Voice Caller</h1>
            <p className="text-xs text-muted-foreground">Voice Campaign Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-3">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer group ${
                      item.current
                        ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                      item.current ? "" : "group-hover:text-primary"
                    }`} />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet-500 rounded-full flex items-center justify-center shadow-sm">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">John Smith</p>
            <p className="text-xs text-muted-foreground">Pro Plan</p>
          </div>
        </div>
      </div>
    </div>
  );
}
