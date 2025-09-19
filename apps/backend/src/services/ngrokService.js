import axios from 'axios';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

class NgrokService {
  constructor() {
    this.authToken = process.env.NGROK_AUTH_TOKEN;
    this.subdomain = process.env.NGROK_SUBDOMAIN;
    this.ngrokProcess = null;
    this.publicUrl = null;
  }

  async startTunnel(port = 8000) {
    try {
      console.log('🚇 Starting ngrok tunnel...');
      
      if (!this.authToken) {
        console.warn('⚠️  NGROK_AUTH_TOKEN not set. Using free ngrok (may have limitations).');
      }

      return new Promise((resolve, reject) => {
        const args = ['http', port.toString()];
        
        if (this.authToken) {
          args.push('--authtoken', this.authToken);
        }
        
        if (this.subdomain) {
          args.push('--subdomain', this.subdomain);
        }

        this.ngrokProcess = spawn('ngrok', args, {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let output = '';
        
        this.ngrokProcess.stdout.on('data', (data) => {
          output += data.toString();
          console.log('ngrok:', data.toString().trim());
        });

        this.ngrokProcess.stderr.on('data', (data) => {
          console.error('ngrok error:', data.toString().trim());
        });

        this.ngrokProcess.on('close', (code) => {
          console.log(`ngrok process exited with code ${code}`);
        });

        // Wait for ngrok to start and get the public URL
        setTimeout(async () => {
          try {
            const publicUrl = await this.getPublicUrl();
            if (publicUrl) {
              this.publicUrl = publicUrl;
              console.log('✅ ngrok tunnel established');
              console.log('🌐 Public URL:', publicUrl);
              resolve(publicUrl);
            } else {
              reject(new Error('Failed to get ngrok public URL'));
            }
          } catch (error) {
            reject(error);
          }
        }, 3000);
      });
    } catch (error) {
      console.error('❌ Failed to start ngrok tunnel:', error.message);
      throw error;
    }
  }

  async getPublicUrl() {
    try {
      const response = await axios.get('http://localhost:4040/api/tunnels');
      const tunnels = response.data.tunnels;
      
      if (tunnels && tunnels.length > 0) {
        // Prefer HTTPS tunnel
        const httpsTunnel = tunnels.find(t => t.proto === 'https');
        if (httpsTunnel) {
          return httpsTunnel.public_url;
        }
        
        // Fallback to HTTP tunnel
        const httpTunnel = tunnels.find(t => t.proto === 'http');
        if (httpTunnel) {
          return httpTunnel.public_url;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get ngrok public URL:', error.message);
      return null;
    }
  }

  async stopTunnel() {
    if (this.ngrokProcess) {
      console.log('🛑 Stopping ngrok tunnel...');
      this.ngrokProcess.kill();
      this.ngrokProcess = null;
      this.publicUrl = null;
      console.log('✅ ngrok tunnel stopped');
    }
  }

  getPublicUrl() {
    return this.publicUrl;
  }

  async updateWebhookUrls() {
    const publicUrl = this.getPublicUrl();
    if (!publicUrl) {
      throw new Error('No ngrok tunnel active');
    }

    const webhookUrls = {
      baseUrl: publicUrl,
      twimlUrl: `${publicUrl}/outbound-call-twiml`,
      statusCallbackUrl: `${publicUrl}/api/twilio/status`,
      elevenlabsWebhookUrl: `${publicUrl}/api/webhooks/elevenlabs`,
      voiceWebhookUrl: `${publicUrl}/api/webhooks/voice`
    };

    console.log('🔗 Webhook URLs updated:');
    console.log('📞 TwiML URL:', webhookUrls.twimlUrl);
    console.log('📊 Status Callback:', webhookUrls.statusCallbackUrl);
    console.log('🎤 ElevenLabs Webhook:', webhookUrls.elevenlabsWebhookUrl);

    return webhookUrls;
  }
}

export default new NgrokService();
