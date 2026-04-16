import { getAIInsights, type AIInsightsRequest, type AIInsightsResponse } from '../utils/api';

export function useAIInsights() {
  const askAI = (payload: AIInsightsRequest): Promise<AIInsightsResponse> => {
    return getAIInsights(payload);
  };

  return { askAI };
}
