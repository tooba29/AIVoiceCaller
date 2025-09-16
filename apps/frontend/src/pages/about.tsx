import { 
  Sparkles, 
  Target, 
  Users, 
  Award, 
  Globe, 
  Heart, 
  Zap, 
  Shield,
  ArrowRight,
  Check,
  Star,
  Quote,
  Linkedin,
  Twitter,
  Mail,
  Sun,
  Moon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import Navigation from '@/components/navigation';
import { useTheme } from '@/hooks/use-theme';

export default function About() {
  const { theme, toggleTheme } = useTheme();
  const values = [
    {
      icon: Heart,
      title: "Customer First",
      description: "Every decision we make is driven by what's best for our customers and their success.",
      color: "from-red-500 to-pink-500"
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We constantly push the boundaries of AI technology to deliver cutting-edge solutions.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Shield,
      title: "Trust & Security",
      description: "We prioritize the security and privacy of our customers' data above everything else.",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "We're building technology that connects people across languages and cultures worldwide.",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const team = [
    {
      name: "Alex Chen",
      role: "CEO & Founder",
      bio: "Former AI researcher at Google, passionate about democratizing AI technology for businesses.",
      avatar: "AC",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Sarah Williams",
      role: "CTO",
      bio: "Expert in voice AI and natural language processing with 15+ years in the field.",
      avatar: "SW",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Ahmed Hassan",
      role: "VP of Product",
      bio: "Product leader focused on creating intuitive AI solutions that drive real business value.",
      avatar: "AH",
      linkedin: "#",
      twitter: "#"
    },
    {
      name: "Maria Rodriguez",
      role: "VP of Sales",
      bio: "Sales expert helping businesses transform their processes with AI-powered solutions.",
      avatar: "MR",
      linkedin: "#",
      twitter: "#"
    }
  ];

  const milestones = [
    { year: "2020", title: "Founded", description: "Spark AI was born from a vision to democratize AI calling technology" },
    { year: "2021", title: "First 100 Customers", description: "Reached our first milestone with 100 satisfied customers" },
    { year: "2022", title: "Series A Funding", description: "Raised $10M to scale our AI voice technology globally" },
    { year: "2023", title: "500+ Customers", description: "Helped over 500 businesses automate their sales processes" },
    { year: "2024", title: "Global Expansion", description: "Expanding to serve customers in 50+ countries worldwide" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-green-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-green-900/20">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
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
      
      <Navigation />
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                About Spark AI
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 spark-gradient-text">
              Revolutionizing Sales with
              <br />
              AI Voice Intelligence
            </h1>
            
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto">
              We're on a mission to transform how businesses connect with their customers through 
              intelligent, human-like AI voice agents that work 24/7.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold spark-gradient-text mb-2">500+</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold spark-gradient-text mb-2">10M+</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm md:text-base">AI Calls Made</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold spark-gradient-text mb-2">95+</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold spark-gradient-text mb-2">50+</div>
              <div className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400">
                <p>
                  Spark AI was founded in 2020 by a team of AI researchers and sales professionals 
                  who recognized the immense potential of voice AI to transform business communication.
                </p>
                <p>
                  What started as a simple idea to automate cold calling has evolved into a comprehensive 
                  AI voice platform that helps businesses of all sizes connect with their customers in 
                  more meaningful ways.
                </p>
                <p>
                  Today, we're proud to serve over 500 businesses worldwide, helping them increase their 
                  sales efficiency by up to 300% while maintaining the human touch that customers value.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-500/10 to-green-500/10 rounded-3xl p-8 border border-purple-200/50 dark:border-purple-800/50">
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-green-500 rounded-xl flex items-center justify-center">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Our Mission</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Democratizing AI voice technology</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Our Vision</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">AI that sounds human, feels human</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Our Goal</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Transform sales globally</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              Our Values
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              The principles that guide everything we do at Spark AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div key={index} className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                  <div className={`w-12 h-12 bg-gradient-to-br ${value.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              Meet Our Team
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              The passionate people behind Spark AI's success
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/50 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {member.avatar}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {member.name}
                </h3>
                <p className="text-purple-600 dark:text-purple-400 font-semibold mb-3">
                  {member.role}
                </p>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                  {member.bio}
                </p>
                <div className="flex justify-center space-x-3">
                  <a href={member.linkedin} className="text-slate-400 hover:text-blue-600 transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href={member.twitter} className="text-slate-400 hover:text-blue-400 transition-colors">
                    <Twitter className="h-5 w-5" />
                  </a>
                  <a href={`mailto:${member.name.toLowerCase().replace(' ', '.')}@sparkai.com`} className="text-slate-400 hover:text-purple-600 transition-colors">
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold spark-gradient-text mb-4">
              Our Journey
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              Key milestones in Spark AI's growth and development
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-purple-500 to-green-500 h-full"></div>
            
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                  {/* Timeline Dot */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-purple-500 to-green-500 rounded-full border-4 border-white dark:border-slate-900"></div>
                  
                  {/* Content */}
                  <div className={`w-5/12 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 text-left'}`}>
                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-slate-700/50">
                      <div className="text-2xl font-bold spark-gradient-text mb-2">
                        {milestone.year}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500 to-green-500 rounded-3xl p-8 md:p-12 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Our Mission
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Ready to transform your business with AI voice intelligence? 
              Let's build the future of sales together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-purple-600 px-8 py-3 text-lg">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
