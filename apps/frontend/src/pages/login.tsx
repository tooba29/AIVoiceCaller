import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { 
  Sparkles, 
  Phone, 
  Bot, 
  MessageCircle, 
  TrendingUp, 
  Zap,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Mail,
  Lock,
  User,
  Shield,
  Star,
  Globe,
  Headphones,
  Mic,
  BarChart3,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import LanguageSwitcher from '@/components/language-switcher';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState(0);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      setIsSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    
    // Set demo credentials
    setFormData({
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    try {
      await login('admin@example.com', 'admin123');
      setIsSuccess(true);
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Demo Login Failed",
        description: error.message || "Unable to login with demo account.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Animation cycle for floating elements
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnimation((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const floatingElements = [
    { icon: Phone, text: "AI Voice Calls", color: "from-purple-500 to-pink-500" },
    { icon: Bot, text: "Smart Agents", color: "from-green-500 to-emerald-500" },
    { icon: MessageCircle, text: "Real-time Chat", color: "from-blue-500 to-cyan-500" },
    { icon: TrendingUp, text: "Analytics", color: "from-orange-500 to-red-500" }
  ];

  const features = [
    { icon: Headphones, title: "Voice Cloning", description: "Custom AI voices" },
    { icon: Mic, title: "Multi-language", description: "95+ languages" },
    { icon: BarChart3, title: "Analytics", description: "Real-time insights" },
    { icon: Shield, title: "Secure", description: "Enterprise-grade" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-green-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-green-900/20 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Elements */}
        {floatingElements.map((element, index) => {
          const Icon = element.icon;
          return (
            <div
              key={index}
              className={`absolute transition-all duration-1000 ease-in-out ${
                currentAnimation === index ? 'opacity-100 scale-100' : 'opacity-20 scale-75'
              }`}
              style={{
                top: `${20 + index * 15}%`,
                left: `${10 + index * 20}%`,
                animationDelay: `${index * 0.5}s`
              }}
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${element.color} rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-sm`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded-full backdrop-blur-sm">
                  {element.text}
                </p>
              </div>
            </div>
          );
        })}

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-500 to-green-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-green-500 to-blue-500 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
              {/* Theme Toggle and Back to Home - Fixed Position */}
      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <Link href="/">
          <Button
            variant="ghost"
            size="sm"
            className="w-12 h-12 p-0 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 shadow-lg transition-all duration-300"
            title="Back to Home"
          >
            <ArrowLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </Button>
        </Link>
        <LanguageSwitcher />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="w-12 h-12 p-0 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 shadow-lg transition-all duration-300"
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <Moon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          ) : (
            <Sun className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          )}
        </Button>
      </div>

        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex items-center justify-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
                               <div className="text-left">
                   <h1 className="text-2xl font-bold spark-gradient-text">{t('auth.title')}</h1>
                   <p className="text-sm text-slate-600 dark:text-slate-400">{t('auth.welcomeBack')}</p>
                   <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Powered by Spark AI</p>
                 </div>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-slate-700/50">
            {isSuccess ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                  {t('auth.welcomeMessage')}
                </h2>
                <p className="text-green-600 dark:text-green-300 mb-4">
                  Redirecting to your dashboard...
                </p>
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                </div>
              </div>
            ) : (
              <>
                {/* Card Header */}
                <div className="text-center mb-6">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <ArrowRight className="h-5 w-5 text-purple-500" />
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t('auth.signIn')}</h2>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {t('auth.enterCredentials')}
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('common.email')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder={t('auth.emailPlaceholder')}
                      />
                    </div>
                    {!formData.email && (
                      <div className="mt-1">
                        <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                          Please fill out this field.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      {t('common.password')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        className="w-full pl-10 pr-12 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder={t('auth.passwordPlaceholder')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                        ) : (
                          <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white py-3 text-lg font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t('auth.signingIn')}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <ArrowRight className="mr-2 h-5 w-5" />
                        {t('auth.signIn')}
                      </div>
                    )}
                  </Button>

                  {/* Demo Login Button */}
                  <Button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-2 border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 py-3 text-lg font-semibold rounded-xl transition-all duration-300"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t('auth.tryDemoAccount')}
                  </Button>
                </form>

                {/* Demo Credentials Info */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                      {t('auth.demoCredentials')}
                    </h4>
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                      <p><strong>Email:</strong> demo@sparkai.com</p>
                      <p><strong>Password:</strong> demo123</p>
                    </div>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="mt-6 text-center">
                  <p className="text-slate-600 dark:text-slate-400">
                    Don't have an account?{' '}
                    <Link href="/signup" className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors">
                      Create one here
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Features Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/20 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Stats */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-6 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl px-6 py-3 border border-white/20 dark:border-slate-700/50">
              <div className="text-center">
                <div className="text-lg font-bold spark-gradient-text">10M+</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Calls Made</div>
              </div>
              <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
              <div className="text-center">
                <div className="text-lg font-bold spark-gradient-text">500+</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Customers</div>
              </div>
              <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
              <div className="text-center">
                <div className="text-lg font-bold spark-gradient-text">95+</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">Languages</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 