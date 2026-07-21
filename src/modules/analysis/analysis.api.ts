/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { api } from '../../lib/api';
import { CONFIG } from '../../lib/config';
import { Analysis, ToneSettings } from '../../types';

export interface AnalyzePayload {
  original_message: string;
  scenario: string;
  relationship_context: string;
  user_goal: string;
  extra_context?: string;
  tone_settings: ToneSettings;
  preferences: Record<string, any>;
}

export const analysisApi = {
  async analyze(payload: AnalyzePayload): Promise<{ success: boolean; analysis: Analysis; error?: string; gateType?: string }> {
    return api.post<{ success: boolean; analysis: Analysis; error?: string; gateType?: string }>(
      CONFIG.endpoints.analyze,
      payload
    );
  },

  async toggleSave(analysisId: string, saved: boolean): Promise<{ success: boolean }> {
    return api.post<{ success: boolean }>(CONFIG.endpoints.saveAnalysis, {
      analysis_id: analysisId,
      saved,
    });
  },

  async delete(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(CONFIG.endpoints.deleteAnalysis(id));
  }
};
