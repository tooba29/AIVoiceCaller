import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { 
  Phone, 
  BarChart3, 
  Megaphone, 
  MicOff, 
  TrendingUp,
  User,
  LogOut,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import LanguageSwitcher from "./language-switcher";

export default function Sidebar() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();

  const navigation = [
    { name: t('common.dashboard'), href: "/dashboard", icon: BarChart3, current: location === "/" || location === "/dashboard" },
    { name: t('common.campaigns'), href: "/campaigns", icon: Megaphone, current: location === "/campaigns" },
    { name: t('common.voices'), href: "/voices", icon: MicOff, current: location === "/voices" },
    { name: t('common.analytics'), href: "/analytics", icon: TrendingUp, current: location === "/analytics" },
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
    <div className="w-72 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col shadow-2xl">
      {/* Enhanced Brand */}
      <div className="p-8 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-purple-50/50 to-green-50/50 dark:from-purple-900/20 dark:to-green-900/20">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-purple-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <Phone className="h-7 w-7 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold spark-gradient-text">
              Spark AI
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              {t('navigation.aiPowered')}
            </p>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation */}
      <nav className="flex-1 p-6">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
            {t('navigation.voiceConversations')}
          </h3>
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link href={item.href}>
                    <div
                      className={`group relative flex items-center space-x-4 px-4 py-4 rounded-2xl font-medium transition-all duration-300 cursor-pointer overflow-hidden ${
                        item.current
                          ? "bg-gradient-to-r from-purple-500/20 to-green-500/20 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50 shadow-lg"
                          : "text-slate-600 dark:text-slate-400 hover:bg-gradient-to-r hover:from-slate-100/50 hover:to-purple-100/50 dark:hover:from-slate-800/50 dark:hover:to-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200"
                      }`}
                    >
                      {/* Animated background */}
                      <div className={`absolute inset-0 bg-gradient-to-r from-purple-500/5 to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      
                      <Icon className={`h-6 w-6 transition-all duration-300 group-hover:scale-110 relative z-10 ${
                        item.current ? "text-purple-600 dark:text-purple-400" : "group-hover:text-purple-600 dark:group-hover:text-purple-400"
                      }`} />
                      <span className="relative z-10">{item.name}</span>
                      
                      {/* Active indicator */}
                      {item.current && (
                        <div className="absolute right-2 w-2 h-2 bg-gradient-to-r from-purple-500 to-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Enhanced User Section */}
      <div className="p-6 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-t from-slate-50/50 to-transparent dark:from-slate-800/50">
        <div className="space-y-4">
          {/* Language Switcher */}
          <div className="flex items-center justify-center">
            <LanguageSwitcher />
          </div>
          
          {/* Theme Toggle */}
          <div className="flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-full border-slate-200/50 dark:border-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-300 group"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Dark Mode
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Light Mode
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center space-x-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-green-50/50 dark:from-purple-900/20 dark:to-green-900/20 border border-purple-200/30 dark:border-purple-700/30 shadow-lg">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-purple-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                {user?.email || t('common.user')}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('common.active')} {t('common.user')}</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="w-full text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border-slate-200/50 dark:border-slate-700/50 hover:border-red-300/50 dark:hover:border-red-600/50 hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-all duration-300 group"
          >
            <LogOut className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
            {t('common.logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}
