import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Mic2, 
  Settings, 
  LogOut,
  Phone,
  Bot,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, gradient: 'from-blue-500 to-indigo-600' },
    { name: 'Campaigns', href: '/campaigns', icon: Users, gradient: 'from-purple-500 to-pink-600' },
    { name: 'Voices', href: '/voices', icon: Mic2, gradient: 'from-green-500 to-emerald-600' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, gradient: 'from-orange-500 to-red-600' },
  ];

  const isActive = (href: string) => location === href;

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-indigo-900 text-white shadow-2xl transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 via-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <Bot className="h-2 w-2 text-white" />
            </div>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                AI Voice Caller
              </h1>
              <p className="text-xs text-blue-300/80 font-medium">Sales Automation</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Button
              key={item.name}
              variant="ghost"
              className={`w-full justify-start relative overflow-hidden group transition-all duration-300 ${
                active 
                  ? 'bg-gradient-to-r from-white/20 to-blue-500/20 text-white shadow-lg border border-white/20 backdrop-blur-sm' 
                  : 'text-blue-200 hover:bg-gradient-to-r hover:from-white/10 hover:to-blue-500/10 hover:text-white hover:shadow-md hover:border hover:border-white/10'
              } ${isCollapsed ? 'px-3' : 'px-4'}`}
              onClick={() => setLocation(item.href)}
            >
              {/* Background gradient overlay */}
              {active && (
                <div className={`absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-10 rounded-md transition-opacity duration-300`} />
              )}
              
              {/* Hover shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
              
              {/* Icon with gradient background */}
              <div className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-all duration-300 ${
                active 
                  ? `bg-gradient-to-br ${item.gradient} shadow-lg scale-110` 
                  : `bg-gradient-to-br from-white/10 to-white/5 group-hover:${item.gradient} group-hover:shadow-md group-hover:scale-105`
              }`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              
              {!isCollapsed && (
                <span className="relative z-10 font-medium transition-all duration-300">
                  {item.name}
                </span>
              )}
              
              {/* Active indicator */}
              {active && (
                <div className={`absolute right-2 w-2 h-2 bg-gradient-to-br ${item.gradient} rounded-full shadow-lg animate-pulse`} />
              )}
            </Button>
          );
        })}
      </nav>

      {/* AI Assistant Banner */}
      {!isCollapsed && (
        <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-indigo-500/20 border border-purple-400/30 rounded-xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">AI Powered</p>
              <p className="text-xs text-purple-200">Voice Conversations</p>
            </div>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="p-4 border-t border-white/10 bg-gradient-to-r from-slate-800/50 to-blue-800/50 backdrop-blur-sm">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-sm font-bold text-white">U</span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm font-medium text-white">User</p>
              <p className="text-xs text-blue-300">Administrator</p>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            className={`w-full text-blue-200 hover:bg-gradient-to-r hover:from-white/10 hover:to-blue-500/10 hover:text-white transition-all duration-300 ${
              isCollapsed ? 'px-0' : 'justify-start'
            }`}
          >
            <Settings className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Settings</span>}
          </Button>
          
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={handleLogout}
            className={`w-full text-red-300 hover:bg-gradient-to-r hover:from-red-500/20 hover:to-pink-500/20 hover:text-red-200 transition-all duration-300 ${
              isCollapsed ? 'px-0' : 'justify-start'
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110"
      >
        <div className={`w-2 h-2 bg-white rounded-full transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
