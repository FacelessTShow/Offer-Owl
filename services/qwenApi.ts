import AsyncStorage from '@react-native-async-storage/async-storage';
import { ComparisonRequest, ComparisonResult, QwenApiResponse, CachedComparison } from '../types/comparison';

class QwenApiService {
  private baseUrl = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  private apiKey: string | null = null;
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;
  private maxRetries = 3;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey() {
    try {
      const key = await AsyncStorage.getItem('qwen_api_key');
      this.apiKey = key;
    } catch (error) {
      console.error('Failed to load API key:', error);
    }
  }

  async setApiKey(key: string) {
    this.apiKey = key;
    try {
      await AsyncStorage.setItem('qwen_api_key', key);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  }

  private async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private generateCacheKey(request: ComparisonRequest): string {
    const itemNames = request.items.map(item => item.name).sort().join('|');
    const criteriaNames = request.criteria.map(c => c.name).sort().join('|');
    return `${itemNames}_${criteriaNames}_${request.analysisType}`;
  }

  private async getCachedResult(key: string): Promise<ComparisonResult | null> {
    try {
      const cached = await AsyncStorage.getItem(`comparison_cache_${key}`);
      if (!cached) return null;

      const cachedData: CachedComparison = JSON.parse(cached);
      
      if (new Date() > new Date(cachedData.expiresAt)) {
        await AsyncStorage.removeItem(`comparison_cache_${key}`);
        return null;
      }

      return cachedData.result;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  private async setCachedResult(key: string, result: ComparisonResult) {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours

      const cachedData: CachedComparison = {
        key,
        result,
        expiresAt
      };

      await AsyncStorage.setItem(`comparison_cache_${key}`, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  private buildPrompt(request: ComparisonRequest): string {
    const itemsDescription = request.items.map(item => 
      `${item.name}: ${item.description || 'No description provided'}`
    ).join('\n');

    const criteriaDescription = request.criteria.map(c => 
      `${c.name} (weight: ${c.weight}): ${c.description}`
    ).join('\n');

    return `
Please provide a comprehensive technical comparison analysis of the following items:

ITEMS TO COMPARE:
${itemsDescription}

COMPARISON CRITERIA:
${criteriaDescription}

ANALYSIS TYPE: ${request.analysisType}

${request.customPrompt ? `ADDITIONAL REQUIREMENTS: ${request.customPrompt}` : ''}

Please provide your response in the following JSON format:
{
  "summary": "Brief overview of the comparison",
  "scores": {
    "item1_name": overall_score_0_to_100,
    "item2_name": overall_score_0_to_100
  },
  "strengths": {
    "item1_name": ["strength1", "strength2"],
    "item2_name": ["strength1", "strength2"]
  },
  "weaknesses": {
    "item1_name": ["weakness1", "weakness2"],
    "item2_name": ["weakness1", "weakness2"]
  },
  "recommendations": ["recommendation1", "recommendation2"],
  "detailedAnalysis": {
    "criterion1": {
      "item1_name": "detailed analysis",
      "item2_name": "detailed analysis"
    }
  }
}

Ensure all scores are numerical values between 0-100, and provide detailed, objective analysis.
`;
  }

  private async makeApiRequest(prompt: string, retryCount = 0): Promise<QwenApiResponse> {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    await this.enforceRateLimit();

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-SSE': 'disable'
        },
        body: JSON.stringify({
          model: 'qwen-plus',
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an expert technical analyst specializing in product comparisons. Provide detailed, objective analysis in the requested JSON format.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            temperature: 0.3,
            max_tokens: 2000,
            top_p: 0.8
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.output || !data.output.choices || data.output.choices.length === 0) {
        throw new Error('Invalid API response format');
      }

      return {
        choices: data.output.choices.map((choice: any) => ({
          message: {
            content: choice.message.content,
            role: choice.message.role
          },
          finish_reason: choice.finish_reason
        })),
        usage: data.usage,
        model: data.model,
        id: data.request_id
      };
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.warn(`API request failed, retrying (${retryCount + 1}/${this.maxRetries}):`, error);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return this.makeApiRequest(prompt, retryCount + 1);
      }
      throw error;
    }
  }

  private parseAnalysisResponse(content: string): any {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, create a structured response from the text
      return {
        summary: content.substring(0, 500) + '...',
        scores: {},
        strengths: {},
        weaknesses: {},
        recommendations: ['Please review the full analysis for detailed insights'],
        detailedAnalysis: { general: content }
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      return {
        summary: 'Analysis completed but response format needs manual review',
        scores: {},
        strengths: {},
        weaknesses: {},
        recommendations: ['Please review the raw analysis output'],
        detailedAnalysis: { raw: content }
      };
    }
  }

  async compareItems(request: ComparisonRequest): Promise<ComparisonResult> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cachedResult = await this.getCachedResult(cacheKey);
    if (cachedResult) {
      console.log('Returning cached result');
      return cachedResult;
    }

    try {
      const prompt = this.buildPrompt(request);
      const apiResponse = await this.makeApiRequest(prompt);
      
      const analysisContent = apiResponse.choices[0].message.content;
      const parsedAnalysis = this.parseAnalysisResponse(analysisContent);
      
      const result: ComparisonResult = {
        id: `comparison_${Date.now()}`,
        timestamp: new Date(),
        request,
        analysis: parsedAnalysis,
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: apiResponse.usage.total_tokens,
          confidence: 0.85 // Default confidence score
        }
      };

      // Cache the result
      await this.setCachedResult(cacheKey, result);
      
      // Log the interaction
      await this.logInteraction(request, result);

      return result;
    } catch (error) {
      console.error('Comparison analysis failed:', error);
      throw new Error(`Failed to analyze comparison: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async logInteraction(request: ComparisonRequest, result: ComparisonResult) {
    try {
      const logs = await AsyncStorage.getItem('qwen_interaction_logs') || '[]';
      const logEntries = JSON.parse(logs);
      
      logEntries.push({
        timestamp: new Date().toISOString(),
        requestId: result.id,
        itemCount: request.items.length,
        criteriaCount: request.criteria.length,
        analysisType: request.analysisType,
        processingTime: result.metadata.processingTime,
        tokensUsed: result.metadata.tokensUsed,
        success: true
      });

      // Keep only last 100 entries
      if (logEntries.length > 100) {
        logEntries.splice(0, logEntries.length - 100);
      }

      await AsyncStorage.setItem('qwen_interaction_logs', JSON.stringify(logEntries));
    } catch (error) {
      console.error('Failed to log interaction:', error);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const testRequest: ComparisonRequest = {
        items: [
          { id: '1', name: 'Test Item A', category: 'test', description: 'Simple test item' },
          { id: '2', name: 'Test Item B', category: 'test', description: 'Another test item' }
        ],
        criteria: [
          { id: '1', name: 'Performance', weight: 1, description: 'Overall performance' }
        ],
        analysisType: 'technical'
      };

      const prompt = 'Please respond with a simple JSON object: {"status": "connected", "message": "API connection successful"}';
      await this.makeApiRequest(prompt);
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('comparison_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const qwenApiService = new QwenApiService();