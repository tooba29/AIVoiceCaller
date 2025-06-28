import { Link, useLocation } from "wouter";
import { 
  Phone, 
  BarChart3, 
  Megaphone, 
  MicOff, 
  TrendingUp,
  User,
  LogOut
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, current: location === "/" || location === "/dashboard" },
    { name: "Campaigns", href: "/campaigns", icon: Megaphone, current: location === "/campaigns" },
    { name: "Voice Library", href: "/voices", icon: MicOff, current: location === "/voices" },
    { name: "Analytics", href: "/analytics", icon: TrendingUp, current: location === "/analytics" },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "An error occurred during logout.",
        variant: "destructive",
      });
    }
  };

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
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-accent/50">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-violet-500 rounded-full flex items-center justify-center shadow-sm">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.email || "User"}
              </p>
              <p className="text-xs text-muted-foreground">Active User</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full text-muted-foreground hover:text-destructive border-muted-foreground/20 hover:border-destructive/30"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
