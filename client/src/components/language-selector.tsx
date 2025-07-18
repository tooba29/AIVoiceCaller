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
import i18n from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

export default function LanguageSelector() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

  const getTranslatedLanguageName = (langCode: string) => {
    switch (langCode) {
      case 'en':
        return t('language.english');
      case 'az':
        return t('language.azerbaijani');
      default:
        return getLanguageName(langCode);
    }
  };

  const getLanguageNameForToast = (langCode: string) => {
    // Return the language name that should appear in the toast message
    // This is in the target language (the language being switched to)
    switch (langCode) {
      case 'en':
        return 'English'; // English name when switching to English
      case 'az':
        return 'Azərbaycanca'; // Azerbaijani name when switching to Azerbaijani
      default:
        return getLanguageName(langCode);
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    try {
      await changeLanguage(langCode);
      setCurrentLang(langCode);
      
      // Wait for the language change to be fully processed
      setTimeout(() => {
        // Use i18n.t() directly to ensure we get the translation in the new language
        const langName = getLanguageNameForToast(langCode);
        
        // Try manual construction first to test if interpolation is the issue
        const baseMessage = i18n.t('language.languageChangedMessage');
        const manualMessage = baseMessage.replace('{language}', langName);
        
        console.log('Base message:', baseMessage);
        console.log('Language name:', langName);
        console.log('Manual message:', manualMessage);
        
        toast({
          title: i18n.t('language.languageChanged'),
          description: manualMessage,
        });
      }, 50); // Small delay to ensure language change is processed
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
          <span className="hidden sm:inline">{getTranslatedLanguageName(currentLang)}</span>
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