import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages, Check } from 'lucide-react';
import { LANGUAGES, getCurrentLanguage, changeLanguage, getLanguageName } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const handleLanguageChange = async (langCode: string) => {
    try {
      await changeLanguage(langCode);
      setCurrentLang(langCode);
      
      const langName = getLanguageName(langCode);
      toast({
        title: t('language.languageChanged'),
        description: t('language.languageChangedMessage', { language: langName }),
      });
    } catch (error) {
      console.error('Error changing language:', error);
      toast({
        title: t('common.error'),
        description: t('errors.somethingWentWrong'),
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="glass-card border-gradient hover-lift"
        >
          <Languages className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{getLanguageName(currentLang)}</span>
          <span className="sm:hidden">{currentLang.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass-card border-gradient">
        {LANGUAGES.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center justify-between cursor-pointer hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30"
          >
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{language.nativeName}</span>
              <span className="text-xs text-muted-foreground">({language.name})</span>
            </div>
            {currentLang === language.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 