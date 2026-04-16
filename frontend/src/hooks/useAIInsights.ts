import { useCallback } from 'react';
import { getAIInsights, type AIInsightsRequest, type AIInsightsResponse } from '../utils/api';

export function useAIInsights() {
  const askAI = useCallback((payload: AIInsightsRequest): Promise<AIInsightsResponse> => {
    return getAIInsights(payload);
  }, []);

  return { askAI };
}
