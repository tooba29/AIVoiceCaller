import { useState, useEffect } from 'react';
import { Phone, MessageCircle, TrendingUp, Users, Zap, Sparkles, Bot, Target, Mic, Headphones, Clock, BarChart3, Settings, Globe, Shield, Star, Languages, PhoneCall, PhoneOff, Volume2, MicOff } from 'lucide-react';

export default function AnimatedBanner() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState('idle');
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Language translations
  const translations = {
    en: {
      title: "Spark AI Sales Calling Agent",
      subtitle: "Intelligent automation for modern sales teams",
      features: {
        aiVoiceCalling: {
          title: "AI Voice Calling",
          description: "Intelligent voice agents that sound human and convert leads",
          metric: "27%+ AOV Increase"
        },
        voiceCloning: {
          title: "Voice Cloning",
          description: "Create custom AI voices that match your brand personality",
          metric: "95+ Voice Options"
        },
        multiLanguage: {
          title: "Multi-Language Support",
          description: "Reach global audiences with native language conversations",
          metric: "95+ Languages"
        },
        arabicSupport: {
          title: "Arabic Language Support",
          description: "Connect with Arabic-speaking markets with native fluency",
          metric: "Native Arabic"
        },
        availability: {
          title: "24/7 Availability",
          description: "Never miss a lead with round-the-clock AI agents",
          metric: "Always Online"
        },
        analytics: {
          title: "Real-Time Analytics",
          description: "Track performance and optimize campaigns instantly",
          metric: "Live Insights"
        },
        leadQualification: {
          title: "Smart Lead Qualification",
          description: "Automatically identify and prioritize high-value prospects",
          metric: "94% Accuracy"
        },
        globalReach: {
          title: "Global Reach",
          description: "Connect with prospects worldwide with local expertise",
          metric: "150+ Countries"
        },
        personalization: {
          title: "Personalized Conversations",
          description: "Adapt conversations based on prospect behavior and preferences",
          metric: "Personal Touch"
        }
      },
      dialer: {
        aiSalesAgent: "AI Sales Agent",
        sparkAISystem: "Spark AI Calling System",
        dialing: "Dialing...",
        connecting: "Connecting...",
        connected: "Connected",
        readyToCall: "Ready to Call",
        duration: "Duration",
        quality: "Quality",
        sentiment: "Sentiment",
        excellent: "Excellent",
        positive: "Positive"
      },
      stats: {
        activeCampaigns: "Active Campaigns",
        callsToday: "Calls Today",
        successRate: "Success Rate",
        languages: "Languages"
      },
      progress: "of {total} features"
    },
    ar: {
      title: "وكيل مبيعات Spark AI للاتصال الصوتي",
      subtitle: "أتمتة ذكية لفرق المبيعات الحديثة",
      features: {
        aiVoiceCalling: {
          title: "الاتصال الصوتي بالذكاء الاصطناعي",
          description: "وكلاء صوت ذكيون يبدون كالبشر ويحولون العملاء المحتملين",
          metric: "زيادة 27%+ في متوسط قيمة الطلب"
        },
        voiceCloning: {
          title: "استنساخ الصوت",
          description: "إنشاء أصوات ذكية مخصصة تطابق شخصية علامتك التجارية",
          metric: "95+ خيار صوت"
        },
        multiLanguage: {
          title: "دعم متعدد اللغات",
          description: "الوصول إلى الجماهير العالمية بمحادثات باللغة الأم",
          metric: "95+ لغة"
        },
        arabicSupport: {
          title: "دعم اللغة العربية",
          description: "التواصل مع الأسواق الناطقة بالعربية بطلاقة محلية",
          metric: "عربية أصلية"
        },
        availability: {
          title: "التوفر على مدار الساعة",
          description: "لا تفوت أي عميل محتمل مع وكلاء الذكاء الاصطناعي على مدار الساعة",
          metric: "متصل دائماً"
        },
        analytics: {
          title: "التحليلات في الوقت الفعلي",
          description: "تتبع الأداء وتحسين الحملات فوراً",
          metric: "رؤى مباشرة"
        },
        leadQualification: {
          title: "تأهيل العملاء المحتملين الذكي",
          description: "تحديد العملاء المحتملين عالي القيمة وتحديد أولوياتهم تلقائياً",
          metric: "دقة 94%"
        },
        globalReach: {
          title: "الوصول العالمي",
          description: "التواصل مع العملاء المحتملين في جميع أنحاء العالم بخبرة محلية",
          metric: "150+ دولة"
        },
        personalization: {
          title: "محادثات مخصصة",
          description: "تكييف المحادثات بناءً على سلوك وتفضيلات العميل المحتمل",
          metric: "لمسة شخصية"
        }
      },
      dialer: {
        aiSalesAgent: "وكيل مبيعات ذكي",
        sparkAISystem: "نظام الاتصال Spark AI",
        dialing: "جاري الاتصال...",
        connecting: "جاري الاتصال...",
        connected: "متصل",
        readyToCall: "جاهز للاتصال",
        duration: "المدة",
        quality: "الجودة",
        sentiment: "المشاعر",
        excellent: "ممتاز",
        positive: "إيجابي"
      },
      stats: {
        activeCampaigns: "الحملات النشطة",
        callsToday: "المكالمات اليوم",
        successRate: "معدل النجاح",
        languages: "اللغات"
      },
      progress: "من {total} ميزة"
    },
    tr: {
      title: "Spark AI Satış Arama Ajanı",
      subtitle: "Modern satış ekipleri için akıllı otomasyon",
      features: {
        aiVoiceCalling: {
          title: "AI Sesli Arama",
          description: "İnsan gibi ses çıkan ve müşteri adaylarını dönüştüren akıllı ses ajanları",
          metric: "%27+ AOV Artışı"
        },
        voiceCloning: {
          title: "Ses Klonlama",
          description: "Marka kişiliğinize uygun özel AI sesleri oluşturun",
          metric: "95+ Ses Seçeneği"
        },
        multiLanguage: {
          title: "Çok Dilli Destek",
          description: "Ana dil konuşmalarıyla küresel kitlelere ulaşın",
          metric: "95+ Dil"
        },
        arabicSupport: {
          title: "Arapça Dil Desteği",
          description: "Ana dil akıcılığıyla Arapça konuşan pazarlarla bağlantı kurun",
          metric: "Ana Arapça"
        },
        availability: {
          title: "7/24 Erişilebilirlik",
          description: "Günün her saati AI ajanlarla hiçbir müşteri adayını kaçırmayın",
          metric: "Her Zaman Çevrimiçi"
        },
        analytics: {
          title: "Gerçek Zamanlı Analitik",
          description: "Performansı takip edin ve kampanyaları anında optimize edin",
          metric: "Canlı İçgörüler"
        },
        leadQualification: {
          title: "Akıllı Müşteri Adayı Nitelendirme",
          description: "Yüksek değerli potansiyel müşterileri otomatik olarak belirleyin ve önceliklendirin",
          metric: "%94 Doğruluk"
        },
        globalReach: {
          title: "Küresel Erişim",
          description: "Yerel uzmanlıkla dünya çapında potansiyel müşterilere ulaşın",
          metric: "150+ Ülke"
        },
        personalization: {
          title: "Kişiselleştirilmiş Konuşmalar",
          description: "Müşteri adayı davranışı ve tercihlerine göre konuşmaları uyarlayın",
          metric: "Kişisel Dokunuş"
        }
      },
      dialer: {
        aiSalesAgent: "AI Satış Ajanı",
        sparkAISystem: "Spark AI Arama Sistemi",
        dialing: "Aranıyor...",
        connecting: "Bağlanıyor...",
        connected: "Bağlandı",
        readyToCall: "Aramaya Hazır",
        duration: "Süre",
        quality: "Kalite",
        sentiment: "Duygu",
        excellent: "Mükemmel",
        positive: "Pozitif"
      },
      stats: {
        activeCampaigns: "Aktif Kampanyalar",
        callsToday: "Bugünkü Aramalar",
        successRate: "Başarı Oranı",
        languages: "Diller"
      },
      progress: "{total} özellikten"
    },
    az: {
      title: "Spark AI Satış Zəng Agent",
      subtitle: "Müasir satış komandaları üçün ağıllı avtomatlaşdırma",
      features: {
        aiVoiceCalling: {
          title: "AI Səsli Zəng",
          description: "İnsan kimi səs çıxaran və potensial müştəriləri çevirən ağıllı səs agentləri",
          metric: "%27+ AOV Artımı"
        },
        voiceCloning: {
          title: "Səs Klonlama",
          description: "Brend şəxsiyyətinizə uyğun xüsusi AI səsləri yaradın",
          metric: "95+ Səs Seçimi"
        },
        multiLanguage: {
          title: "Çoxdilli Dəstək",
          description: "Ana dil danışıqları ilə qlobal auditoriyaya çatın",
          metric: "95+ Dil"
        },
        arabicSupport: {
          title: "Ərəb Dili Dəstəyi",
          description: "Ana dil səriştəsi ilə ərəb danışan bazaralarla əlaqə qurun",
          metric: "Ana Ərəb"
        },
        availability: {
          title: "7/24 Mövcudluq",
          description: "Günün hər saatı AI agentlərlə heç bir potensial müştərini qaçırmayın",
          metric: "Həmişə Onlayn"
        },
        analytics: {
          title: "Real Vaxt Analitikası",
          description: "Performansı izləyin və kampaniyaları dərhal optimallaşdırın",
          metric: "Canlı İçgörülər"
        },
        leadQualification: {
          title: "Ağıllı Potensial Müştəri Kvalifikasiyası",
          description: "Yüksək dəyərli potensial müştəriləri avtomatik müəyyən edin və prioritetləşdirin",
          metric: "%94 Dəqiqlik"
        },
        globalReach: {
          title: "Qlobal Çatışma",
          description: "Yerli ekspertizə ilə dünya miqyasında potensial müştərilərə çatın",
          metric: "150+ Ölkə"
        },
        personalization: {
          title: "Fərdiləşdirilmiş Danışıqlar",
          description: "Potensial müştəri davranışı və üstünlüklərinə əsaslanaraq danışıqları uyğunlaşdırın",
          metric: "Şəxsi Toxunuş"
        }
      },
      dialer: {
        aiSalesAgent: "AI Satış Agent",
        sparkAISystem: "Spark AI Zəng Sistemi",
        dialing: "Zəng edilir...",
        connecting: "Qoşulur...",
        connected: "Qoşuldu",
        readyToCall: "Zəngə Hazırdır",
        duration: "Müddət",
        quality: "Keyfiyyət",
        sentiment: "Hiss",
        excellent: "Əla",
        positive: "Müsbət"
      },
      stats: {
        activeCampaigns: "Aktiv Kampaniyalar",
        callsToday: "Bu Günkü Zənglər",
        successRate: "Uğur Dərəcəsi",
        languages: "Dillər"
      },
      progress: "{total} xüsusiyyətdən"
    }
  };

  const t = translations[currentLanguage as keyof typeof translations];

  const features = [
    {
      icon: Phone,
      title: t.features.aiVoiceCalling.title,
      description: t.features.aiVoiceCalling.description,
      metric: t.features.aiVoiceCalling.metric,
      color: "from-purple-500 to-pink-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "مرحبا، أنا مهتم بخدماتكم" : currentLanguage === 'tr' ? "Merhaba, hizmetlerinizle ilgileniyorum" : currentLanguage === 'az' ? "Salam, xidmətlərinizlə maraqlanıram" : "Hello, I'm interested in your services" },
        { type: "ai", text: currentLanguage === 'ar' ? "مرحباً! 👋 أنا مساعد المبيعات الذكي. يمكنني مساعدتك في:" : currentLanguage === 'tr' ? "Merhaba! 👋 Ben AI satış asistanınızım. Size şu konularda yardımcı olabilirim:" : currentLanguage === 'az' ? "Salam! 👋 Mən AI satış köməkçinizəm. Sizə bu sahələrdə kömək edə bilərəm:" : "Hi there! 👋 I'm your AI sales assistant. I can help you with:", 
          features: currentLanguage === 'ar' ? ["تأهيل العملاء المحتملين", "تحليلات المبيعات", "دعم العملاء"] : 
                   currentLanguage === 'tr' ? ["Müşteri Adayı Nitelendirme", "Satış Analitikleri", "Müşteri Desteği"] : 
                   currentLanguage === 'az' ? ["Potensial Müştəri Kvalifikasiyası", "Satış Analitikası", "Müştəri Dəstəyi"] : 
                   ["Lead Qualification", "Sales Analytics", "Customer Support"] },
        { type: "typing", text: "" }
      ],
      dialerInterface: true
    },
    {
      icon: Mic,
      title: t.features.voiceCloning.title,
      description: t.features.voiceCloning.description,
      metric: t.features.voiceCloning.metric,
      color: "from-green-500 to-emerald-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "هل يمكنك أن تبدو أكثر احترافية؟" : currentLanguage === 'tr' ? "Daha profesyonel ses çıkarabilir misiniz?" : currentLanguage === 'az' ? "Daha peşəkar səs çıxara bilərsinizmi?" : "Can you sound more professional?" },
        { type: "ai", text: currentLanguage === 'ar' ? "بالتأكيد! يمكنني تكييف صوتي ليطابق علامتك التجارية. اختر من:" : currentLanguage === 'tr' ? "Kesinlikle! Sesimi markanıza uyacak şekilde ayarlayabilirim. Seçin:" : currentLanguage === 'az' ? "Əlbəttə! Səsimi brendinizə uyğunlaşdıra bilərəm. Seçin:" : "Absolutely! I can adapt my voice to match your brand. Choose from:", 
          features: currentLanguage === 'ar' ? ["احترافي", "ودود", "سلطوي", "عادي"] : 
                   currentLanguage === 'tr' ? ["Profesyonel", "Dostane", "Otoriter", "Gündelik"] : 
                   currentLanguage === 'az' ? ["Peşəkar", "Dostluq", "Səlahiyyətli", "Gündəlik"] : 
                   ["Professional", "Friendly", "Authoritative", "Casual"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Headphones,
      title: t.features.multiLanguage.title,
      description: t.features.multiLanguage.description,
      metric: t.features.multiLanguage.metric,
      color: "from-blue-500 to-cyan-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "هل تتحدث الإنجليزية؟" : currentLanguage === 'tr' ? "İngilizce konuşuyor musunuz?" : currentLanguage === 'az' ? "İngiliscə danışırsınızmı?" : "Do you speak English?" },
        { type: "ai", text: currentLanguage === 'ar' ? "بالطبع! يمكنني التواصل بعدة لغات:" : currentLanguage === 'tr' ? "Tabii ki! Birden fazla dilde iletişim kurabilirim:" : currentLanguage === 'az' ? "Əlbəttə! Bir neçə dildə ünsiyyət qura bilərəm:" : "Of course! I can communicate in multiple languages:", features: currentLanguage === 'ar' ? ["الإنجليزية", "العربية", "Français", "Deutsch", "中文"] : currentLanguage === 'tr' ? ["İngilizce", "العربية", "Türkçe", "Français", "Deutsch"] : currentLanguage === 'az' ? ["İngiliscə", "العربية", "Azərbaycan", "Français", "Deutsch"] : ["English", "العربية", "Français", "Deutsch", "中文"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Languages,
      title: t.features.arabicSupport.title,
      description: t.features.arabicSupport.description,
      metric: t.features.arabicSupport.metric,
      color: "from-emerald-500 to-teal-500",
      chatMessages: [
        { type: "user", text: "مرحبا، هل تتحدث العربية؟" },
        { type: "ai", text: "نعم بالطبع! أستطيع التحدث باللغة العربية بطلاقة:", features: ["اللهجة المصرية", "اللهجة الخليجية", "اللهجة الشامية", "اللهجة المغربية"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Clock,
      title: t.features.availability.title,
      description: t.features.availability.description,
      metric: t.features.availability.metric,
      color: "from-orange-500 to-red-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "الساعة 2 صباحاً، هل ما زلت متاحاً؟" : currentLanguage === 'tr' ? "Saat gece 2, hala müsait misiniz?" : currentLanguage === 'az' ? "Saat gecə 2, hələ də mövcudmusunuz?" : "It's 2 AM, are you still available?" },
        { type: "ai", text: currentLanguage === 'ar' ? "بالطبع! أنا متاح على مدار الساعة لمساعدتك:" : currentLanguage === 'tr' ? "Tabii ki! Size yardım etmek için 7/24 müsaitim:" : currentLanguage === 'az' ? "Əlbəttə! Sizə kömək etmək üçün 7/24 mövcudam:" : "Of course! I'm available 24/7 to help you:", 
          features: currentLanguage === 'ar' ? ["استجابة فورية", "لا انتظار", "جاهز دائماً", "مناطق زمنية عالمية"] : 
                   currentLanguage === 'tr' ? ["Anında Yanıt", "Bekleme Yok", "Her Zaman Hazır", "Küresel Saat Dilimleri"] : 
                   currentLanguage === 'az' ? ["Dərhal Cavab", "Gözləmə Yox", "Həmişə Hazır", "Qlobal Vaxt Zonaları"] : 
                   ["Instant Response", "No Waiting", "Always Ready", "Global Time Zones"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: BarChart3,
      title: t.features.analytics.title,
      description: t.features.analytics.description,
      metric: t.features.analytics.metric,
      color: "from-indigo-500 to-purple-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "كيف يؤدّي حملتي؟" : currentLanguage === 'tr' ? "Kampanyam nasıl performans gösteriyor?" : currentLanguage === 'az' ? "Kampaniyam necə performans göstərir?" : "How's my campaign performing?" },
        { type: "ai", text: currentLanguage === 'ar' ? "إليك أداءك في الوقت الفعلي:" : currentLanguage === 'tr' ? "İşte gerçek zamanlı performansınız:" : currentLanguage === 'az' ? "Budur real vaxt performansınız:" : "Here's your real-time performance:", 
          features: currentLanguage === 'ar' ? ["معدل التحويل: 16.3%", "المكالمات اليوم: 1,247", "معدل النجاح: 94.2%", "الإيرادات: $12,450"] : 
                   currentLanguage === 'tr' ? ["Dönüşüm Oranı: %16.3", "Bugünkü Aramalar: 1,247", "Başarı Oranı: %94.2", "Gelir: $12,450"] : 
                   currentLanguage === 'az' ? ["Çevrilmə Dərəcəsi: %16.3", "Bu Günkü Zənglər: 1,247", "Uğur Dərəcəsi: %94.2", "Gəlir: $12,450"] : 
                   ["Conversion Rate: 16.3%", "Calls Today: 1,247", "Success Rate: 94.2%", "Revenue: $12,450"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Shield,
      title: t.features.leadQualification.title,
      description: t.features.leadQualification.description,
      metric: t.features.leadQualification.metric,
      color: "from-teal-500 to-green-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "هل أنت مؤهل لاتخاذ القرارات؟" : currentLanguage === 'tr' ? "Karar verme konusunda yetkili misiniz?" : currentLanguage === 'az' ? "Qərar vermək üçün səlahiyyətlisinizmi?" : "Are you qualified to make decisions?" },
        { type: "ai", text: currentLanguage === 'ar' ? "نعم! أستخدم الذكاء الاصطناعي المتقدم لتأهيل العملاء المحتملين:" : currentLanguage === 'tr' ? "Evet! Müşteri adaylarını nitelendirmek için gelişmiş AI kullanıyorum:" : currentLanguage === 'az' ? "Bəli! Potensial müştəriləri kvalifikasiya etmək üçün inkişaf etmiş AI istifadə edirəm:" : "Yes! I use advanced AI to qualify leads:", 
          features: currentLanguage === 'ar' ? ["تحليل الميزانية", "سلطة القرار", "تقييم الجدول الزمني", "تحديد الحاجة"] : 
                   currentLanguage === 'tr' ? ["Bütçe Analizi", "Karar Yetkisi", "Zaman Çizelgesi Değerlendirmesi", "İhtiyaç Belirleme"] : 
                   currentLanguage === 'az' ? ["Büdcə Analizi", "Qərar Səlahiyyəti", "Vaxt Cədvəli Qiymətləndirməsi", "Ehtiyac Müəyyənləşdirmə"] : 
                   ["Budget Analysis", "Decision Authority", "Timeline Assessment", "Need Identification"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Globe,
      title: t.features.globalReach.title,
      description: t.features.globalReach.description,
      metric: t.features.globalReach.metric,
      color: "from-violet-500 to-purple-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "هل تعمل دولياً؟" : currentLanguage === 'tr' ? "Uluslararası çalışıyor musunuz?" : currentLanguage === 'az' ? "Beynəlxalq işləyirsinizmi?" : "Do you work internationally?" },
        { type: "ai", text: currentLanguage === 'ar' ? "بالتأكيد! يمكنني الوصول إلى العملاء المحتملين عالمياً:" : currentLanguage === 'tr' ? "Kesinlikle! Potansiyel müşterilere küresel olarak ulaşabilirim:" : currentLanguage === 'az' ? "Əlbəttə! Potensial müştərilərə qlobal olaraq çata bilərəm:" : "Absolutely! I can reach prospects globally:", 
          features: currentLanguage === 'ar' ? ["لهجات محلية", "وعي ثقافي", "معالجة المنطقة الزمنية", "الامتثال الإقليمي"] : 
                   currentLanguage === 'tr' ? ["Yerel Lehçeler", "Kültürel Farkındalık", "Saat Dilimi Yönetimi", "Bölgesel Uyumluluk"] : 
                   currentLanguage === 'az' ? ["Yerli Dialektlər", "Mədəni Şüurlu", "Vaxt Zonası İdarəetməsi", "Regional Uyğunluq"] : 
                   ["Local Dialects", "Cultural Awareness", "Time Zone Handling", "Regional Compliance"] },
        { type: "typing", text: "" }
      ]
    },
    {
      icon: Star,
      title: t.features.personalization.title,
      description: t.features.personalization.description,
      metric: t.features.personalization.metric,
      color: "from-yellow-500 to-orange-500",
      chatMessages: [
        { type: "user", text: currentLanguage === 'ar' ? "كيف تخصص المكالمات؟" : currentLanguage === 'tr' ? "Aramaları nasıl kişiselleştiriyorsunuz?" : currentLanguage === 'az' ? "Zəngləri necə fərdiləşdirirsiniz?" : "How do you personalize calls?" },
        { type: "ai", text: currentLanguage === 'ar' ? "أتكيف بناءً على تفضيلاتك:" : currentLanguage === 'tr' ? "Tercihlerinize göre uyarlanıyorum:" : currentLanguage === 'az' ? "Üstünlüklərinizə əsaslanaraq uyğunlaşıram:" : "I adapt based on your preferences:", 
          features: currentLanguage === 'ar' ? ["التفاعلات السابقة", "المعرفة الصناعية", "الاهتمامات الشخصية", "أسلوب التواصل"] : 
                   currentLanguage === 'tr' ? ["Önceki Etkileşimler", "Sektör Bilgisi", "Kişisel İlgi Alanları", "İletişim Tarzı"] : 
                   currentLanguage === 'az' ? ["Əvvəlki Qarşılıqlı Əlaqələr", "Sənaye Bilikləri", "Şəxsi Maraqlar", "Ünsiyyət Üslubu"] : 
                   ["Previous Interactions", "Industry Knowledge", "Personal Interests", "Communication Style"] },
        { type: "typing", text: "" }
      ]
    }
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [features.length]);

  // Simulate calling animation for the first feature
  useEffect(() => {
    if (currentFeature === 0) {
      const callSequence = async () => {
        setIsCalling(true);
        setCallStatus('dialing');
        
        setTimeout(() => {
          setCallStatus('connecting');
        }, 2000);
        
        setTimeout(() => {
          setCallStatus('connected');
        }, 4000);
        
        setTimeout(() => {
          setCallStatus('idle');
          setIsCalling(false);
        }, 8000);
      };
      
      callSequence();
    }
  }, [currentFeature]);

  const currentFeatureData = features[currentFeature];
  const Icon = currentFeatureData.icon;

  const dialerButtons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className={`animated-banner rounded-3xl mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{ aspectRatio: '16/9', minHeight: '400px' }}>
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
              
              {/* Metric Badge */}
              <div className="inline-block">
                <span className="bg-white/20 text-white px-2 py-1 lg:px-3 lg:py-1.5 rounded-full font-semibold text-xs backdrop-blur-sm pulse-glow">
                  {currentFeatureData.metric}
                </span>
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

          {/* Right Side - Dynamic Interface */}
          <div className="relative h-full flex items-center justify-center">
            {currentFeatureData.dialerInterface ? (
              /* Phone Dialer Interface */
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-3 lg:p-4 border border-white/20 float-animation w-full max-w-sm">
                <div className="bg-white rounded-xl lg:rounded-2xl p-3 lg:p-4 shadow-2xl">
                  {/* Call Header */}
                  <div className="text-center mb-3 lg:mb-4">
                    <div className="flex items-center justify-center space-x-2 mb-2 lg:mb-3">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-purple-500 to-green-500 rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm lg:text-base font-bold text-gray-800" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.aiSalesAgent}
                        </h3>
                        <p className="text-xs text-gray-600" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.sparkAISystem}
                        </p>
                      </div>
                    </div>
                    
                    {/* Call Status */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-center space-x-2">
                        {callStatus === 'dialing' && (
                          <>
                            <div className="w-2 h-2 lg:w-3 lg:h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-xs lg:text-sm text-yellow-600 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                              {t.dialer.dialing}
                            </span>
                          </>
                        )}
                        {callStatus === 'connecting' && (
                          <>
                            <div className="w-2 h-2 lg:w-3 lg:h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <span className="text-xs lg:text-sm text-blue-600 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                              {t.dialer.connecting}
                            </span>
                          </>
                        )}
                        {callStatus === 'connected' && (
                          <>
                            <div className="w-2 h-2 lg:w-3 lg:h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs lg:text-sm text-green-600 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                              {t.dialer.connected}
                            </span>
                          </>
                        )}
                        {callStatus === 'idle' && (
                          <>
                            <div className="w-2 h-2 lg:w-3 lg:h-3 bg-gray-500 rounded-full"></div>
                            <span className="text-xs lg:text-sm text-gray-600 font-medium" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                              {t.dialer.readyToCall}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Phone Number Display */}
                      <div className="bg-gray-100 rounded-lg p-2">
                        <p className="text-sm lg:text-base font-mono text-gray-800">+1 (555) 123-4567</p>
                        <p className="text-xs text-gray-500" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {currentLanguage === 'ar' ? 'جون سميث - عميل محتمل' : currentLanguage === 'tr' ? 'John Smith - Satış Adayı' : currentLanguage === 'az' ? 'John Smith - Satış Potensialı' : 'John Smith - Sales Lead'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Call Controls */}
                  <div className="flex justify-center space-x-3 mb-3">
                    <button className="w-8 h-8 lg:w-10 lg:h-10 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors duration-300">
                      <PhoneOff className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </button>
                    <button className="w-10 h-10 lg:w-12 lg:h-12 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors duration-300 shadow-lg">
                      <PhoneCall className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </button>
                    <button className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors duration-300">
                      <Volume2 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    </button>
                  </div>

                  {/* Dialer Pad */}
                  <div className="space-y-2">
                    {dialerButtons.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex justify-center space-x-2">
                        {row.map((button) => (
                          <button
                            key={button}
                            className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center font-semibold text-gray-700 transition-colors duration-300"
                          >
                            {button}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Call Stats */}
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-xs text-gray-500" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.duration}
                        </p>
                        <p className="text-xs font-semibold text-gray-800">00:02:34</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.quality}
                        </p>
                        <p className="text-xs font-semibold text-green-600" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.excellent}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.sentiment}
                        </p>
                        <p className="text-xs font-semibold text-blue-600" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                          {t.dialer.positive}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular Chat Interface */
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-3 lg:p-4 border border-white/20 float-animation w-full max-w-sm">
                <div className="bg-white rounded-xl lg:rounded-2xl p-3 shadow-2xl">
                  {/* Phone Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-lg flex items-center justify-center">
                        <Bot className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800 text-sm lg:text-base" style={{direction: currentLanguage === 'ar' ? 'rtl' : 'ltr'}}>
                        {currentLanguage === 'ar' ? 'الوكيل الذكي' : currentLanguage === 'tr' ? 'AI Ajan' : currentLanguage === 'az' ? 'AI Agent' : 'AI Agent'}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-green-500 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>

                  {/* Dynamic Chat Interface */}
                  <div className="space-y-2">
                    {currentFeatureData.chatMessages.map((message, index) => (
                      <div key={index} className={`fade-in`} style={{animationDelay: `${index * 0.5}s`}}>
                        {message.type === "user" && (
                          <div className="flex justify-end">
                            <div className="bg-gradient-to-r from-purple-500 to-green-500 text-white px-3 py-2 rounded-2xl rounded-br-md max-w-xs">
                              <p className="text-xs lg:text-sm" style={{direction: message.text.includes('مرحبا') || message.text.includes('هل') ? 'rtl' : 'ltr'}}>
                                {message.text}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {message.type === "ai" && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md max-w-xs">
                              <p className="text-xs lg:text-sm text-gray-800" style={{direction: message.text.includes('نعم') || message.text.includes('أستطيع') ? 'rtl' : 'ltr'}}>
                                {message.text}
                              </p>
                              {message.features && (
                                <div className="mt-2 space-y-1">
                                  {message.features.map((feature, featureIndex) => (
                                    <div key={featureIndex} className="flex items-center space-x-2">
                                      <div className={`w-2 h-2 lg:w-3 lg:h-3 rounded-full bg-gradient-to-r ${currentFeatureData.color}`}></div>
                                      <span className="text-xs text-gray-600" style={{direction: feature.includes('اللهجة') || feature.includes('العربية') ? 'rtl' : 'ltr'}}>
                                        {feature}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {message.type === "typing" && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md">
                              <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-1.5 h-1.5 lg:w-2 lg:h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Floating Elements */}
            <div className="absolute -top-2 -right-2 lg:-top-4 lg:-right-4 w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-full flex items-center justify-center bounce-animation">
              <Zap className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
            </div>
            <div className="absolute -bottom-2 -left-2 lg:-bottom-4 lg:-left-4 w-4 h-4 lg:w-6 lg:h-6 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center rotate-animation">
              <Sparkles className="h-2 w-2 lg:h-3 lg:w-3 text-white" />
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-4 lg:mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 lg:gap-4 flex-shrink-0">
          {[
            { label: t.stats.activeCampaigns, value: "12", icon: Target },
            { label: t.stats.callsToday, value: "1,247", icon: Phone },
            { label: t.stats.successRate, value: "94.2%", icon: TrendingUp },
            { label: t.stats.languages, value: "95+", icon: Users }
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
              {currentFeature + 1} {t.progress.replace('{total}', features.length.toString())}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
