import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, loading, login, register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      console.log('User already authenticated, redirecting to dashboard');
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: t('auth.validationError'),
        description: t('auth.emailPasswordRequired'),
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast({
        title: t('auth.validationError'), 
        description: t('auth.passwordsDoNotMatch'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        toast({
          title: t('auth.welcomeMessage'),
          description: t('auth.loginSuccessMessage'),
        });
        // Navigate to dashboard after successful login
        setLocation("/dashboard");
      } else {
        await register(email, password, confirmPassword);
        toast({
          title: t('auth.accountCreatedMessage'),
          description: t('auth.accountCreatedSuccessMessage'),
        });
        // Navigate to dashboard after successful registration
        setLocation("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: isLogin ? t('auth.loginFailed') : t('auth.registrationFailed'),
        description: error.message || t('auth.errorOccurred'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">{t('auth.checkingAuthentication')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-2xl font-bold">AVC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('auth.title')}</h1>
          <p className="text-slate-600">
            {isLogin ? t('auth.welcomeBack') : t('auth.createAccountPrompt')}
          </p>
        </div>

        <Card className="border border-border shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
              {isLogin ? (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  {t('auth.signIn')}
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  {t('auth.createAccount')}
                </>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground text-center">
              {isLogin
                ? t('auth.enterCredentials')
                : t('auth.fillDetails')
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('common.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('common.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder={t('auth.confirmPasswordPlaceholder')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isLogin ? t('auth.signingIn') : t('auth.creatingAccount')}
                  </>
                ) : (
                  <>
                    {isLogin ? (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        {t('auth.signIn')}
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('auth.createAccount')}
                      </>
                    )}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}
                <Button
                  variant="link"
                  className="p-0 ml-1 h-auto text-sm"
                  onClick={toggleMode}
                  disabled={isLoading}
                >
                  {isLogin ? t('auth.createOneHere') : t('auth.signInHere')}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        {!isLogin && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>{t('auth.passwordRequirements')}</strong> {t('auth.passwordRequirementsText')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 