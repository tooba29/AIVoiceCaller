import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Phone, Zap, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface CallingMethodSelectorProps {
  onMethodSelect: (method: 'direct' | 'twilio-tts') => void;
  selectedMethod: 'direct' | 'twilio-tts';
  disabled?: boolean;
}

const CallingMethodSelector: React.FC<CallingMethodSelectorProps> = ({
  onMethodSelect,
  selectedMethod,
  disabled = false
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const methods = [
    {
      id: 'direct' as const,
      name: 'ElevenLabs Direct Calling',
      description: 'Full conversational AI with real-time interaction',
      icon: Bot,
      color: 'from-purple-500 to-pink-500',
      features: [
        'Real-time conversation',
        'Neural voice generation',
        'Speech recognition',
        'Natural interruptions',
        'Advanced AI responses'
      ],
      pros: [
        'Most natural conversation flow',
        'Real-time AI responses',
        'Advanced conversation features',
        'No webhook dependencies'
      ],
      cons: [
        'Requires ElevenLabs phone number',
        'Higher cost per minute',
        'More complex setup'
      ],
      requirements: [
        'ELEVENLABS_API_KEY',
        'ELEVENLABS_AGENT_ID',
        'ELEVENLABS_PHONE_NUMBER_ID'
      ]
    },
    {
      id: 'twilio-tts' as const,
      name: 'Twilio + ElevenLabs TTS',
      description: 'Reliable call handling with high-quality neural voices',
      icon: Phone,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'Twilio reliability',
        'ElevenLabs neural voices',
        'Webhook integration',
        'Call recording',
        'Status callbacks'
      ],
      pros: [
        'Most reliable call delivery',
        'Lower cost per minute',
        'Easy webhook setup',
        'Call recording included',
        'Better for high volume'
      ],
      cons: [
        'Pre-generated responses',
        'Requires webhook setup',
        'Less real-time interaction'
      ],
      requirements: [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
        'ELEVENLABS_API_KEY'
      ]
    }
  ];

  const handleMethodSelect = async (methodId: 'direct' | 'twilio-tts') => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      onMethodSelect(methodId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
          Choose Calling Method
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Select how you want to make your AI voice calls
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {methods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <Card 
              key={method.id}
              className={`relative cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-purple-500 shadow-lg' 
                  : 'hover:shadow-md'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleMethodSelect(method.id)}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-purple-500 text-white">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Selected
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 bg-gradient-to-r ${method.color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Features */}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                    <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                    Features
                  </h4>
                  <ul className="space-y-1">
                    {method.features.map((feature, index) => (
                      <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Pros */}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Advantages
                  </h4>
                  <ul className="space-y-1">
                    {method.pros.map((pro, index) => (
                      <li key={index} className="text-sm text-green-600 dark:text-green-400 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cons */}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                    Considerations
                  </h4>
                  <ul className="space-y-1">
                    {method.cons.map((con, index) => (
                      <li key={index} className="text-sm text-orange-600 dark:text-orange-400 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-2 text-orange-500 flex-shrink-0" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Requirements */}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center">
                    <Info className="w-4 h-4 mr-2 text-blue-500" />
                    Requirements
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {method.requirements.map((req, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Select Button */}
                <Button
                  className={`w-full ${
                    isSelected 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                  disabled={disabled || isLoading}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMethodSelect(method.id);
                  }}
                >
                  {isLoading ? (
                    'Loading...'
                  ) : isSelected ? (
                    'Selected'
                  ) : (
                    'Select This Method'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
              Need Help Choosing?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>ElevenLabs Direct</strong> is best for natural conversations and real-time interaction. 
              <strong>Twilio + TTS</strong> is best for reliability, cost-effectiveness, and high-volume calling.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallingMethodSelector;
