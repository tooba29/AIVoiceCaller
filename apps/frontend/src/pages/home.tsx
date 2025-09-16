import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { 
  Phone, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Zap, 
  Sparkles, 
  Bot, 
  Target, 
  Mic, 
  Headphones, 
  Clock, 
  BarChart3, 
  Settings, 
  Globe, 
  Shield, 
  Star, 
  Check, 
  ArrowRight,
  Play,
  Quote,
  ChevronRight,
  ChevronLeft,
  Mail,
  PhoneCall,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Building2,
  Car,
  ShoppingCart,
  Heart,
  GraduationCap,
  Briefcase,
  Home as HomeIcon,
  Utensils,
  Plane,
  Gamepad2,
  Palette,
  Wrench,
  Calculator,
  CreditCard,
  UserCheck,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/navigation';
import { api } from '@/lib/api';

export default function Home() {
  const { t } = useTranslation();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showExperienceZone, setShowExperienceZone] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [callFormData, setCallFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+1'
  });
  const [showCallForm, setShowCallForm] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reset video state when testimonial changes
  useEffect(() => {
    setIsVideoPlaying(false);
    setIsVideoMuted(false);
    setIsVideoFullscreen(false);
  }, [currentTestimonial]);

  const features = [
    {
      icon: Phone,
      title: t('features.aiVoiceCalling.title'),
      description: t('features.aiVoiceCalling.description'),
      color: "from-purple-500 to-pink-500",
      stats: t('features.aiVoiceCalling.stats')
    },
    {
      icon: Mic,
      title: t('features.voiceCloning.title'),
      description: t('features.voiceCloning.description'),
      color: "from-green-500 to-emerald-500",
      stats: t('features.voiceCloning.stats')
    },
    {
      icon: Globe,
      title: t('features.multiLanguageSupport.title'),
      description: t('features.multiLanguageSupport.description'),
      color: "from-blue-500 to-cyan-500",
      stats: t('features.multiLanguageSupport.stats')
    },
    {
      icon: Clock,
      title: t('features.availability.title'),
      description: t('features.availability.description'),
      color: "from-orange-500 to-red-500",
      stats: t('features.availability.stats')
    },
    {
      icon: BarChart3,
      title: t('features.analytics.title'),
      description: t('features.analytics.description'),
      color: "from-indigo-500 to-purple-500",
      stats: t('features.analytics.stats')
    },
    {
      icon: Shield,
      title: t('features.leadQualification.title'),
      description: t('features.leadQualification.description'),
      color: "from-teal-500 to-green-500",
      stats: t('features.leadQualification.stats')
    }
  ];

  const testimonials = [
    {
      name: t('testimonials.sarah.name'),
      role: t('testimonials.sarah.role'),
      company: t('testimonials.sarah.company'),
      content: t('testimonials.sarah.content'),
      avatar: "SJ",
      rating: 5,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=300&fit=crop",
      duration: "2:34"
    },
    {
      name: t('testimonials.ahmed.name'),
      role: t('testimonials.ahmed.role'),
      company: t('testimonials.ahmed.company'),
      content: t('testimonials.ahmed.content'),
      avatar: "AR",
      rating: 5,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=300&fit=crop",
      duration: "1:45"
    },
    {
      name: t('testimonials.maria.name'),
      role: t('testimonials.maria.role'),
      company: t('testimonials.maria.company'),
      content: t('testimonials.maria.content'),
      avatar: "MR",
      rating: 5,
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=300&fit=crop",
      duration: "3:12"
    }
  ];

  const pricingPlans = [
    {
      name: t('pricing.starter.name'),
      price: t('pricing.starter.price'),
      period: t('pricing.starter.period'),
      description: t('pricing.starter.description'),
      features: t('pricing.starter.features', { returnObjects: true }) as string[],
      popular: false,
      color: "from-gray-500 to-gray-600"
    },
    {
      name: t('pricing.professional.name'),
      price: t('pricing.professional.price'),
      period: t('pricing.professional.period'),
      description: t('pricing.professional.description'),
      features: t('pricing.professional.features', { returnObjects: true }) as string[],
      popular: true,
      color: "from-purple-500 to-green-500"
    },
    {
      name: t('pricing.enterprise.name'),
      price: t('pricing.enterprise.price'),
      period: t('pricing.enterprise.period'),
      description: t('pricing.enterprise.description'),
      features: t('pricing.enterprise.features', { returnObjects: true }) as string[],
      popular: false,
      color: "from-blue-500 to-indigo-500"
    }
  ];

  const stats = [
    { number: "10M+", label: t('stats.aiCallsMade') },
    { number: "500+", label: t('stats.happyCustomers') },
    { number: "95+", label: t('stats.languagesSupported') },
    { number: "99.9%", label: t('stats.uptime') }
  ];

  const sectors = [
    {
      id: 'banking',
      name: t('sectors.banking.name'),
      icon: Building2,
      color: 'from-blue-500 to-indigo-500',
      description: t('sectors.banking.description'),
      useCases: t('sectors.banking.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.banking.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.banking.stats')
    },
    {
      id: 'healthcare',
      name: t('sectors.healthcare.name'),
      icon: Heart,
      color: 'from-red-500 to-pink-500',
      description: t('sectors.healthcare.description'),
      useCases: t('sectors.healthcare.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.healthcare.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.healthcare.stats')
    },
    {
      id: 'education',
      name: t('sectors.education.name'),
      icon: GraduationCap,
      color: 'from-green-500 to-emerald-500',
      description: t('sectors.education.description'),
      useCases: t('sectors.education.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.education.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.education.stats')
    },
    {
      id: 'real-estate',
      name: t('sectors.realEstate.name'),
      icon: HomeIcon,
      color: 'from-purple-500 to-violet-500',
      description: t('sectors.realEstate.description'),
      useCases: t('sectors.realEstate.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.realEstate.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.realEstate.stats')
    },
    {
      id: 'retail',
      name: t('sectors.retail.name'),
      icon: ShoppingCart,
      color: 'from-orange-500 to-red-500',
      description: t('sectors.retail.description'),
      useCases: t('sectors.retail.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.retail.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.retail.stats')
    },
    {
      id: 'automotive',
      name: t('sectors.automotive.name'),
      icon: Car,
      color: 'from-gray-500 to-slate-500',
      description: t('sectors.automotive.description'),
      useCases: t('sectors.automotive.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.automotive.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.automotive.stats')
    },
    {
      id: 'travel',
      name: t('sectors.travel.name'),
      icon: Plane,
      color: 'from-cyan-500 to-blue-500',
      description: t('sectors.travel.description'),
      useCases: t('sectors.travel.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.travel.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.travel.stats')
    },
    {
      id: 'technology',
      name: t('sectors.technology.name'),
      icon: Bot,
      color: 'from-indigo-500 to-purple-500',
      description: t('sectors.technology.description'),
      useCases: t('sectors.technology.useCases', { returnObjects: true }) as string[],
      benefits: t('sectors.technology.benefits', { returnObjects: true }) as string[],
      stats: t('sectors.technology.stats')
    }
  ];

  const agents = [
    {
      id: 'sarah',
      name: t('agents.sarah.name'),
      role: t('agents.sarah.role'),
      avatar: 'S',
      color: 'from-pink-500 to-rose-500',
      specialties: t('agents.sarah.specialties', { returnObjects: true }) as string[],
      experience: t('agents.sarah.experience'),
      languages: t('agents.sarah.languages', { returnObjects: true }) as string[],
      successRate: t('agents.sarah.successRate')
    },
    {
      id: 'mike',
      name: t('agents.mike.name'),
      role: t('agents.mike.role'),
      avatar: 'M',
      color: 'from-blue-500 to-cyan-500',
      specialties: t('agents.mike.specialties', { returnObjects: true }) as string[],
      experience: t('agents.mike.experience'),
      languages: t('agents.mike.languages', { returnObjects: true }) as string[],
      successRate: t('agents.mike.successRate')
    },
    {
      id: 'emma',
      name: t('agents.emma.name'),
      role: t('agents.emma.role'),
      avatar: 'E',
      color: 'from-green-500 to-emerald-500',
      specialties: t('agents.emma.specialties', { returnObjects: true }) as string[],
      experience: t('agents.emma.experience'),
      languages: t('agents.emma.languages', { returnObjects: true }) as string[],
      successRate: t('agents.emma.successRate')
    },
    {
      id: 'david',
      name: t('agents.david.name'),
      role: t('agents.david.role'),
      avatar: 'D',
      color: 'from-purple-500 to-violet-500',
      specialties: t('agents.david.specialties', { returnObjects: true }) as string[],
      experience: t('agents.david.experience'),
      languages: t('agents.david.languages', { returnObjects: true }) as string[],
      successRate: t('agents.david.successRate')
    },
    {
      id: 'lisa',
      name: t('agents.lisa.name'),
      role: t('agents.lisa.role'),
      avatar: 'L',
      color: 'from-yellow-500 to-orange-500',
      specialties: t('agents.lisa.specialties', { returnObjects: true }) as string[],
      experience: t('agents.lisa.experience'),
      languages: t('agents.lisa.languages', { returnObjects: true }) as string[],
      successRate: t('agents.lisa.successRate')
    },
    {
      id: 'alex',
      name: t('agents.alex.name'),
      role: t('agents.alex.role'),
      avatar: 'A',
      color: 'from-red-500 to-pink-500',
      specialties: t('agents.alex.specialties', { returnObjects: true }) as string[],
      experience: t('agents.alex.experience'),
      languages: t('agents.alex.languages', { returnObjects: true }) as string[],
      successRate: t('agents.alex.successRate')
    }
  ];

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
    setSelectedAgent('');
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
  };

  const handleTryCall = () => {
    if (selectedSector && selectedAgent) {
      setShowCallForm(true);
    }
  };

  const handleCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalling(true);
    
    try {
      // Make real API call to backend
      const callData = {
        name: callFormData.name,
        email: callFormData.email,
        phone: callFormData.phone,
        countryCode: callFormData.countryCode,
        sector: selectedSector,
        agent: selectedAgent
      };
      
      await api.makeExperienceCall(callData);
      
      setIsCalling(false);
      setShowCallForm(false);
      setCallFormData({ name: '', email: '', phone: '', countryCode: '+1' });
      
      // Show success message
      alert('Call initiated! Our AI agent will contact you shortly at ' + callFormData.countryCode + ' ' + callFormData.phone);
    } catch (error) {
      setIsCalling(false);
      console.error('Error making call:', error);
      alert('Failed to initiate call. Please try again.');
    }
  };

  const handleCallFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCallFormData({
      ...callFormData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-green-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-green-900/20">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('hero.tagline')}
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 spark-gradient-text">
              {t('hero.title')}
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white px-8 py-3 text-lg">
                  {t('hero.startFreeTrial')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
                <Play className="mr-2 h-5 w-5" />
                {t('hero.watchDemo')}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold spark-gradient-text mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Hero Image/Animation */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-purple-500/10 to-green-500/10 rounded-3xl p-8 border border-purple-200/50 dark:border-purple-800/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-green-500 rounded-xl flex items-center justify-center">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">AI Sales Agent</h3>
                                             <p className="text-sm text-slate-600 dark:text-slate-400">Spark AI Calling System</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                                                 "Hi John! I'm calling from Spark AI. I noticed you've been looking at our sales automation solutions..."
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Call Analytics</span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Duration</span>
                        <span className="text-slate-800 dark:text-slate-200">02:34</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Sentiment</span>
                        <span className="text-green-600 dark:text-green-400">Positive</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">Lead Score</span>
                        <span className="text-purple-600 dark:text-purple-400">85%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              {t('features.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {feature.description}
                  </p>
                  <div className="inline-block">
                    <span className="bg-gradient-to-r from-purple-500 to-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {feature.stats}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Experience Zone Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-purple-50/50 to-green-50/50 dark:from-purple-900/10 dark:to-green-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              {t('experience.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              {t('experience.subtitle')}
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl p-8 border border-white/20 dark:border-slate-700/50 shadow-xl">
            {/* Main Experience Flow */}
            <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
              {/* Left Side - Sector Selection */}
              <div className="flex-1 max-w-md">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 text-center lg:text-left">
                  {t('experience.selectIndustry')}
                </h3>
                <div className="space-y-3">
                  {sectors.map((sector) => {
                    const Icon = sector.icon;
                    return (
                      <button
                        key={sector.id}
                        onClick={() => handleSectorSelect(sector.id)}
                        className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 flex items-center space-x-4 ${
                          selectedSector === sector.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                            : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600'
                        }`}
                      >
                        <div className={`w-12 h-12 bg-gradient-to-br ${sector.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                            {sector.name}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            {sector.description}
                          </p>
                          {selectedSector === sector.id && (
                            <div className="mt-2">
                              <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                {sector.stats}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Industry Details */}
                {selectedSector && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      {t('experience.industryInsights')}
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('experience.useCases')}:</h5>
                        <div className="flex flex-wrap gap-1">
                          {sectors.find(s => s.id === selectedSector)?.useCases.map((useCase, index) => (
                            <span key={index} className="text-xs bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                              {useCase}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('experience.keyBenefits')}:</h5>
                        <div className="flex flex-wrap gap-1">
                          {sectors.find(s => s.id === selectedSector)?.benefits.map((benefit, index) => (
                            <span key={index} className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Center - Try Call Button */}
              <div className="flex flex-col items-center space-y-6">
                {/* Connection Lines */}
                <div className="hidden lg:block w-32 h-0.5 bg-gradient-to-r from-purple-500 to-green-500"></div>
                
                {/* Try Call Button */}
                <button
                  onClick={handleTryCall}
                  disabled={!selectedSector || !selectedAgent}
                  className={`relative p-8 rounded-3xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                    selectedSector && selectedAgent
                      ? 'bg-gradient-to-r from-orange-400 to-pink-500 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {/* Dots Grid */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-current rounded-full opacity-60"></div>
                    ))}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{t('experience.tryCall')}</div>
                    {selectedSector && selectedAgent && (
                      <div className="text-sm opacity-90 mt-1">
                        {sectors.find(s => s.id === selectedSector)?.name} • {agents.find(a => a.id === selectedAgent)?.name}
                      </div>
                    )}
                  </div>
                </button>

                {/* Connection Lines */}
                <div className="hidden lg:block w-32 h-0.5 bg-gradient-to-r from-green-500 to-purple-500"></div>
              </div>

              {/* Right Side - Agent Selection */}
              <div className="flex-1 max-w-md">
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6 text-center lg:text-right">
                  {t('experience.chooseAgent')}
                </h3>
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent.id)}
                      disabled={!selectedSector}
                      className={`w-full p-4 rounded-2xl border-2 transition-all duration-300 hover:scale-105 flex items-center space-x-4 ${
                        selectedAgent === agent.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg'
                          : selectedSector
                          ? 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-600'
                          : 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${agent.color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
                        {agent.avatar}
                      </div>
                      <div className="text-left">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                          {agent.name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {agent.role}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.specialties.slice(0, 2).map((specialty, index) => (
                            <span key={index} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                        {selectedAgent === agent.id && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs text-green-600 dark:text-green-400">
                              {agent.experience}
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {agent.languages.join(', ')}
                            </div>
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                              {agent.successRate}
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Agent Details */}
                {selectedAgent && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200/50 dark:border-green-700/50">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      {t('experience.agentProfile')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('experience.experience')}:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {agents.find(a => a.id === selectedAgent)?.experience}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('experience.languages')}:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {agents.find(a => a.id === selectedAgent)?.languages.join(', ')}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{t('experience.successRate')}:</span>
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {agents.find(a => a.id === selectedAgent)?.successRate}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Industry Statistics */}
            <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-purple-50 dark:from-slate-800/50 dark:to-purple-800/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 text-center">
                {t('experience.industryPerformance')}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {sectors.slice(0, 4).map((sector) => (
                  <div key={sector.id} className="text-center p-3 bg-white/60 dark:bg-slate-700/60 rounded-xl">
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {sector.name}
                    </div>
                    <div className="text-lg font-bold spark-gradient-text">
                      {sector.stats}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explore More Button */}
            <div className="text-center mt-8">
              <button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <ArrowRight className="inline-block mr-2 h-5 w-5" />
                {t('experience.exploreMore')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Call Form Modal */}
      {showCallForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {t('callForm.title')}
              </h3>
              <button
                onClick={() => setShowCallForm(false)}
                className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                <X className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                  {agents.find(a => a.id === selectedAgent)?.avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {agents.find(a => a.id === selectedAgent)?.name}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {sectors.find(s => s.id === selectedSector)?.name} • {agents.find(a => a.id === selectedAgent)?.role}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCallSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('callForm.fullName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  value={callFormData.name}
                  onChange={handleCallFormChange}
                  required
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder={t('callForm.enterFullName')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('callForm.emailAddress')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={callFormData.email}
                  onChange={handleCallFormChange}
                  required
                  className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder={t('callForm.enterEmail')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {t('callForm.phoneNumber')} *
                </label>
                 <div className="flex space-x-2">
                   <select
                     name="countryCode"
                     value={callFormData.countryCode}
                     onChange={handleCallFormChange}
                     className="px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                   >
                     <option value="+1">🇺🇸 +1 (US)</option>
                     <option value="+44">🇬🇧 +44 (UK)</option>
                     <option value="+91">🇮🇳 +91 (IN)</option>
                     <option value="+86">🇨🇳 +86 (CN)</option>
                     <option value="+81">🇯🇵 +81 (JP)</option>
                     <option value="+49">🇩🇪 +49 (DE)</option>
                     <option value="+33">🇫🇷 +33 (FR)</option>
                     <option value="+39">🇮🇹 +39 (IT)</option>
                     <option value="+34">🇪🇸 +34 (ES)</option>
                     <option value="+971">🇦🇪 +971 (AE)</option>
                     <option value="+966">🇸🇦 +966 (SA)</option>
                     <option value="+20">🇪🇬 +20 (EG)</option>
                     <option value="+27">🇿🇦 +27 (ZA)</option>
                     <option value="+55">🇧🇷 +55 (BR)</option>
                     <option value="+52">🇲🇽 +52 (MX)</option>
                     <option value="+61">🇦🇺 +61 (AU)</option>
                     <option value="+65">🇸🇬 +65 (SG)</option>
                     <option value="+82">🇰🇷 +82 (KR)</option>
                     <option value="+31">🇳🇱 +31 (NL)</option>
                     <option value="+46">🇸🇪 +46 (SE)</option>
                   </select>
                   <input
                     type="tel"
                     name="phone"
                     value={callFormData.phone}
                     onChange={handleCallFormChange}
                     required
                     className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                     placeholder={t('callForm.enterPhone')}
                   />
                 </div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                   {t('callForm.weWillCall')} {callFormData.countryCode} {callFormData.phone || 'your number'}
                 </p>
               </div>

              <button
                type="submit"
                disabled={isCalling}
                className="w-full bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalling ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('callForm.initiatingCall')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Phone className="mr-2 h-5 w-5" />
                    {t('callForm.getAiCallExperience')}
                  </div>
                )}
              </button>
            </form>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
              {t('callForm.callDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              {t('pricing.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div key={index} className={`relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-purple-500 dark:border-purple-400 shadow-lg' 
                  : 'border-white/20 dark:border-slate-700/50'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      {t('pricing.mostPopular')}
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold spark-gradient-text">{plan.price}</span>
                    <span className="text-slate-600 dark:text-slate-400">{plan.period}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-slate-700 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/login">
                  <Button className={`w-full ${
                    plan.popular 
                      ? 'bg-gradient-to-r from-purple-500 to-green-500 hover:from-purple-600 hover:to-green-600 text-white' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                    {plan.popular ? t('common.startFreeTrial') : t('common.getStarted')}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              {t('testimonials.title')}
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              {t('testimonials.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Video Testimonial */}
            <div className="relative group">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 shadow-xl hover:shadow-2xl transition-all duration-300">
                {/* Video Container */}
                <div className="relative aspect-video bg-slate-900">
                  {isVideoPlaying ? (
                    <iframe
                      src={`${testimonials[currentTestimonial].videoUrl}?autoplay=1&mute=${isVideoMuted ? 1 : 0}&controls=1&rel=0`}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <>
                      {/* Video Thumbnail */}
                      <img
                        src={testimonials[currentTestimonial].videoThumbnail}
                        alt={`${testimonials[currentTestimonial].name} testimonial`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-all duration-300">
                        <button
                          onClick={() => setIsVideoPlaying(true)}
                          className="w-20 h-20 bg-white/90 hover:bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-lg"
                        >
                          <Play className="h-8 w-8 text-slate-900 ml-1" />
                        </button>
                      </div>
                      
                      {/* Duration Badge */}
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {testimonials[currentTestimonial].duration}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Video Controls */}
                {isVideoPlaying && (
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button
                      onClick={() => setIsVideoMuted(!isVideoMuted)}
                      className="w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded flex items-center justify-center transition-all duration-300"
                    >
                      {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => setIsVideoFullscreen(!isVideoFullscreen)}
                      className="w-8 h-8 bg-black/70 hover:bg-black/90 text-white rounded flex items-center justify-center transition-all duration-300"
                    >
                      {isVideoFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
              
              {/* Video Testimonial Info */}
              <div className="mt-4 p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-white/20 dark:border-slate-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {testimonials[currentTestimonial].avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                    </div>
                  </div>
                  <div className="flex ml-auto">
                    {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Text Testimonial */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20 dark:border-slate-700/50">
              <div className="h-full flex flex-col justify-center">
                <Quote className="h-12 w-12 text-purple-500 mb-6" />
                <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 mb-6 italic leading-relaxed">
                  "{testimonials[currentTestimonial].content}"
                </p>
                
                {/* Key Results */}
                <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 rounded-xl border border-purple-200/50 dark:border-purple-700/50">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{t('testimonials.keyResults')}:</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-slate-600 dark:text-slate-400">{t('testimonials.leadIncrease')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-slate-600 dark:text-slate-400">{t('testimonials.marketGrowth')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-600 dark:text-slate-400">{t('testimonials.customerSatisfaction')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-slate-600 dark:text-slate-400">{t('testimonials.availability')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonial Navigation */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
              className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
            
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentTestimonial 
                      ? 'bg-purple-500 scale-125' 
                      : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
              className="w-12 h-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500 to-green-500 rounded-3xl p-8 md:p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('cta.title')}
            </h2>
            <p className="text-xl mb-8 opacity-90">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg">
                  {t('cta.startFreeTrial')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-purple-600 px-8 py-3 text-lg">
                {t('cta.scheduleDemo')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-green-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                                 <span className="text-xl font-bold">AI Sales Calling Agent</span>
              </div>
              <p className="text-slate-400 mb-6 max-w-md">
                {t('footer.companyDescription')}
              </p>
              <div className="text-slate-400 text-sm space-y-1">
                <p>📍 {t('footer.address')}</p>
                <p>📧 {t('footer.email')}</p>
                <p>📞 {t('footer.phone')}</p>
              </div>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">{t('footer.product')}</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.features')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.pricing')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.api')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.integrations')}</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-4">{t('footer.company')}</h3>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.about')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.blog')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.careers')}</a></li>
                <li><a href="#" className="hover:text-white transition-colors">{t('footer.contact')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-slate-400 text-sm">
              {t('footer.copyright')}
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{t('footer.privacyPolicy')}</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{t('footer.termsOfService')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
