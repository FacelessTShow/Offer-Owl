export interface ComparisonItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  specifications?: Record<string, any>;
}

export interface ComparisonCriteria {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface ComparisonRequest {
  items: ComparisonItem[];
  criteria: ComparisonCriteria[];
  customPrompt?: string;
  analysisType: 'technical' | 'business' | 'consumer' | 'custom';
}

export interface ComparisonResult {
  id: string;
  timestamp: Date;
  request: ComparisonRequest;
  analysis: {
    summary: string;
    scores: Record<string, number>;
    strengths: Record<string, string[]>;
    weaknesses: Record<string, string[]>;
    recommendations: string[];
    detailedAnalysis: Record<string, any>;
  };
  metadata: {
    processingTime: number;
    tokensUsed: number;
    confidence: number;
  };
}

export interface QwenApiResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  id: string;
}

export interface CachedComparison {
  key: string;
  result: ComparisonResult;
  expiresAt: Date;
}