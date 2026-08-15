/**
 * AI Service - Model-Agnostic AI Architecture
 * 
 * Bileşenler:
 * - AI Provider (OpenAI, Gemini, Local LLM vb.)
 * - Prompt Manager (Prompt şablonları ve versiyonlama)
 * - Memory (Konversasyon geçmişi)
 * - Command Engine (Komut işleme ve yürütme)
 * - Permission System (Rol tabanlı izinler)
 * 
 * Özellikleri:
 * - Model-agnostic (Herhangi bir LLM kullanılabilir)
 * - Genişletilebilir (Yeni modeller kolay eklenebilir)
 * - Güvenli (İzin kontrolleri)
 * - Loglanabilir (Tüm işlemler kaydedilir)
 * - Test edilebilir (Bağımsız modüller)
 */

import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} from '../_core/errors';

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  CLAUDE = 'claude',
  LOCAL = 'local',
}

export enum AICommandType {
  CREATE_CATEGORY = 'create_category',
  UPDATE_COMMISSION = 'update_commission',
  CREATE_CAMPAIGN = 'create_campaign',
  MANAGE_USERS = 'manage_users',
  ANALYZE_DATA = 'analyze_data',
  GENERATE_REPORT = 'generate_report',
  SYSTEM_CONFIG = 'system_config',
}

export interface AICommand {
  id: string;
  type: AICommandType;
  input: string;
  parameters: Record<string, unknown>;
  requiredPermissions: string[];
}

export interface AIResponse {
  id: string;
  commandId: string;
  output: string;
  actions: AIAction[];
  confidence: number; // 0-1
  preview?: Record<string, unknown>;
  requiresApproval: boolean;
  executedAt?: Date;
}

export interface AIAction {
  type: string;
  target: string;
  operation: string;
  data: Record<string, unknown>;
}

export interface AIMemory {
  conversationId: string;
  userId: string;
  messages: AIMessage[];
  context: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AIProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderConfig {
  name: AIProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
}

export interface AIExecutionResult {
  success: boolean;
  message: string;
  result: Record<string, unknown>;
}

export class AIService {
  private providers: Map<AIProvider, AIProviderConfig> = new Map();
  private prompts: Map<string, string> = new Map();
  private memory: Map<string, AIMemory> = new Map();
  private commandRegistry: Map<AICommandType, AICommandHandler> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializePrompts();
    this.registerCommands();
  }

  /**
   * AI Provider'ları başlat
   */
  private initializeProviders() {
    // OpenAI
    this.providers.set(AIProvider.OPENAI, {
      name: AIProvider.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      enabled: !!process.env.OPENAI_API_KEY,
    });

    // Google Gemini
    this.providers.set(AIProvider.GEMINI, {
      name: AIProvider.GEMINI,
      apiKey: process.env.GEMINI_API_KEY,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      model: 'gemini-pro',
      temperature: 0.7,
      maxTokens: 2000,
      enabled: !!process.env.GEMINI_API_KEY,
    });

    // Local LLM (Ollama vb.)
    this.providers.set(AIProvider.LOCAL, {
      name: AIProvider.LOCAL,
      endpoint: process.env.LOCAL_LLM_ENDPOINT ?? '',
      model: 'llama2',
      temperature: 0.7,
      maxTokens: 2000,
      enabled: Boolean(process.env.LOCAL_LLM_ENDPOINT),
    });
  }

  /**
   * Prompt şablonlarını başlat
   */
  private initializePrompts() {
    this.prompts.set('system', `
      Sen Move&Fix platformunun AI Asistanısın.
      Görevin:
      - Kurucu tarafından verilen komutları anla
      - Yapılacak işlemleri planla
      - Değişiklikleri öner
      - Onay almadan kritik işlemleri yapma
      
      Her komut için:
      1. Komutu analiz et
      2. Gerekli izinleri kontrol et
      3. Yapılacak işlemleri listele
      4. Önizleme oluştur
      5. Onay bekle
    `);

    this.prompts.set('category_creation', `
      Kategori oluşturma isteği analiz et.
      Parametreler: {{name}}, {{description}}, {{commission}}
      
      Kontrol et:
      - Kategori adı benzersiz mi?
      - Komisyon oranı geçerli mi? (0-100)
      - Açıklama yeterli mi?
      
      Öner ve onay bekle.
    `);

    this.prompts.set('commission_update', `
      Komisyon güncelleme isteği analiz et.
      Kategori: {{categoryId}}, Yeni oran: {{newRate}}%
      
      Kontrol et:
      - Eski oran: {{oldRate}}%
      - Etkilenecek aktif siparişler: {{affectedOrders}}
      - Tahmini gelir değişimi: {{revenueImpact}}
      
      Uyarı ver ve onay bekle.
    `);
  }

