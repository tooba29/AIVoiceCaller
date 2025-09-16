import { useState, useEffect } from 'react';
import { 
  FileText, 
  Bot, 
  Volume2, 
  Users, 
  Rocket, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  Target,
  Settings,
  Play,
  Upload,
  MessageSquare,
  Phone,
  Globe,
  Zap
} from 'lucide-react';

export default function CampaignFeaturesBanner() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Language translations
  const translations = {
    en: {
      title: "Campaign Management Features",
      subtitle: "Complete AI voice calling campaign setup in 3 simple steps",
      features: {
        step1: {
          title: "Step 1: Campaign Selection",
          description: "Create a new campaign or select from existing ones",
          details: "Start fresh or continue with your previous campaigns"
        },
        step2: {
          title: "Step 2: Campaign Configuration", 
          description: "Set up knowledge base, AI personality, voice, and leads",
          details: "Upload PDFs, configure AI behavior, select voice, and manage calling lists"
        },
        step3: {
          title: "Step 3: Campaign Launch",
          description: "Test your campaign and launch to start calling",
          details: "Test with a single call before launching to all leads"
        }
      },
      featureNames: {
        campaignSelection: "Campaign Selection",
        knowledgeBase: "Knowledge Base",
        aiSetup: "AI Setup", 
        voiceSelection: "Voice Selection",
        leadsUpload: "Leads Upload",
        testCall: "Test Call",
        campaignLaunch: "Campaign Launch",
        navigation: "Navigation",
        integration: "Integration"
      },
      benefits: {
        title: "Key Benefits",
        items: [
          "Complete campaign setup in minutes",
          "Test before launching",
          "Multi-language support",
          "Real-time monitoring",
          "Easy navigation between steps"
        ]
      }
    },
    ar: {
      title: "ميزات إدارة الحملات",
      subtitle: "إعداد حملة الاتصال الصوتي بالذكاء الاصطناعي بالكامل في 3 خطوات بسيطة",
      features: {
        step1: {
          title: "الخطوة 1: اختيار الحملة",
          description: "إنشاء حملة جديدة أو اختيار من الحملات الموجودة",
          details: "ابدأ من جديد أو استمر مع حملاتك السابقة"
        },
        step2: {
          title: "الخطوة 2: تكوين الحملة",
          description: "إعداد قاعدة المعرفة، شخصية الذكاء الاصطناعي، الصوت، والعملاء المحتملين",
          details: "رفع ملفات PDF، تكوين سلوك الذكاء الاصطناعي، اختيار الصوت، وإدارة قوائم الاتصال"
        },
        step3: {
          title: "الخطوة 3: إطلاق الحملة",
          description: "اختبار حملتك وإطلاقها لبدء الاتصال",
          details: "اختبر بمكالمة واحدة قبل الإطلاق لجميع العملاء المحتملين"
        }
      },
      featureNames: {
        campaignSelection: "اختيار الحملة",
        knowledgeBase: "قاعدة المعرفة",
        aiSetup: "إعداد الذكاء الاصطناعي",
        voiceSelection: "اختيار الصوت",
        leadsUpload: "رفع العملاء المحتملين",
        testCall: "اختبار المكالمة",
        campaignLaunch: "إطلاق الحملة",
        navigation: "التنقل",
        integration: "التكامل"
      },
      benefits: {
        title: "الفوائد الرئيسية",
        items: [
          "إعداد الحملة بالكامل في دقائق",
          "اختبر قبل الإطلاق",
          "دعم متعدد اللغات",
          "مراقبة في الوقت الفعلي",
          "تنقل سهل بين الخطوات"
        ]
      }
    },
    tr: {
      title: "Kampanya Yönetimi Özellikleri",
      subtitle: "3 basit adımda tam AI sesli arama kampanyası kurulumu",
      features: {
        step1: {
          title: "Adım 1: Kampanya Seçimi",
          description: "Yeni kampanya oluşturun veya mevcut olanlardan seçin",
          details: "Sıfırdan başlayın veya önceki kampanyalarınızla devam edin"
        },
        step2: {
          title: "Adım 2: Kampanya Yapılandırması",
          description: "Bilgi tabanı, AI kişiliği, ses ve müşteri adaylarını ayarlayın",
          details: "PDF yükleyin, AI davranışını yapılandırın, ses seçin ve arama listelerini yönetin"
        },
        step3: {
          title: "Adım 3: Kampanya Lansmanı",
          description: "Kampanyanızı test edin ve aramaya başlamak için başlatın",
          details: "Tüm müşteri adaylarına başlamadan önce tek bir aramayla test edin"
        }
      },
      featureNames: {
        campaignSelection: "Kampanya Seçimi",
        knowledgeBase: "Bilgi Tabanı",
        aiSetup: "AI Kurulumu",
        voiceSelection: "Ses Seçimi",
        leadsUpload: "Müşteri Adayı Yükleme",
        testCall: "Test Araması",
        campaignLaunch: "Kampanya Lansmanı",
        navigation: "Navigasyon",
        integration: "Entegrasyon"
      },
      benefits: {
        title: "Temel Faydalar",
        items: [
          "Dakikalar içinde tam kampanya kurulumu",
          "Başlatmadan önce test edin",
          "Çok dilli destek",
          "Gerçek zamanlı izleme",
          "Adımlar arasında kolay gezinme"
        ]
      }
    },
    az: {
      title: "Kampaniya İdarəetmə Xüsusiyyətləri",
      subtitle: "3 sadə addımda tam AI səsli zəng kampaniyası quraşdırması",
      features: {
        step1: {
          title: "Addım 1: Kampaniya Seçimi",
          description: "Yeni kampaniya yaradın və ya mövcud olanlardan seçin",
          details: "Sıfırdan başlayın və ya əvvəlki kampaniyalarınızla davam edin"
        },
        step2: {
          title: "Addım 2: Kampaniya Konfiqurasiyası",
          description: "Bilik bazası, AI şəxsiyyəti, səs və potensial müştəriləri təyin edin",
          details: "PDF yükləyin, AI davranışını konfiqurasiya edin, səs seçin və zəng siyahılarını idarə edin"
        },
        step3: {
          title: "Addım 3: Kampaniya Başlatması",
          description: "Kampaniyanızı test edin və zəng etməyə başlamaq üçün başladın",
          details: "Bütün potensial müştərilərə başlamazdan əvvəl tək zənglə test edin"
        }
      },
      featureNames: {
        campaignSelection: "Kampaniya Seçimi",
        knowledgeBase: "Bilik Bazası",
        aiSetup: "AI Quraşdırması",
        voiceSelection: "Səs Seçimi",
        leadsUpload: "Potensial Müştəri Yükləməsi",
        testCall: "Test Zəngi",
        campaignLaunch: "Kampaniya Başlatması",
        navigation: "Naviqasiya",
        integration: "İnteqrasiya"
      },
      benefits: {
        title: "Əsas Faydalar",
        items: [
          "Dəqiqələr ərzində tam kampaniya quraşdırması",
          "Başlatmazdan əvvəl test edin",
          "Çoxdilli dəstək",
          "Real vaxt monitorinqi",
          "Addımlar arasında asan naviqasiya"
        ]
      }
    }
  };

  const t = translations[currentLanguage as keyof typeof translations];

  const features = [
    {
      icon: FileText,
      title: t.features.step1.title,
      description: t.features.step1.description,
      details: t.features.step1.details,
      color: "from-blue-500 to-cyan-500",
      features: [
        t.featureNames.campaignSelection,
        "Create New Campaign",
        "Select Existing"
      ]
    },
    {
      icon: Settings,
      title: t.features.step2.title,
      description: t.features.step2.description,
      details: t.features.step2.details,
      color: "from-purple-500 to-pink-500",
      features: [
        t.featureNames.knowledgeBase,
        t.featureNames.aiSetup,
        t.featureNames.voiceSelection,
        t.featureNames.leadsUpload
      ]
    },
    {
      icon: Rocket,
      title: t.features.step3.title,
      description: t.features.step3.description,
      details: t.features.step3.details,
      color: "from-green-500 to-emerald-500",
      features: [
        t.featureNames.testCall,
        t.featureNames.campaignLaunch,
        t.featureNames.navigation,
        t.featureNames.integration
      ]
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [features.length]);

  const currentFeatureData = features[currentFeature];
  const Icon = currentFeatureData.icon;

  return (
    <div className={`campaign-features-banner rounded-3xl mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ aspectRatio: '16/9', minHeight: '400px' }}>
      <div className="relative z-10 h-full flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Language Selector */}
        <div className="flex justify-center mb-2 lg:mb-4">
          <div className="flex space-x-2 bg-white/20 backdrop-blur-sm rounded-full p-1">
            {['en', 'ar', 'tr', 'az'].map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                  currentLanguage === lang
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'ar' ? 'عربي' : lang === 'tr' ? 'TR' : 'AZ'}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2 lg:space-x-3 mb-2 lg:mb-3">
            <div className="w-8 h-8 lg:w-12 lg:h-12 bg-white/20 backdrop-blur-sm rounded-xl lg:rounded-2xl flex items-center justify-center">
              <Sparkles className="h-4 w-4 lg:h-6 lg:w-6 text-white animate-pulse" />
            </div>
            <h1 className="text-xl lg:text-3xl xl:text-4xl font-bold text-white typing-animation" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
              {t.title}
            </h1>
          </div>
          <p className="text-sm lg:text-lg xl:text-xl text-white/90 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
            {t.subtitle}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 flex-1 items-center">
          {/* Left Side - Feature Showcase */}
          <div className="space-y-3 lg:space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-3 lg:p-4 border border-white/20">
              <div className="flex items-center space-x-3 mb-2 lg:mb-3">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br ${currentFeatureData.color} rounded-xl flex items-center justify-center shadow-lg float-animation`}>
                  <Icon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base lg:text-lg xl:text-xl font-bold text-white slide-in" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                    {currentFeatureData.title}
                  </h3>
                  <p className="text-white/80 text-xs lg:text-sm" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                    {currentFeatureData.description}
                  </p>
                </div>
              </div>
              
              {/* Feature Details */}
              <div className="mb-3">
                <p className="text-white/70 text-xs lg:text-sm" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                  {currentFeatureData.details}
                </p>
              </div>

              {/* Feature List */}
              <div className="space-y-1">
                {currentFeatureData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 lg:h-4 lg:w-4 text-green-400" />
                    <span className="text-white/90 text-xs lg:text-sm" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Indicators */}
            <div className="flex justify-center space-x-1 lg:space-x-2">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full transition-all duration-300 ${
                    index === currentFeature 
                      ? 'bg-white scale-125' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right Side - Benefits Showcase */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-3 lg:p-4 border border-white/20 float-animation">
            <div className="bg-white rounded-xl lg:rounded-2xl p-3 lg:p-4 shadow-2xl">
              {/* Benefits Header */}
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Target className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm lg:text-base" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                  {t.benefits.title}
                </h3>
              </div>

              {/* Benefits List */}
              <div className="space-y-2">
                {t.benefits.items.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-2 fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-gradient-to-r from-green-500 to-blue-500 mt-1.5 flex-shrink-0"></div>
                    <span className="text-xs lg:text-sm text-gray-700" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                    {currentLanguage === 'ar' ? 'جاهز للاستخدام' : 
                     currentLanguage === 'tr' ? 'Kullanıma Hazır' : 
                     currentLanguage === 'az' ? 'İstifadəyə Hazırdır' : 
                     'Ready to Use'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-4 lg:mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 flex-shrink-0">
          {[
            { label: currentLanguage === 'ar' ? 'الخطوات' : currentLanguage === 'tr' ? 'Adımlar' : currentLanguage === 'az' ? 'Addımlar' : 'Steps', value: "3", icon: ArrowRight },
            { label: currentLanguage === 'ar' ? 'الميزات' : currentLanguage === 'tr' ? 'Özellikler' : currentLanguage === 'az' ? 'Xüsusiyyətlər' : 'Features', value: "9+", icon: CheckCircle },
            { label: currentLanguage === 'ar' ? 'اللغات' : currentLanguage === 'tr' ? 'Diller' : currentLanguage === 'az' ? 'Dillər' : 'Languages', value: "4", icon: Globe },
            { label: currentLanguage === 'ar' ? 'التكامل' : currentLanguage === 'tr' ? 'Entegrasyon' : currentLanguage === 'az' ? 'İnteqrasiya' : 'Integration', value: "100%", icon: Zap }
          ].map((stat, index) => {
            const StatIcon = stat.icon;
            return (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl lg:rounded-2xl p-2 lg:p-3 border border-white/20 text-center fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-1 lg:mb-2">
                  <StatIcon className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                </div>
                <div className="text-sm lg:text-lg font-bold text-white">{stat.value}</div>
                <div className="text-xs lg:text-sm text-white/80" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 lg:mt-4 flex-shrink-0">
          <div className="w-full bg-white/20 rounded-full h-1.5 lg:h-2">
            <div 
              className="h-1.5 lg:h-2 bg-gradient-to-r from-purple-500 to-green-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${((currentFeature + 1) / features.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-center mt-1 lg:mt-2">
            <span className="text-white/80 text-xs lg:text-sm" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
              {currentFeature + 1} {currentLanguage === 'ar' ? 'من' : currentLanguage === 'tr' ? 'den' : currentLanguage === 'az' ? 'dən' : 'of'} {features.length} {currentLanguage === 'ar' ? 'خطوة' : currentLanguage === 'tr' ? 'adım' : currentLanguage === 'az' ? 'addım' : 'steps'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