  /**
   * Komutları kaydet
   */
  private registerCommands() {
    this.commandRegistry.set(
      AICommandType.CREATE_CATEGORY,
      {
        name: 'Kategori Oluştur',
        permissions: ['categories:manage'],
        handler: this.handleCreateCategory.bind(this),
      }
    );

    this.commandRegistry.set(
      AICommandType.UPDATE_COMMISSION,
      {
        name: 'Komisyon Güncelle',
        permissions: ['commissions:manage'],
        handler: this.handleUpdateCommission.bind(this),
      }
    );

    this.commandRegistry.set(
      AICommandType.CREATE_CAMPAIGN,
      {
        name: 'Kampanya Oluştur',
        permissions: ['campaigns:manage'],
        handler: this.handleCreateCampaign.bind(this),
      }
    );
  }

  /**
   * Komut işle
   */
  async processCommand(
    userId: string,
    input: string,
    userPermissions: string[]
  ): Promise<AIResponse> {
    // Konversasyon geçmişini getir
    const memory = await this.getMemory(userId);

    // AI Provider'ı seç
    const provider = this.selectProvider();

    // Prompt'u hazırla
    const systemPrompt = this.prompts.get('system') || '';
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...memory.messages,
      { role: 'user' as const, content: input },
    ];

    // AI'ya sor
    const aiResponse = await this.callAIProvider(provider, messages);

    // Komutu analiz et
    const command = this.parseCommand(aiResponse);

    // İzinleri kontrol et
    const hasPermission = this.checkPermissions(command.requiredPermissions, userPermissions);

    if (!hasPermission) {
      return {
        id: `RESP-${Date.now()}`,
        commandId: command.id,
        output: '❌ Bu işlemi gerçekleştirmek için yeterli izniniz yok.',
        actions: [],
        confidence: 1,
        requiresApproval: false,
      };
    }

    // Komut handler'ını çağır
    const handler = this.commandRegistry.get(command.type);
    if (!handler) {
      return {
        id: `RESP-${Date.now()}`,
        commandId: command.id,
        output: '❓ Bu komut tanınmadı. Lütfen daha spesifik bir talimat verin.',
        actions: [],
        confidence: 0.5,
        requiresApproval: false,
      };
    }

    // Handler'ı çalıştır
    const response = await handler.handler(command);

    // Konversasyon geçmişini güncelle
    memory.messages.push(
      { role: 'user', content: input, timestamp: new Date() },
      { role: 'assistant', content: response.output, timestamp: new Date() }
    );
    memory.updatedAt = new Date();

    return response;
  }

  /**
   * AI Provider'ı seç
   */
  private selectProvider(): AIProviderConfig {
    // Etkin provider'ları bul
    const enabledProviders = Array.from(this.providers.values()).filter(p => p.enabled);

    if (enabledProviders.length === 0) {
      throw new ExternalServiceError('AI', 'Etkin AI Provider bulunamadı', {
        retryable: false,
      });
    }

    // Tercih sırası: OpenAI > Gemini > Local
    return (
      enabledProviders.find(p => p.name === AIProvider.OPENAI) ||
      enabledProviders.find(p => p.name === AIProvider.GEMINI) ||
      enabledProviders[0]
    );
  }

  /**
   * AI Provider'ı çağır
   */
  private async callAIProvider(
    provider: AIProviderConfig,
    messages: AIProviderMessage[]
  ): Promise<string> {
    throw new ExternalServiceError(
      'AI',
      `Legacy AIService provider adapter is not configured for ${provider.name}; use the verified MoveAI command pipeline`,
      { retryable: false },
    );
  }

  /**
   * Komutu parse et
   */
  private parseCommand(response: string): AICommand {
    throw new ExternalServiceError('AI', 'Legacy AIService cannot parse commands without a verified provider response', {
      retryable: false,
    });
  }

  /**
   * İzinleri kontrol et
   */
  private checkPermissions(required: string[], available: string[]): boolean {
    if (available.includes('*')) return true; // Owner
    return required.every(perm => available.includes(perm));
  }

  /**
   * Kategori oluştur handler
   */
  private async handleCreateCategory(command: AICommand): Promise<AIResponse> {
    return {
      id: `RESP-${Date.now()}`,
      commandId: command.id,
      output: '✅ Kategori oluşturulmaya hazır. Lütfen onaylayın.',
      actions: [
        {
          type: 'create',
          target: 'category',
          operation: 'insert',
          data: command.parameters,
        },
      ],
      confidence: 0.85,
      preview: command.parameters,
      requiresApproval: true,
    };
  }

  /**
   * Komisyon güncelle handler
   */
  private async handleUpdateCommission(command: AICommand): Promise<AIResponse> {
    return {
      id: `RESP-${Date.now()}`,
      commandId: command.id,
      output: '⚠️ Komisyon oranı değiştirilecek. Etkilenecek siparişler: 45. Onaylayın.',
      actions: [
        {
          type: 'update',
          target: 'category',
          operation: 'update_commission',
          data: command.parameters,
        },
      ],
      confidence: 0.9,
      preview: command.parameters,
      requiresApproval: true,
    };
  }

  /**
   * Kampanya oluştur handler
   */
  private async handleCreateCampaign(command: AICommand): Promise<AIResponse> {
    return {
      id: `RESP-${Date.now()}`,
      commandId: command.id,
      output: '✅ Kampanya oluşturulmaya hazır. Onaylayın.',
      actions: [
        {
          type: 'create',
          target: 'campaign',
          operation: 'insert',
          data: command.parameters,
        },
      ],
      confidence: 0.8,
      preview: command.parameters,
      requiresApproval: true,
    };
  }

  /**
   * Konversasyon geçmişini getir
   */
  async getMemory(userId: string): Promise<AIMemory> {
    if (!this.memory.has(userId)) {
      this.memory.set(userId, {
        conversationId: `CONV-${Date.now()}`,
        userId,
        messages: [],
        context: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return this.memory.get(userId)!;
  }

  /**
   * Konversasyon geçmişini temizle
   */
  async clearMemory(userId: string): Promise<void> {
    this.memory.delete(userId);
  }

  /**
   * AI Provider'ı değiştir
   */
  async setProvider(provider: AIProvider): Promise<void> {
    const config = this.providers.get(provider);
    if (!config) {
      throw new NotFoundError('AI Provider', { provider });
    }

    if (!config.enabled) {
      throw new ConflictError(`Provider etkin değil: ${provider}`, { provider });
    }

    console.log(`🔄 AI Provider değiştirildi: ${provider}`);
  }

  /**
   * AI Komutunu onayla ve çalıştır
   */
  async approveAndExecute(responseId: string): Promise<AIExecutionResult> {
    return {
      success: false,
      message: 'Legacy AI executor devre dışı. İşlem uygulanmadı; doğrulanmış MoveOS komut yürütücüsünü kullanın.',
      result: { responseId, status: 'not_executed' },
    };
  }

  /**
   * AI İstatistikleri
   */
  async getAIStats() {
    return {
      available: false,
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      successRate: 0,
      averageConfidence: null,
      topCommands: [],
      providers: {
        openai: { used: 0, success: 0 },
        gemini: { used: 0, success: 0 },
        local: { used: 0, success: 0 },
      },
    };
  }
}

interface AICommandHandler {
  name: string;
  permissions: string[];
  handler: (command: AICommand) => Promise<AIResponse>;
}

export const aiService = new AIService();
