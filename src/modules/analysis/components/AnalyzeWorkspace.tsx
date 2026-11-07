/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Bookmark, RefreshCw, 
  ToggleLeft, ToggleRight,
  CornerDownRight, Copy, Plus, X,
  Mic, MicOff, AlertCircle, LineChart, Activity, Compass, HelpCircle, Send, Check, Globe,
  MessageSquare, RotateCcw
} from 'lucide-react';
import { Analysis, ToneSettings } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { hasFeatureAccess, FEATURE_GATES } from '../../../lib/subscriptionConfig';
import LockedFeatureOverlay from '../../../components/ui/LockedFeatureOverlay';
import { authFetch } from '../../../lib/authStorage';

interface AnalyzeWorkspaceProps {
  userId: string;
  userPlan: string;
  trialActive?: boolean;
  initialAnalysis?: Analysis | null;
  onAnalyze: (payload: {
    original_message: string;
    scenario: string;
    relationship_context: string;
    user_goal: string;
    extra_context?: string;
    tone_settings: ToneSettings;
    preferences: Record<string, any>;
  }) => Promise<Analysis | void>;
  onSaveAnalysis: (id: string, saved: boolean) => Promise<void>;
  onUpgradePlan: () => void;
  selectedScenarioFromShortcuts?: string | null;
  onClearScenarioShortcut?: () => void;
  initialDraftText?: string | null;
  onClearInitialDraftText?: () => void;
}

export default function AnalyzeWorkspace({
  userId,
  userPlan,
  trialActive = false,
  initialAnalysis,
  onAnalyze,
  onSaveAnalysis,
  onUpgradePlan,
  selectedScenarioFromShortcuts,
  onClearScenarioShortcut,
  initialDraftText,
  onClearInitialDraftText
}: AnalyzeWorkspaceProps) {
  // Input fields state
  const [originalMessage, setOriginalMessage] = useState<string>(() => {
    if (initialAnalysis?.original_message) {
      return initialAnalysis.original_message;
    }
    const key = `how_it_lands_draft_${userId || 'anonymous'}`;
    try {
      return localStorage.getItem(key) || '';
    } catch (e) {
      return '';
    }
  });

  // Debounced Auto-Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Voice recording with Gemini-powered Transcription
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // Low latency & Thinking mode toggles
  const [lowLatency, setLowLatency] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);

  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);

  const startRecording = async () => {
    setVoiceError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError('Audio recording is not supported in this browser or context.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let recorder: MediaRecorder;
      let selectedMimeType = 'audio/webm';
      
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
        'audio/aac',
        'audio/wav'
      ];
      
      let instantiated = false;
      for (const mime of candidates) {
        try {
          if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(mime)) {
            recorder = new MediaRecorder(stream, { mimeType: mime });
            selectedMimeType = mime;
            instantiated = true;
            break;
          }
        } catch (e) {
          console.warn(`Failed to instantiate MediaRecorder with mimeType ${mime}:`, e);
        }
      }
      
      if (!instantiated) {
        try {
          recorder = new MediaRecorder(stream);
          selectedMimeType = recorder.mimeType || 'audio/webm';
        } catch (e) {
          console.error('Failed to instantiate default MediaRecorder:', e);
          throw new Error('MediaRecorder is not supported or failed to start.');
        }
      }

      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        const finalMimeType = recorder.mimeType || selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(chunks, { type: finalMimeType });
        if (audioBlob.size === 0) {
          setVoiceError('No audio recorded.');
          return;
        }

        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Audio = base64data.split(',')[1];
          
          try {
            const res = await authFetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                audio: base64Audio,
                mimeType: finalMimeType
              })
            });
            const data = await res.json();
            if (data.success && data.transcription) {
              const text = data.transcription.trim();
              setOriginalMessage(prev => prev.trim() ? prev.trim() + ' ' + text : text);
            } else if (data.error) {
              setVoiceError(data.error);
            }
          } catch (err) {
            console.error('Transcription API error:', err);
            setVoiceError('Failed to contact transcription server.');
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error opening microphone:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone permission denied. Please allow microphone access.');
      } else {
        setVoiceError('Could not start microphone. ' + (err.message || 'Make sure it is connected.'));
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImageBase64(base64String);
        setImageMimeType(file.type);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
  };

  // Clean up recording on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (e) {}
      }
    };
  }, [mediaRecorder]);

  useEffect(() => {
    // Skip if viewing an initial analysis and the message has not changed yet
    if (initialAnalysis && originalMessage === initialAnalysis.original_message) {
      setSaveStatus('idle');
      return;
    }

    const key = `how_it_lands_draft_${userId || 'anonymous'}`;
    setSaveStatus('saving');

    const timer = setTimeout(() => {
      try {
        if (originalMessage.trim()) {
          localStorage.setItem(key, originalMessage);
        } else {
          localStorage.removeItem(key);
        }
        setSaveStatus('saved');
        const hideTimer = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(hideTimer);
      } catch (e) {
        console.error('Error auto-saving draft to localStorage', e);
        setSaveStatus('idle');
      }
    }, 1000); // 1-second debounce

    return () => clearTimeout(timer);
  }, [originalMessage, userId, initialAnalysis]);
  const [scenario, setScenario] = useState('general');
  const [isScenarioCustom, setIsScenarioCustom] = useState(false);
  const [customScenario, setCustomScenario] = useState('');
  
  const [relationshipContext, setRelationshipContext] = useState('friend');
  const [isRelationshipCustom, setIsRelationshipCustom] = useState(false);
  const [customRelationshipContext, setCustomRelationshipContext] = useState('');
  
  const [userGoal, setUserGoal] = useState('be honest but kind');
  const [isGoalCustom, setIsGoalCustom] = useState(false);
  const [customUserGoal, setCustomUserGoal] = useState('');
  
  const [customDirective, setCustomDirective] = useState('');
  const [extraContext, setExtraContext] = useState('');
  
  // Custom Output Directives dynamic list
  const [customDirectivesList, setCustomDirectivesList] = useState<string[]>([]);
  const [newDirectiveInput, setNewDirectiveInput] = useState('');

  const [toneSettings, setToneSettings] = useState<ToneSettings>({
    warmth: 50,
    directness: 50,
    softness: 50,
    confidence: 50,
    formality: 50,
    emotional_openness: 50
  });

  // Output preference toggles
  const [preferences, setPreferences] = useState({
    bluntFeedback: false,
    prioritizeKindness: true,
    prioritizeClarity: true,
    keepShort: false,
    preserveVoice: true,
    avoidCorporate: true,
    explainLineByLine: true
  });

  // Workspace status
  const [loading, setLoading] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<Analysis | null>(null);
  const [activeRewriteTab, setActiveRewriteTab] = useState('best_strategic');
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [refiningStatus, setRefiningStatus] = useState<string | null>(null);
  const [savedVaultStatus, setSavedVaultStatus] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('same');
  const [customLanguageText, setCustomLanguageText] = useState('');

  // Coach & Simulator States
  const [coachInput, setCoachInput] = useState('');
  const [coachChat, setCoachChat] = useState<Array<{
    id: string;
    role: 'user' | 'coach';
    message: string;
    suggestedRewrite?: string;
    timestamp: number;
    status?: 'sent' | 'sending' | 'error';
  }>>([
    { 
      id: 'msg_welcome_init',
      role: 'coach', 
      message: "Welcome to your Sovereign coaching loop. I've fully parsed your message draft and current scenario context. Ask me any tactical adjustment questions, like: 'What happens if I delay the send by 24 hours?' or 'Can you make this sound 15% more authoritative but keep it professional?'",
      timestamp: Date.now()
    }
  ]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachCopiedId, setCoachCopiedId] = useState<string | null>(null);
  const lastActiveAnalysisIdRef = useRef<string | null>(null);

  const [simulatorStep, setSimulatorStep] = useState(0);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationData, setSimulationData] = useState<{
    projectedReaction: string;
    coachTip: string;
    moveLabel: string;
    emotionalStatus?: 'defensive' | 'cooperative' | 'hesitant';
  } | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const coachChatEndRef = useRef<HTMLDivElement | null>(null);
  const workspaceTopRef = useRef<HTMLDivElement | null>(null);

  const handleAnalyzeRewrite = async (newText: string) => {
    setOriginalMessage(newText);
    
    // Smooth scroll to the top of the workspace
    if (workspaceTopRef.current) {
      workspaceTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Automatically run the diagnostics analysis on the new text immediately!
    await handleAnalyzeClick(newText);
  };

  // Auto-scroll to bottom of coach chat on updates
  useEffect(() => {
    coachChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachChat, coachLoading]);

  // Sync Coach chat dynamically ONLY when switching to a DIFFERENT analysis ID
  useEffect(() => {
    if (activeAnalysis?.id && activeAnalysis.id !== lastActiveAnalysisIdRef.current) {
      lastActiveAnalysisIdRef.current = activeAnalysis.id;
      const recipient = activeAnalysis.relationship_context || relationshipContext || 'the recipient';
      setCoachChat([
        { 
          id: 'msg_welcome_' + Date.now(),
          role: 'coach', 
          message: `Welcome to your Sovereign coaching loop. I've fully parsed your message draft and relationship context with ${recipient}. Ask me any tactical adjustment questions, like: 'What happens if I delay the send by 24 hours?' or 'Can you make this sound 15% more authoritative but keep it professional?'`,
          timestamp: Date.now()
        }
      ]);
      setCoachError(null);
    }
  }, [activeAnalysis?.id]);

  const handleCoachSend = async (customPrompt?: string | React.FormEvent) => {
    if (customPrompt && typeof customPrompt !== 'string' && 'preventDefault' in customPrompt) {
      customPrompt.preventDefault();
    }
    
    const textToSend = typeof customPrompt === 'string' ? customPrompt : coachInput;
    if (!textToSend || !textToSend.trim() || coachLoading) return;
    
    const userText = textToSend.trim();
    setCoachInput('');
    setCoachError(null);

    const userMsg: {
      id: string;
      role: 'user';
      message: string;
      suggestedRewrite?: string;
      timestamp: number;
      status: 'sent';
    } = {
      id: 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      role: 'user' as const,
      message: userText,
      timestamp: Date.now(),
      status: 'sent' as const
    };

    // Construct authoritative new conversation history
    const nextChat = [...coachChat, userMsg];
    setCoachChat(nextChat);
    setCoachLoading(true);

    try {
      const effectiveLang = activeAnalysis?.target_language || (targetLanguage === 'custom' ? customLanguageText.trim() : targetLanguage);
      const res = await authFetch('/api/analysis/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          activeAnalysisId: activeAnalysis?.id,
          chatHistory: nextChat.map(c => ({
            role: c.role,
            message: c.message,
            suggestedRewrite: c.suggestedRewrite
          })),
          original_message: activeAnalysis?.original_message || originalMessage,
          relationship_context: activeAnalysis?.relationship_context || relationshipContext,
          user_goal: activeAnalysis?.user_goal || userGoal,
          target_language: effectiveLang || 'same'
        })
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.coachResponse || "I've reviewed your request. Let's keep refining this message.";
        const coachMsg = {
          id: 'msg_coach_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          role: 'coach' as const,
          message: responseText,
          suggestedRewrite: data.suggestedRewrite,
          timestamp: Date.now(),
          status: 'sent' as const
        };
        setCoachChat(prev => [...prev, coachMsg]);
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || "The coaching service encountered a momentary issue. Click retry to send your request again.";
        setCoachError(errMsg);
      }
    } catch (err: any) {
      console.error("Coach request error:", err);
      setCoachError(err?.message || "Network gap. Please click retry.");
    } finally {
      setCoachLoading(false);
    }
  };

  const handleResetCoachChat = () => {
    const recipient = activeAnalysis?.relationship_context || relationshipContext || 'the recipient';
    setCoachChat([
      { 
        id: 'msg_welcome_' + Date.now(),
        role: 'coach', 
        message: `Coaching conversation reset. I am calibrated on your draft and relationship with ${recipient}. How would you like to refine the wording next?`,
        timestamp: Date.now()
      }
    ]);
    setCoachError(null);
    setCoachInput('');
  };

  const handleCopyCoachRewrite = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCoachCopiedId(msgId);
    setTimeout(() => {
      setCoachCopiedId(null);
    }, 2000);
  };

  // Apply shortcut scenario if chosen from dashboard
  useEffect(() => {
    if (selectedScenarioFromShortcuts) {
      setScenario(selectedScenarioFromShortcuts);
      setIsScenarioCustom(false);
      setCustomScenario('');
      setIsRelationshipCustom(false);
      setCustomRelationshipContext('');
      setIsGoalCustom(false);
      setCustomUserGoal('');
      
      if (selectedScenarioFromShortcuts === 'breakup') {
        setRelationshipContext('partner / ex');
        setUserGoal('be honest but kind');
      } else if (selectedScenarioFromShortcuts === 'client-money') {
        setRelationshipContext('client');
        setUserGoal('ask for money / payment');
      } else if (selectedScenarioFromShortcuts === 'boundary') {
        setRelationshipContext('friend');
        setUserGoal('set a boundary');
      } else if (selectedScenarioFromShortcuts === 'apology') {
        setRelationshipContext('coworker');
        setUserGoal('apologize sincerely');
      }
      if (onClearScenarioShortcut) onClearScenarioShortcut();
    }
  }, [selectedScenarioFromShortcuts]);

  // Apply initial draft text if passed from templates
  useEffect(() => {
    if (initialDraftText) {
      setOriginalMessage(initialDraftText);
      if (onClearInitialDraftText) onClearInitialDraftText();
    }
  }, [initialDraftText, onClearInitialDraftText]);

  // Sync if initialAnalysis passed (viewing from history)
  useEffect(() => {
    if (initialAnalysis) {
      setActiveAnalysis(initialAnalysis);
      setOriginalMessage(initialAnalysis.original_message);
      
      const knownScenarios = ['general', 'breakup', 'apology', 'boundary', 'confession', 'client-money', 'workplace', 'friend-conflict', 'family', 'follow-up', 'rejection'];
      if (knownScenarios.includes(initialAnalysis.scenario)) {
        setScenario(initialAnalysis.scenario);
        setIsScenarioCustom(false);
        setCustomScenario('');
      } else {
        setScenario('other');
        setIsScenarioCustom(true);
        setCustomScenario(initialAnalysis.scenario);
      }
      
      const knownRelationships = ['romantic interest', 'partner / ex', 'friend', 'family', 'client', 'coworker', 'boss / manager', 'recruiter'];
      if (knownRelationships.includes(initialAnalysis.relationship_context)) {
        setRelationshipContext(initialAnalysis.relationship_context);
        setIsRelationshipCustom(false);
        setCustomRelationshipContext('');
      } else {
        setRelationshipContext('other');
        setIsRelationshipCustom(true);
        setCustomRelationshipContext(initialAnalysis.relationship_context);
      }
      
      const knownGoals = [
        'be honest but kind', 'be firm without sounding rude', 'sound more confident', 
        'apologize sincerely', 'ask for money / payment', 'set a boundary', 
        'reject politely', 'stop overexplaining', 'sound less needy'
      ];
      if (knownGoals.includes(initialAnalysis.user_goal)) {
        setUserGoal(initialAnalysis.user_goal);
        setIsGoalCustom(false);
        setCustomUserGoal('');
      } else {
        setUserGoal('other');
        setIsGoalCustom(true);
        setCustomUserGoal(initialAnalysis.user_goal);
      }

      setExtraContext(initialAnalysis.extra_context || '');
      setToneSettings(initialAnalysis.tone_settings);
      setSavedVaultStatus(initialAnalysis.saved);

      if (initialAnalysis.target_language) {
        const lang = initialAnalysis.target_language;
        const knownLanguages = [
          'same', 'English', 'Spanish', 'Hindi', 'Marathi', 'French', 'German', 'Italian', 
          'Telugu', 'Tamil', 'Bengali', 'Gujarati', 'Japanese', 'Chinese', 'Portuguese', 'Arabic', 'Russian',
          'Hinglish', 'Teluglish', 'Marathish', 'Benglish', 'Tamilish'
        ];
        if (knownLanguages.includes(lang)) {
          setTargetLanguage(lang);
          setCustomLanguageText('');
        } else {
          setTargetLanguage('custom');
          setCustomLanguageText(lang);
        }
      } else {
        setTargetLanguage('same');
        setCustomLanguageText('');
      }
    }
  }, [initialAnalysis]);

  const handleSliderChange = (key: keyof ToneSettings, val: number) => {
    setToneSettings({ ...toneSettings, [key]: val });
  };

  const togglePref = (key: keyof typeof preferences) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const addCustomDirectiveTag = () => {
    if (!newDirectiveInput.trim()) return;
    if (!customDirectivesList.includes(newDirectiveInput.trim())) {
      setCustomDirectivesList([...customDirectivesList, newDirectiveInput.trim()]);
    }
    setNewDirectiveInput('');
  };

  const removeCustomDirectiveTag = (tag: string) => {
    setCustomDirectivesList(customDirectivesList.filter(t => t !== tag));
  };

  const handleAnalyzeClick = async (messageText?: string) => {
    const textToAnalyze = messageText !== undefined ? messageText : originalMessage;
    if (!textToAnalyze.trim()) return;
    setLoading(true);
    try {
      const finalScenario = isScenarioCustom ? (customScenario.trim() || 'custom scenario') : scenario;
      const finalRelationship = isRelationshipCustom ? (customRelationshipContext.trim() || 'custom relationship') : relationshipContext;
      const finalGoal = isGoalCustom ? (customUserGoal.trim() || 'custom goal') : userGoal;

      // Combine direct toggles, custom tags, and manual input
      const combinedDirectives = [
        ...customDirectivesList,
        customDirective.trim()
      ].filter(Boolean).join(', ');

      const result = await onAnalyze({
        original_message: textToAnalyze,
        scenario: finalScenario,
        relationship_context: finalRelationship,
        user_goal: finalGoal,
        extra_context: extraContext,
        tone_settings: toneSettings,
        preferences: {
          ...preferences,
          customDirective: combinedDirectives
        },
        low_latency: lowLatency,
        thinking_mode: thinkingMode,
        image: imageBase64 ? { data: imageBase64, mimeType: imageMimeType || 'image/jpeg' } : null,
        target_language: targetLanguage === 'custom' ? (customLanguageText.trim() || 'English') : targetLanguage
      } as any);
      if (result) {
        setActiveAnalysis(result);
        setSavedVaultStatus(result.saved);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!activeAnalysis) return;
    const newSaved = !savedVaultStatus;
    setSavedVaultStatus(newSaved);
    await onSaveAnalysis(activeAnalysis.id, newSaved);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedState(label);
    setTimeout(() => setCopiedState(null), 2000);
  };

  // Preset demo fills
  const loadDemo = (type: 'breakup' | 'invoice' | 'boundary') => {
    if (type === 'breakup') {
      setOriginalMessage("Hey I am so sorry but I have been super stressed and busy at work and my dog is having health issues so I can't really date right now. You are literally perfect and amazing and I hope we can still be best friends and talk every day though because you are awesome!!");
      setScenario('breakup');
      setIsScenarioCustom(false);
      setRelationshipContext('partner / ex');
      setIsRelationshipCustom(false);
      setUserGoal('be honest but kind');
      setIsGoalCustom(false);
    } else if (type === 'invoice') {
      setOriginalMessage("Hi sorry to bug you again, I know you are so busy! Just checking in on invoice 42 to see if there is any chance you got a free second to look at it? No rush at all, sorry to be a nuisance!");
      setScenario('client-money');
      setIsScenarioCustom(false);
      setRelationshipContext('client');
      setIsRelationshipCustom(false);
      setUserGoal('ask for money / payment');
      setIsGoalCustom(false);
    } else {
      setOriginalMessage("Can you please stop calling me late at night? You always do this and only care about yourself. It is super selfish and makes me really annoyed and tired.");
      setScenario('boundary');
      setIsScenarioCustom(false);
      setRelationshipContext('friend');
      setIsRelationshipCustom(false);
      setUserGoal('set a boundary');
      setIsGoalCustom(false);
    }
  };

  // Refinement action triggers
  const handleRefine = async (instruction: string) => {
    if (!activeAnalysis) return;
    setRefinementPrompt(instruction);
    setRefiningStatus(`Refining drafts according to strategy: "${instruction}"...`);
    
    try {
      const activeRw = activeAnalysis.output_json.rewrites.find(rw => rw.type === activeRewriteTab);
      const currentContent = activeRw ? activeRw.content : activeAnalysis.original_message;
      const effectiveLang = activeAnalysis.target_language || (targetLanguage === 'custom' ? customLanguageText.trim() : targetLanguage);

      const res = await authFetch('/api/analysis/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_id: activeAnalysis.id,
          rewrite_type: activeRewriteTab,
          current_content: currentContent,
          instruction: instruction,
          target_language: effectiveLang || 'same'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.refinedContent) {
          const updatedRewrites = activeAnalysis.output_json.rewrites.map(rw => {
            if (rw.type === activeRewriteTab) {
              return {
                ...rw,
                content: data.refinedContent
              };
            }
            return rw;
          });

          setActiveAnalysis({
            ...activeAnalysis,
            output_json: {
              ...activeAnalysis.output_json,
              rewrites: updatedRewrites
            }
          });
        }
      }
    } catch (err) {
      console.error('Refinement error:', err);
    } finally {
      setRefiningStatus(null);
    }
  };

  // Dynamic Turn Simulation Trigger
  const handleSimulateMove = async (moveKey: string, moveLabel: string) => {
    if (!activeAnalysis) return;
    setSimulationLoading(true);
    setSimulatorStep(1);
    try {
      const effectiveLang = activeAnalysis.target_language || (targetLanguage === 'custom' ? customLanguageText.trim() : targetLanguage);
      const res = await authFetch('/api/analysis/simulate-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: activeAnalysis.original_message,
          move: moveKey,
          scenario: activeAnalysis.scenario,
          relationship: activeAnalysis.relationship_context,
          target_language: effectiveLang || 'same'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimulationData({
          projectedReaction: data.projectedReaction,
          coachTip: data.coachTip,
          moveLabel: moveLabel,
          emotionalStatus: data.emotionalStatus
        });
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulationLoading(false);
    }
  };

  return (
    <div ref={workspaceTopRef} className="message-analyst-workspace grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto p-2">
      
      {/* Left panel: Calibration Console */}
      <Card className="lg:col-span-5 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-semibold">CONVERSATION CALIBRATION</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => loadDemo('breakup')} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] text-slate-700 dark:text-slate-300 font-mono transition cursor-pointer">Demo: Breakup</button>
            <button onClick={() => loadDemo('invoice')} className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-[9px] text-slate-700 dark:text-slate-300 font-mono transition cursor-pointer">Demo: Invoice</button>
          </div>
        </div>

        {/* Text Input area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <label className="text-slate-900 dark:text-slate-100 font-semibold font-sans">Your Message Draft</label>
              {saveStatus === 'saving' && (
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-fade-in">
                  ✓ Draft auto-saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isTranscribing && (
                <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Transcribing...
                </span>
              )}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse font-bold' 
                    : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 hover:text-white hover:bg-emerald-600 dark:bg-emerald-500 hover:border-transparent'
                }`}
                title={isRecording ? "Stop dictating" : "Dictate message"}
              >
                {isRecording ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <MicOff className="w-3 h-3 text-white" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3" />
                    <span>Dictate</span>
                  </>
                )}
              </button>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">{originalMessage.length} characters</span>
            </div>
          </div>
          <textarea
            value={originalMessage}
            onChange={(e) => setOriginalMessage(e.target.value)}
            placeholder="Paste your draft text message, email, DM, or client response here... (or click Dictate to speak your mind)"
            className="w-full h-40 p-4 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none resize-none leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-500 font-light font-sans"
          />
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1">
              {voiceError && (
                <span className="text-[10px] text-red-600 flex items-center gap-1 font-mono">
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  {voiceError}
                </span>
              )}
              {isRecording && (
                <span className="text-[10px] text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5 font-mono animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E85D04]" />
                  Listening... speak clearly into your mic.
                </span>
              )}
            </div>
            {originalMessage.trim() && (
              <button 
                onClick={() => setOriginalMessage('')} 
                className="text-[10px] text-[#C97A7A] hover:underline font-mono ml-auto"
              >
                Clear input
              </button>
            )}
          </div>

          {/* Image Upload Component */}
          <div className="p-3 bg-slate-50 dark:bg-[#10141C] border border-slate-200 dark:border-white/10 rounded-xl space-y-2 mt-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-semibold">
              <span>Attach Chat Screenshot (Multimodal Analysis)</span>
              {imagePreview && (
                <button type="button" onClick={clearImage} className="text-[#C97A7A] hover:underline uppercase text-[9px] font-mono cursor-pointer">Remove</button>
              )}
            </div>
            {imagePreview ? (
              <div className="relative w-full h-32 bg-slate-100 dark:bg-white/5 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-white/10">
                <img src={imagePreview} alt="Screenshot preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 cursor-pointer hover:border-[#E85D04] transition group bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono group-hover:text-cyan-700 dark:text-cyan-400 transition flex items-center gap-1.5">
                  📁 Click to attach screenshot
                </span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Scenarios and Relationship Controls */}
        <div className="space-y-4">
          {/* Scenario Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-900 dark:text-slate-100 font-semibold">Scenario Type</label>
              <button 
                onClick={() => setIsScenarioCustom(!isScenarioCustom)}
                className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 hover:underline uppercase tracking-wide font-semibold cursor-pointer"
              >
                {isScenarioCustom ? "Select Presets" : "Enter Custom"}
              </button>
            </div>
            
            {isScenarioCustom ? (
              <input
                type="text"
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                placeholder="Describe custom scenario (e.g., Landlord late lease renewal)"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            ) : (
              <select
                value={scenario}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setIsScenarioCustom(true);
                  } else {
                    setScenario(e.target.value);
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer font-sans"
              >
                <option value="general" className="bg-white text-slate-900 dark:text-slate-100">General Difficult Conversation</option>
                <option value="breakup" className="bg-white text-slate-900 dark:text-slate-100">Breakup / Closure</option>
                <option value="apology" className="bg-white text-slate-900 dark:text-slate-100">Apology / Repair</option>
                <option value="boundary" className="bg-white text-slate-900 dark:text-slate-100">Boundary / Saying No</option>
                <option value="confession" className="bg-white text-slate-900 dark:text-slate-100">Confession / Vulnerable</option>
                <option value="client-money" className="bg-white text-slate-900 dark:text-slate-100">Client Payment / Late Fees</option>
                <option value="workplace" className="bg-white text-slate-900 dark:text-slate-100">Workplace / Boss Sync</option>
                <option value="friend-conflict" className="bg-white text-slate-900 dark:text-slate-100">Friendship Dispute</option>
                <option value="family" className="bg-white text-slate-900 dark:text-slate-100">Family Boundary</option>
                <option value="follow-up" className="bg-white text-slate-900 dark:text-slate-100">Follow-Up Double Text</option>
                <option value="rejection" className="bg-white text-slate-900 dark:text-slate-100">Rejection / Declining Someone</option>
                <option value="other" className="bg-white text-slate-900 dark:text-slate-100">Other / Custom...</option>
              </select>
            )}
          </div>

          {/* Relationship Context Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-900 dark:text-slate-100 font-semibold">Relationship Context</label>
              <button 
                onClick={() => setIsRelationshipCustom(!isRelationshipCustom)}
                className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 hover:underline uppercase tracking-wide font-semibold cursor-pointer"
              >
                {isRelationshipCustom ? "Select Presets" : "Enter Custom"}
              </button>
            </div>

            {isRelationshipCustom ? (
              <input
                type="text"
                value={customRelationshipContext}
                onChange={(e) => setCustomRelationshipContext(e.target.value)}
                placeholder="Describe connection (e.g., HOA President, Cousin)"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            ) : (
              <select
                value={relationshipContext}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setIsRelationshipCustom(true);
                  } else {
                    setRelationshipContext(e.target.value);
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer font-sans"
              >
                <option value="romantic interest" className="bg-white text-slate-900 dark:text-slate-100">Romantic Interest</option>
                <option value="partner / ex" className="bg-white text-slate-900 dark:text-slate-100">Partner / Ex</option>
                <option value="friend" className="bg-white text-slate-900 dark:text-slate-100">Friend</option>
                <option value="family" className="bg-white text-slate-900 dark:text-slate-100">Family Member</option>
                <option value="client" className="bg-white text-slate-900 dark:text-slate-100">Client / Contractor</option>
                <option value="coworker" className="bg-white text-slate-900 dark:text-slate-100">Coworker</option>
                <option value="boss / manager" className="bg-white text-slate-900 dark:text-slate-100">Boss / Manager</option>
                <option value="recruiter" className="bg-white text-slate-900 dark:text-slate-100">Recruiter</option>
                <option value="other" className="bg-white text-slate-900 dark:text-slate-100">Other / Custom...</option>
              </select>
            )}
          </div>

          {/* Strategic Intent / Goal Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-900 dark:text-slate-100 font-semibold">Strategic Intent / Goal</label>
              <button 
                onClick={() => setIsGoalCustom(!isGoalCustom)}
                className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 hover:underline uppercase tracking-wide font-semibold cursor-pointer"
              >
                {isGoalCustom ? "Select Presets" : "Enter Custom"}
              </button>
            </div>

            {isGoalCustom ? (
              <input
                type="text"
                value={customUserGoal}
                onChange={(e) => setCustomUserGoal(e.target.value)}
                placeholder="Describe ultimate goal (e.g., Cancel contract cleanly)"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            ) : (
              <select
                value={userGoal}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setIsGoalCustom(true);
                  } else {
                    setUserGoal(e.target.value);
                  }
                }}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer font-sans"
              >
                <option value="be honest but kind" className="bg-white text-slate-900 dark:text-slate-100">Be honest but kind</option>
                <option value="be firm without sounding rude" className="bg-white text-slate-900 dark:text-slate-100">Be firm without sounding rude</option>
                <option value="sound more confident" className="bg-white text-slate-900 dark:text-slate-100">Sound more confident & clear</option>
                <option value="apologize sincerely" className="bg-white text-slate-900 dark:text-slate-100">Apologize sincerely & take accountability</option>
                <option value="ask for money / payment" className="bg-white text-slate-900 dark:text-slate-100">Ask for late payment / invoice</option>
                <option value="set a boundary" className="bg-white text-slate-900 dark:text-slate-100">Set an absolute boundary</option>
                <option value="reject politely" className="bg-white text-slate-900 dark:text-slate-100">Reject politely without false hope</option>
                <option value="stop overexplaining" className="bg-white text-slate-900 dark:text-slate-100">Stop overexplaining my reasons</option>
                <option value="sound less needy" className="bg-white text-slate-900 dark:text-slate-100">Sound less needy / high-anxiety</option>
                <option value="other" className="bg-white text-slate-900 dark:text-slate-100">Other / Custom...</option>
              </select>
            )}
          </div>
        </div>

        {/* Extra Context Box */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-900 dark:text-slate-100 font-semibold">Extra Situational Context <span className="opacity-40 font-light">(Optional)</span></label>
          <input
            type="text"
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="e.g., 'This is my 3rd follow up request' or 'We dated for 2 weeks'"
            className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {/* Target Send Language Selection (Global & Local Translation) */}
        <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-[#10141C] rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-700 dark:text-cyan-400" />
            <label className="text-xs text-slate-900 dark:text-slate-100 font-semibold">Target Send Language</label>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
            Generate all rewrites, line suggestions, strategic feedback, coach advice, and conversational simulations in your chosen global or regional language (e.g., Telugu, Hindi, Tamil, Spanish).
          </p>
          <div className="space-y-2">
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 cursor-pointer font-sans"
            >
              <option value="same">Keep Original Language (Detect / Same as Draft)</option>
              <option value="English">English</option>
              
              <optgroup label="Popular Transliterations (Local/Native words in Latin/English letters)">
                <option value="Hinglish">Hinglish (Hindi in English letters - e.g., "Main raste me hoon")</option>
                <option value="Teluglish">Teluglish (Telugu in English letters - e.g., "Nenu vasthunnanu")</option>
                <option value="Marathish">Marathish (Marathi in English letters - e.g., "Mi rastyat aahe")</option>
                <option value="Benglish">Benglish (Bengali in English letters - e.g., "Ami rasta-y achhi")</option>
                <option value="Tamilish">Tamilish (Tamil in English letters - e.g., "Naan vazhiyila iruken")</option>
              </optgroup>

              <optgroup label="Standard Global / Native Scripts">
                <option value="Spanish">Spanish (Español)</option>
                <option value="Hindi">Hindi (हिन्दी)</option>
                <option value="Marathi">Marathi (मराठी)</option>
                <option value="French">French (Français)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Italian">Italian (Italiano)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Bengali">Bengali (বাংলা)</option>
                <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                <option value="Japanese">Japanese (日本語)</option>
                <option value="Chinese">Chinese (中文)</option>
                <option value="Portuguese">Portuguese (Português)</option>
                <option value="Arabic">Arabic (العربية)</option>
                <option value="Russian">Russian (Русский)</option>
              </optgroup>
              <option value="custom">Other Local / Global Language...</option>
            </select>

            {targetLanguage === 'custom' && (
              <input
                type="text"
                value={customLanguageText}
                onChange={(e) => setCustomLanguageText(e.target.value)}
                placeholder="Type any language (e.g., Kannada, Spanish, Tagalog, Irish)"
                className="w-full p-2.5 rounded-xl bg-white border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 animate-fade-in"
              />
            )}
          </div>
        </div>

        {/* Tone sliders / controls */}
        <div className="space-y-3.5 bg-slate-50 dark:bg-[#10141C] p-4 rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-semibold">Custom Tone Controls</span>
            {userPlan === 'free' && (
              <span className="text-[9px] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                🔒 PRO CALIBRATION
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { key: 'warmth', label: 'Warmth / Empathy' },
              { key: 'directness', label: 'Directness' },
              { key: 'softness', label: 'Softness / Cushioning' },
              { key: 'confidence', label: 'Confidence' },
              { key: 'formality', label: 'Formality' },
              { key: 'emotional_openness', label: 'Emotional Openness' }
            ].map((slider) => (
              <div key={slider.key} className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-900 dark:text-slate-100 font-medium">
                  <span>{slider.label}</span>
                  <span className="font-mono text-cyan-700 dark:text-cyan-400 font-bold">{toneSettings[slider.key as keyof ToneSettings]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  disabled={userPlan === 'free'}
                  value={toneSettings[slider.key as keyof ToneSettings]}
                  onChange={(e) => handleSliderChange(slider.key as keyof ToneSettings, parseInt(e.target.value))}
                  className={`w-full h-1 !bg-[#FAF6CF] rounded appearance-none cursor-pointer ${userPlan === 'free' ? 'opacity-20 cursor-not-allowed' : 'accent-[#1D1818]'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Output Directives */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-semibold">Output Directives</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-900 dark:text-slate-100">
            <button onClick={() => togglePref('bluntFeedback')} className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium">
              {preferences.bluntFeedback ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <span>Blunt critique</span>
            </button>

            <button onClick={() => togglePref('keepShort')} className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium">
              {preferences.keepShort ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <span>Keep it short</span>
            </button>

            <button onClick={() => togglePref('prioritizeKindness')} className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium">
              {preferences.prioritizeKindness ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <span>Prioritize warmth</span>
            </button>

            <button onClick={() => togglePref('avoidCorporate')} className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium">
              {preferences.avoidCorporate ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <span>Avoid corporate speak</span>
            </button>
          </div>

          {/* Dynamic Directive Tags Input */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-900 dark:text-slate-100 block font-bold">Custom Directive Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDirectiveInput}
                onChange={(e) => setNewDirectiveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomDirectiveTag();
                  }
                }}
                placeholder="e.g., 'British spelling' or 'Avoid emojis'"
                className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button 
                onClick={addCustomDirectiveTag}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 hover:bg-emerald-600 dark:bg-emerald-500 hover:text-white transition cursor-pointer"
                title="Add directive tag"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Render directive tags */}
            {customDirectivesList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customDirectivesList.map((tag) => (
                  <span 
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[10px] text-slate-900 dark:text-slate-100 font-mono font-medium"
                  >
                    {tag}
                    <button 
                      onClick={() => removeCustomDirectiveTag(tag)}
                      className="text-[#C97A7A] hover:text-red-600 transition cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="pt-1.5">
              <label className="text-[9px] text-slate-500 dark:text-slate-400 block font-bold">Additional Text Directive</label>
              <input
                type="text"
                value={customDirective}
                onChange={(e) => setCustomDirective(e.target.value)}
                placeholder="e.g., 'Write in the tone of a respectful peer'"
                className="w-full mt-1 p-2 rounded-xl bg-slate-50 dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-xs text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Gemini Intelligence Configuration */}
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-[#10141C] border border-slate-200 dark:border-white/10 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-semibold">Intelligence Strategy</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-900 dark:text-slate-100">
            <button 
              type="button"
              onClick={() => {
                setLowLatency(!lowLatency);
                if (!lowLatency) setThinkingMode(false);
              }} 
              className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium text-left"
            >
              {lowLatency ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <div>
                <p className="font-semibold">Low-Latency Mode</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Ultra-fast responses (3.1-flash-lite)</p>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => {
                setThinkingMode(!thinkingMode);
                if (!thinkingMode) setLowLatency(false);
              }} 
              className="flex items-center gap-2 justify-start hover:text-cyan-700 dark:text-cyan-400 transition cursor-pointer font-medium text-left"
            >
              {thinkingMode ? <ToggleRight className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-900 dark:text-slate-100/20" />}
              <div>
                <p className="font-semibold">High-Thinking Mode</p>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Deep reasoning logic (3.1-pro-preview)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Submit Analyze Button */}
        <Button
          onClick={() => handleAnalyzeClick()}
          disabled={loading || !originalMessage.trim()}
          variant="primary"
          className="w-full py-3.5 flex items-center justify-center gap-2.5 shadow-lg bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md font-semibold transition"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-white dark:text-slate-950 font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calibrating communication strategy...
            </span>
          ) : (
            <span className="flex items-center gap-2 text-white dark:text-slate-950 font-semibold">
              <Sparkles className="w-4 h-4" />
              Check How It Lands
            </span>
          )}
        </Button>
        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 italic leading-normal font-light">
          Guidance provided is strategic communication advice, not legal or therapeutic counsel.
        </p>
      </Card>

      {/* Right panel: Output Diagnostics & Rewrites */}
      <div className="lg:col-span-7 space-y-6">
        
        {loading ? (
          /* Premium editorial skeleton card */
          <Card className="p-8 space-y-8 animate-pulse">
            <div className="space-y-3">
              <div className="h-3 bg-white/5 w-1/4 rounded"></div>
              <div className="h-6 bg-white/5 w-2/3 rounded"></div>
            </div>
            <div className="h-28 bg-white/5 rounded-lg"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-white/5 rounded-lg"></div>
              <div className="h-16 bg-white/5 rounded-lg"></div>
            </div>
            <div className="h-24 bg-white/5 rounded-lg"></div>
          </Card>
        ) : activeAnalysis ? (
          /* Rich Diagnostic Workspace output */
          <div className="space-y-8">
            
            {activeAnalysis.output_json.is_fallback && (
              <div className="bg-[#D29F6F]/10 border border-[#D29F6F]/20 rounded-xl p-4.5 space-y-2 text-xs font-sans text-slate-900 dark:text-slate-100/90 animate-fade-in shadow-[0_0_15px_rgba(210,159,111,0.03)]">
                <div className="flex items-center gap-2 text-[#D29F6F] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-mono tracking-wider text-[10px] uppercase">
                    {activeAnalysis.output_json.api_key_status === 'leaked' 
                      ? 'Gemini API Key Update Required — Offline Strategist Active' 
                      : 'Offline Sovereign Strategist Mode Enabled'}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                  How It Lands is currently utilizing its pre-compiled Offline Sovereign Strategist Engine. Reason: <span className="text-slate-900 dark:text-slate-100 font-normal">{activeAnalysis.output_json.fallback_reason || 'Sandbox rate limit reached'}.</span> All strategic scores, line-by-line analyses, and custom tone rephrasings are fully operational using local heuristic pipelines.
                </p>
              </div>
            )}
            
            {/* ========================================================================= */}
            {/* SECTION 1: SUGGESTED READY-TO-SEND MESSAGES                               */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-slate-200 dark:border-white/10">
                <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-[11px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-bold">
                  RECOMMENDED READY-TO-SEND MESSAGE
                </span>
                <span className="ml-auto text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/10">
                  SUGGESTED DRAFT
                </span>
              </div>

              {/* Strategic Rewrites section card */}
              <Card className="space-y-5 border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.03)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-medium block">STRATEGIC REWRITE PROFILES</span>
                  <div className="flex items-center gap-2">
                    {activeAnalysis.target_language && activeAnalysis.target_language !== 'same' && (
                      <span className="text-[8px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/20 flex items-center gap-1 uppercase tracking-wider">
                        <Globe className="w-3 h-3" /> Targeted: {activeAnalysis.target_language}
                      </span>
                    )}
                    {refiningStatus && (
                      <span className="text-[10px] font-mono text-slate-900 dark:text-slate-100 animate-pulse flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> {refiningStatus}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Profile Card Tabs */}
                <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto gap-2 scrollbar-none pb-1">
                  {activeAnalysis.output_json.rewrites.map((rw) => {
                    const isTargeted = activeAnalysis.target_language && activeAnalysis.target_language !== 'same';
                    return (
                      <button
                        key={rw.type}
                        onClick={() => setActiveRewriteTab(rw.type)}
                        className={`py-2 px-3 text-[10px] font-mono font-medium tracking-wider transition border-b whitespace-nowrap ${
                          activeRewriteTab === rw.type 
                            ? 'border-[#FAF8F5] text-white' 
                            : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {rw.label.toUpperCase()}{isTargeted ? ` (${activeAnalysis.target_language?.toUpperCase()})` : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Active rewrite profile display */}
                {activeAnalysis.output_json.rewrites.map((rw) => {
                  if (rw.type !== activeRewriteTab) return null;
                  return (
                    <div key={rw.type} className="space-y-4 pt-1 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400">Strategy Objective:</span>
                        <p className="text-slate-900 dark:text-slate-100 italic font-light">{rw.description}</p>
                      </div>

                      <div className="bg-slate-50 dark:bg-[#10141C] p-5 rounded border border-slate-200 dark:border-white/10 relative group min-h-[100px] flex flex-col justify-between">
                        {activeAnalysis.target_language && activeAnalysis.target_language !== 'same' && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-mono text-[#00E5FF]/70 bg-[#00E5FF]/5 border border-[#00E5FF]/10 px-1.5 py-0.5 rounded uppercase select-none pointer-events-none">
                            <Globe className="w-2.5 h-2.5" /> {activeAnalysis.target_language}
                          </div>
                        )}
                        <p className="text-slate-900 dark:text-slate-100 text-sm leading-relaxed font-light font-serif select-all pr-12">
                          "{rw.content}"
                        </p>
                        
                        <div className="flex justify-end gap-2 mt-4 flex-wrap">
                          <button 
                            onClick={() => handleAnalyzeRewrite(rw.content)}
                            className="p-2 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/20 hover:bg-[#00E5FF]/20 text-[#00E5FF] transition flex items-center gap-1.5 font-mono text-[9px]"
                            title="Load this rewrite as your main draft to run an analysis check on it"
                          >
                            <Activity className="w-3.5 h-3.5" />
                            <span>ANALYZE THIS VERSION</span>
                          </button>

                          <button 
                            onClick={() => copyToClipboard(rw.content, rw.type)}
                            className="p-2 rounded bg-white/5 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:text-white transition flex items-center gap-1.5 font-mono text-[9px]"
                          >
                            <span>{copiedState === rw.type ? 'COPIED ✓' : 'COPY DRAFT'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Tone adjustment quick actions */}
                      <div className="space-y-2 bg-slate-50 dark:bg-[#10141C] p-4 rounded border border-slate-200 dark:border-white/10">
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">ITERATIVE REFINERS (PRO & PLUS)</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => handleRefine('Make it slightly warmer and more empathetic')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-mono transition cursor-pointer shadow-xs">
                            + Empathy Cushion
                          </button>
                          <button onClick={() => handleRefine('Establish an absolute tighter boundary with firmness')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-mono transition cursor-pointer shadow-xs">
                            + Strict Boundary
                          </button>
                          <button onClick={() => handleRefine('Shorten to maximum clarity essentials')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-mono transition cursor-pointer shadow-xs">
                            + Extreme Conciseness
                          </button>
                          <button onClick={() => handleRefine('Remove any business jargon, talk like a normal person')} className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-[10px] font-mono transition cursor-pointer shadow-xs">
                            + Conversational Flow
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2: DETAILED DIAGNOSTIC ANALYSIS                                   */}
            {/* ========================================================================= */}
            <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 px-1 pb-1.5">
                <Activity className="w-4 h-4 text-[#D29F6F]" />
                <span className="text-[11px] uppercase font-mono tracking-widest text-slate-900 dark:text-slate-100 font-bold">
                  DETAILED COGNITIVE & IMPRESSION ANALYSIS
                </span>
                <span className="ml-auto text-[9px] font-mono text-[#D29F6F] bg-[#D29F6F]/10 px-2 py-0.5 rounded border border-[#D29F6F]/10">
                  DIAGNOSTIC REPORT
                </span>
              </div>

              {/* Top overview card */}
              <Card className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono text-slate-500 dark:text-slate-400 tracking-widest block font-medium">STRATEGIC IMPRESSION REPORT</span>
                  <h3 className="text-lg font-serif font-medium text-slate-900 dark:text-slate-100">Communication Intelligence</h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded text-[10px] font-mono tracking-wider font-semibold uppercase ${
                    activeAnalysis.output_json.summary.landing_status === 'well' ? 'bg-[#3E6F58]/10 text-[#3E6F58] border border-[#3E6F58]/20' :
                    activeAnalysis.output_json.summary.landing_status === 'risky' || activeAnalysis.output_json.summary.landing_status === 'neutral' ? 'bg-[#D29F6F]/10 text-[#D29F6F] border border-[#D29F6F]/20' :
                    'bg-[#C97A7A]/10 text-[#C97A7A] border border-[#C97A7A]/20'
                  }`}>
                    Landing: {activeAnalysis.output_json.summary.landing_status}
                  </span>
                  
                  <button 
                    onClick={handleSaveToggle}
                    className={`p-2 rounded border transition ${
                      savedVaultStatus 
                        ? 'bg-[#3E6F58]/10 border-[#3E6F58]/30 text-slate-900 dark:text-slate-100' 
                        : 'bg-slate-50 dark:bg-[#10141C] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-white hover:bg-slate-50 dark:bg-[#10141C]/80'
                    }`}
                    title={savedVaultStatus ? 'Saved to Vault' : 'Save to Vault'}
                  >
                    <Bookmark className={`w-4 h-4 ${savedVaultStatus ? 'fill-white text-white' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 font-sans text-xs text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                <p>{activeAnalysis.output_json.summary.overall_read}</p>
              </div>

              <div className="bg-slate-50 dark:bg-[#10141C] p-4 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono uppercase tracking-wider block">RECOMMENDED MOVE</span>
                  <p className="text-xs font-serif font-light text-slate-900 dark:text-slate-100 italic">{activeAnalysis.output_json.summary.recommended_move}</p>
                </div>
                {activeAnalysis.output_json.send_recommendation?.time_advice && (
                  <div className="text-right text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-slate-200 dark:border-white/10">
                    ⏱ {activeAnalysis.output_json.send_recommendation.time_advice}
                  </div>
                )}
              </div>

              {/* Explicit large Save Button requested by user */}
              <button
                onClick={handleSaveToggle}
                className={`w-full py-3 px-4 rounded border text-xs font-mono font-medium tracking-wide transition flex items-center justify-center gap-2 ${
                  savedVaultStatus 
                    ? 'bg-[#3E6F58]/10 border-[#3E6F58]/20 text-slate-900 dark:text-slate-100' 
                    : 'bg-slate-50 dark:bg-[#10141C] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#10141C]/80 hover:border-slate-300 dark:border-white/20'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${savedVaultStatus ? 'fill-white text-white' : ''}`} />
                <span>{savedVaultStatus ? 'SAVED TO PERSONAL VAULT' : 'SAVE MESSAGE ANALYSIS TO VAULT'}</span>
              </button>
            </Card>

            {/* Interpersonal Scores (Communication Fingerprint / Message DNA) */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-medium block">COMMUNICATION FINGERPRINT</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeAnalysis.output_json.scores.map((score, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-[#1A202C]/60 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-center space-y-2 shadow">
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 block font-sans font-light leading-tight">{score.dimension}</span>
                    
                    {/* Linear indicator */}
                    <div className="space-y-1">
                      <span className={`text-xl font-serif font-light block ${
                        score.score >= 70 ? 'text-[#3E6F58]' : 
                        score.score >= 40 ? 'text-[#D29F6F]' : 'text-[#C97A7A]'
                      }`}>
                        {score.score}%
                      </span>
                      <div className="w-full bg-slate-50 dark:bg-[#10141C] h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            score.score >= 70 ? 'bg-[#3E6F58]' : 
                            score.score >= 40 ? 'bg-[#D29F6F]' : 'bg-[#C97A7A]'
                          }`}
                          style={{ width: `${score.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed font-light font-sans">{score.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Gated Risk Heatmap (Plus gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.riskHeatmap} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'riskHeatmap', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <Activity className="w-4 h-4 text-[#C97A7A]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-semibold block">Interactive Risk Heatmap Highlights</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-light leading-relaxed">
                  Latent friction risks, cognitive defensive blocks, and passive-aggressive indicators mapped to specific terms.
                </p>
                
                <div className="bg-slate-50 dark:bg-[#10141C] p-4 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-sans leading-relaxed space-y-3">
                  <div className="text-xs font-light text-slate-900 dark:text-slate-100/90 leading-relaxed">
                    "I <span className="bg-[#C97A7A]/20 text-[#C97A7A] px-1 rounded border border-[#C97A7A]/15 cursor-help" title="Passive-aggressive opening: reduces promptness confidence.">just wanted to follow up</span> on the project deliverables. I was hoping you could give an update, <span className="bg-[#D29F6F]/20 text-[#D29F6F] px-1 rounded border border-[#D29F6F]/15 cursor-help" title="Defensive buffer: signals apprehension or lack of expectation rigidity.">if it's not too much trouble</span>, since we're already late."
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-50 dark:bg-[#1A202C]/60 p-2.5 rounded-lg border border-red-950/20 flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 bg-[#C97A7A] rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-[#C97A7A] font-bold block">SUBMISSIVE / APOLOGETIC APERTURE</span>
                        Signals lack of authority; invites negotiation or postponement.
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#1A202C]/60 p-2.5 rounded-lg border border-orange-950/20 flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 bg-[#D29F6F] rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-[#D29F6F] font-bold block">COGNITIVE DEFENSIVE SHIELD</span>
                        Buffers the request unnecessarily, making the boundary feel optional.
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Gated Emotional Blueprint Map (Plus gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.emotionalBlueprint} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'emotionalBlueprint', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-semibold block">Emotional Blueprint Timeline Map</span>
                  </div>
                  {activeSentenceIndex !== null && (
                    <button 
                      onClick={() => setActiveSentenceIndex(null)}
                      className="text-[9px] font-mono text-[#00E5FF] hover:underline"
                    >
                      RESET HIGHLIGHT
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-light leading-relaxed">
                  Sentence-by-sentence psychological waves mapping empathy calibration against formal rigidity. Hover or click nodes to isolate individual line metrics.
                </p>
                
                <div className="w-full h-48 bg-slate-50 dark:bg-[#10141C] rounded-xl border border-slate-200 dark:border-white/10 p-4 relative overflow-hidden flex flex-col justify-between font-mono">
                  {/* Visual zone labels on the left margin */}
                  <div className="absolute left-3 top-10 text-[7px] text-[#3E6F58] tracking-widest font-mono uppercase select-none pointer-events-none opacity-50">
                    ▲ Empathetic Calibration
                  </div>
                  <div className="absolute left-3 bottom-10 text-[7px] text-[#C97A7A] tracking-widest font-mono uppercase select-none pointer-events-none opacity-50">
                    ▼ Latent Risk / Triggers
                  </div>

                  {/* Timeline segment headers */}
                  <div className="flex justify-between text-[8px] text-[#888] pb-1 border-b border-slate-200 dark:border-white/10 z-10">
                    <span>START OF DRAFT</span>
                    <span>MID-STREAM CALIBRATION</span>
                    <span>CLOSING IMPACT</span>
                  </div>
                  
                  {/* Dynamic SVG Map container */}
                  <div className="flex-1 relative min-h-[80px] w-full mt-2">
                    {(() => {
                      const lines = activeAnalysis.output_json.line_by_line || [];
                      if (lines.length === 0) {
                        return (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/30 font-mono">
                            Analyze a message draft to generate your Blueprint.
                          </div>
                        );
                      }

                      // Generate coordinates
                      const pointsSafety = lines.map((item, idx) => {
                        const x = lines.length > 1 ? 15 + (idx / (lines.length - 1)) * 370 : 200;
                        let y = 40;
                        if (item.type === 'strength') y = 18;
                        else if (item.type === 'risk') y = 62;
                        return { x, y };
                      });

                      const pointsRisk = lines.map((item, idx) => {
                        const x = lines.length > 1 ? 15 + (idx / (lines.length - 1)) * 370 : 200;
                        let y = 45;
                        if (item.type === 'risk') y = 22;
                        else if (item.type === 'strength') y = 68;
                        return { x, y };
                      });

                      const generatePath = (pts: {x: number, y: number}[]) => {
                        if (pts.length === 0) return '';
                        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L 400 ${pts[0].y}`;
                        let d = `M ${pts[0].x} ${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                          const p0 = pts[i];
                          const p1 = pts[i + 1];
                          const cpX1 = p0.x + (p1.x - p0.x) / 3;
                          const cpY1 = p0.y;
                          const cpX2 = p0.x + 2 * (p1.x - p0.x) / 3;
                          const cpY2 = p1.y;
                          d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
                        }
                        return d;
                      };

                      const safetyPath = generatePath(pointsSafety);
                      const riskPath = generatePath(pointsRisk);

                      return (
                        <>
                          <svg className="w-full h-full absolute inset-0 overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="warmthGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#D29F6F" stopOpacity="0.8" />
                                <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.9" />
                                <stop offset="100%" stopColor="#3E6F58" stopOpacity="0.8" />
                              </linearGradient>
                              <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#C97A7A" stopOpacity="0.2" />
                                <stop offset="60%" stopColor="#C97A7A" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#C97A7A" stopOpacity="0.1" />
                              </linearGradient>
                            </defs>
                            
                            {/* Horizontal visual baselines & grids for measurement */}
                            <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
                            <line x1="0" y1="18" x2="400" y2="18" stroke="rgba(0,229,255,0.04)" strokeWidth="1" />
                            <line x1="0" y1="62" x2="400" y2="62" stroke="rgba(201,122,122,0.04)" strokeWidth="1" />
                            
                            {/* SVG Paths */}
                            <path d={safetyPath} fill="none" stroke="url(#warmthGrad)" strokeWidth="2.5" className="drop-shadow-[0_0_6px_rgba(0,229,255,0.3)] transition-all duration-300" />
                            <path d={riskPath} fill="none" stroke="url(#riskGrad)" strokeWidth="1.5" strokeDasharray="3 3" className="transition-all duration-300" />
                            
                            {/* Highlight connectors for the active node */}
                            {activeSentenceIndex !== null && pointsSafety[activeSentenceIndex] && (
                              <line 
                                x1={pointsSafety[activeSentenceIndex].x} 
                                y1={0} 
                                x2={pointsSafety[activeSentenceIndex].x} 
                                y2={80} 
                                stroke="#00E5FF" 
                                strokeWidth="0.5" 
                                strokeDasharray="1 3"
                                className="animate-pulse"
                              />
                            )}
                          </svg>

                          {/* Render HTML elements layered on top of SVG */}
                          {pointsSafety.map((pt, index) => {
                            const isNodeActive = activeSentenceIndex === index;
                            const item = lines[index];
                            const isStrength = item.type === 'strength';
                            const isRisk = item.type === 'risk';
                            
                            let nodeStyleClasses = 'bg-slate-50 dark:bg-[#1A202C]/60 border border-slate-200 dark:border-white/100 hover:border-[#00E5FF] hover:scale-125';
                            if (isStrength) {
                              nodeStyleClasses = 'bg-[#3E6F58] border border-[#3E6F58]/50 hover:border-[#00E5FF] hover:bg-[#00E5FF] hover:scale-125';
                            } else if (isRisk) {
                              nodeStyleClasses = 'bg-[#C97A7A] border border-[#C97A7A]/50 hover:border-red-400 hover:bg-rose-500 hover:scale-125';
                            }
                            
                            const activeGlow = isStrength 
                              ? 'shadow-[0_0_12px_rgba(0,229,255,0.9)] bg-[#00E5FF] border-2 border-white' 
                              : isRisk 
                              ? 'shadow-[0_0_12px_rgba(244,63,94,0.9)] bg-rose-500 border-2 border-white' 
                              : 'shadow-[0_0_12px_rgba(255,255,255,0.6)] bg-white border-2 border-white';

                            return (
                              <button
                                key={index}
                                onMouseEnter={() => setActiveSentenceIndex(index)}
                                onClick={() => setActiveSentenceIndex(index)}
                                className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 group/node focus:outline-none cursor-pointer"
                                style={{
                                  left: `${(pt.x / 400) * 100}%`,
                                  top: `${(pt.y / 80) * 100}%`,
                                }}
                              >
                                {/* Circle Node */}
                                <div className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                                  isNodeActive 
                                    ? `w-4.5 h-4.5 ${activeGlow} scale-110 z-30` 
                                    : `w-3 h-3 ${nodeStyleClasses} z-20`
                                }`}>
                                  {isNodeActive && (
                                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                                  )}
                                </div>
                              </button>
                            );
                          })}

                          {/* Hover Tooltip Overlay (Kept simple, as full details are below) */}
                          {activeSentenceIndex !== null && lines[activeSentenceIndex] && (
                            <div 
                              className="absolute bg-slate-50 dark:bg-[#1A202C]/60/95 border border-[#00E5FF]/40 px-2.5 py-1.5 rounded-lg text-[9px] text-white shadow-xl pointer-events-none z-30 max-w-[180px] transition-all duration-200"
                              style={{
                                  left: `${Math.min(80, Math.max(20, (pointsSafety[activeSentenceIndex]?.x / 400) * 100))}%`,
                                  top: '5px',
                                  transform: 'translateX(-50%)',
                              }}
                            >
                              <div className="font-mono text-[8px] text-[#00E5FF] uppercase font-bold mb-0.5 flex justify-between items-center gap-1.5">
                                <span>Sentence {activeSentenceIndex + 1}</span>
                                <span className={`px-1 py-0.2 rounded text-[7px] uppercase ${
                                  lines[activeSentenceIndex].type === 'risk' 
                                    ? 'bg-[#C97A7A]/20 text-[#C97A7A]' 
                                    : lines[activeSentenceIndex].type === 'strength' 
                                    ? 'bg-[#3E6F58]/20 text-[#3E6F58]' 
                                    : 'bg-white/10 text-white/60'
                                }`}>
                                  {lines[activeSentenceIndex].type || 'neutral'}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Legend */}
                  <div className="flex gap-4 justify-center text-[8px] pt-1 border-t border-slate-200 dark:border-white/10 z-10">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full"></div>
                      <span className="text-slate-600 dark:text-slate-300/80">Psychological Safety Wave</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-[#C97A7A] rounded-full border border-dashed border-slate-300 dark:border-white/20"></div>
                      <span className="text-slate-600 dark:text-slate-300/80">Latent Triggers</span>
                    </div>
                  </div>
                </div>

                {/* Highly Understandable Active Sentence Detail Box */}
                {(() => {
                  const lines = activeAnalysis.output_json.line_by_line || [];
                  const activeItem = activeSentenceIndex !== null ? lines[activeSentenceIndex] : null;
                  
                  if (!activeItem) {
                    return (
                      <div className="bg-slate-50 dark:bg-[#10141C]/40 border border-slate-200 dark:border-white/10 rounded-xl p-4 text-center select-none text-slate-600 dark:text-slate-300/40">
                        <p className="text-xs font-light font-sans">
                          💡 Click or hover any coordinate node on the wave map above to analyze that specific sentence.
                        </p>
                      </div>
                    );
                  }

                  const typeColors = activeItem.type === 'risk'
                    ? { bg: 'bg-[#C97A7A]/10', text: 'text-[#C97A7A]', border: 'border-[#C97A7A]/20', label: 'Latent Trigger Detected' }
                    : activeItem.type === 'strength'
                    ? { bg: 'bg-[#3E6F58]/10', text: 'text-[#3E6F58]', border: 'border-[#3E6F58]/20', label: 'Constructive Alignment' }
                    : { bg: 'bg-white/5', text: 'text-slate-900 dark:text-slate-100/60', border: 'border-slate-200 dark:border-white/10', label: 'Neutral & Balanced' };

                  return (
                    <div className="bg-slate-50 dark:bg-[#10141C]/60 border border-slate-200 dark:border-white/10 rounded-xl p-4.5 space-y-3 font-sans transition-all duration-300">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                        <span className="text-[9px] font-mono text-white/40 tracking-wider">
                          DETAILED VIEW: SENTENCE {activeSentenceIndex + 1} OF {lines.length}
                        </span>
                        <div className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded border ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}>
                          {activeItem.tag ? `${activeItem.tag.toUpperCase()} — ${typeColors.label.toUpperCase()}` : typeColors.label.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-[#00E5FF]/60 uppercase tracking-wider block">Draft Phrase</span>
                        <p className="text-sm italic font-serif text-slate-900 dark:text-slate-100 leading-relaxed pl-3 border-l-2 border-[#00E5FF]/30">
                          "{activeItem.line}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Psychological Impact</span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-light leading-relaxed">
                            {activeItem.feedback}
                          </p>
                        </div>
                        {activeItem.suggestion && (
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono text-[#00E5FF]/60 uppercase tracking-wider block font-semibold">Suggested Improvement</span>
                              <button
                                onClick={() => handleAnalyzeRewrite(activeItem.suggestion)}
                                className="text-[8px] font-mono text-[#00E5FF]/80 hover:text-[#00E5FF] hover:underline uppercase flex items-center gap-1 transition cursor-pointer"
                                title="Analyze this suggestion version"
                              >
                                <Activity className="w-2.5 h-2.5" /> Analyze Suggestion
                              </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#1A202C]/60/60 border border-slate-200 dark:border-white/10 rounded-lg p-2.5">
                              <p className="text-xs italic text-white/95">
                                "{activeItem.suggestion}"
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </Card>
            </LockedFeatureOverlay>

            {/* Gated Likely Interpretation Diagnostics (Plus gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.likelyInterpretation} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'likelyInterpretation', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <Compass className="w-4 h-4 text-[#D29F6F]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-semibold block">Likely Interpretation Diagnostics</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-light leading-relaxed">
                  How the recipient is structurally projected to digest this draft, with clear subtext and invitation summaries.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="bg-slate-50 dark:bg-[#10141C] p-4 rounded border border-slate-200 dark:border-white/10 space-y-1">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block uppercase">Likely Subtext</span>
                    <p className="text-slate-900 dark:text-slate-100 leading-relaxed italic font-light">
                      "{activeAnalysis.output_json.how_it_may_be_read?.subtext || 'Unintentionally signaling doubt or hesitation.'}"
                    </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-[#10141C] p-4 rounded border border-slate-200 dark:border-white/10 space-y-1">
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block uppercase">Invited Response Pattern</span>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-light">
                      {activeAnalysis.output_json.how_it_may_be_read?.invited_responses || 'Likely to query terms, negotiate delay, or push boundary.'}
                    </p>
                  </div>
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Side-by-side Diagnostic Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="space-y-3">
                <span className="text-[9px] uppercase font-mono text-[#3E6F58] tracking-wider font-semibold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#3E6F58] rounded-full" />
                  What's Working
                </span>
                <ul className="space-y-2">
                  {activeAnalysis.output_json.whats_working.map((w, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 font-sans font-light">
                      <span className="text-[#3E6F58] font-bold mt-0.5">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card className="space-y-3">
                <span className="text-[9px] uppercase font-mono text-[#C97A7A] tracking-wider font-semibold block flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#C97A7A] rounded-full" />
                  Risk Factors
                </span>
                <ul className="space-y-2">
                  {activeAnalysis.output_json.whats_risky.map((r, idx) => (
                    <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 font-sans font-light">
                      <span className="text-[#C97A7A] font-bold mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Sentence-by-sentence Critique Editor */}
            <Card className="space-y-5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-medium block">LINE-BY-LINE CRITIQUE & ANNOTATIONS</span>
              
              <div className="space-y-4">
                {activeAnalysis.output_json.line_by_line?.map((item, idx) => {
                  const isActive = activeSentenceIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setActiveSentenceIndex(idx)}
                      className={`border-l-2 pl-4 py-2.5 space-y-2 text-xs font-sans transition cursor-pointer rounded-r-xl px-3 ${
                        isActive 
                          ? 'border-[#00E5FF] bg-[#00E5FF]/5 shadow-[0_0_15px_rgba(0,229,255,0.02)]' 
                          : 'border-slate-200 dark:border-white/10 hover:border-white/25 hover:bg-white/5'
                      }`}
                    >
                      <p className="text-slate-900 dark:text-slate-100 italic font-light font-serif text-sm">"{item.line}"</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.tag && (
                          <span className={`text-[8px] font-mono font-medium px-1.5 py-0.5 rounded tracking-wide uppercase ${
                            item.type === 'risk' 
                              ? 'bg-[#C97A7A]/10 text-[#C97A7A] border border-[#C97A7A]/15' 
                              : 'bg-[#3E6F58]/10 text-[#3E6F58] border border-[#3E6F58]/15'
                          }`}>
                            {item.tag}
                          </span>
                        )}
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-light">{item.feedback}</p>
                      </div>
                      {item.suggestion && (
                        <p className="text-[11px] text-slate-900 dark:text-slate-100/80 font-light flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded border border-slate-200 dark:border-white/10">
                          <span>Alternative phrasing: <span className="text-white italic">"{item.suggestion}"</span></span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Gated AI Communication Coach (Pro gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.communicationCoach} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'communicationCoach', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-semibold block">Sovereign AI Communication Coach</span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 font-medium">
                      Multi-Turn Continuous ({coachChat.filter(m => m.role === 'user').length} turns)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetCoachChat}
                    title="Start fresh conversation thread"
                    className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-slate-200 transition-colors px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10 hover:border-[#00E5FF]/40 bg-white/5"
                  >
                    <RotateCcw className="w-3 h-3 text-[#00E5FF]" />
                    <span>Reset Chat</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-light leading-relaxed">
                  Real-time multi-turn dialogue with continuous context memory. Ask for revisions, tone shifts, translations, or tactical adjustments across consecutive turns.
                </p>
                
                <div className="bg-slate-50 dark:bg-[#10141C] rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col min-h-[340px] max-h-[480px]">
                  {/* Chat history */}
                  <div className="flex-1 p-4 space-y-3.5 overflow-y-auto text-xs font-sans scrollbar-thin">
                    {coachChat.map((msg, idx) => {
                      const isUser = msg.role === 'user';
                      let mainText = msg.message;
                      let extractedRewrite = msg.suggestedRewrite;

                      // Parse JSON if response was formatted as JSON
                      if (!isUser && typeof mainText === 'string' && mainText.trim().startsWith('{') && mainText.trim().endsWith('}')) {
                        try {
                          const parsed = JSON.parse(mainText);
                          mainText = parsed.response || parsed.coachResponse || parsed.advice || parsed.message || parsed.coaching_advice || parsed.text || mainText;
                          if (!extractedRewrite) {
                            extractedRewrite = parsed.quoted_rewrite || parsed.rewrite || parsed.alternative || parsed.suggested_rewrite || parsed.suggestedRewrite;
                          }
                        } catch {
                          // keep raw
                        }
                      }

                      // Check if main text contains a quoted rewrite if not explicitly separated
                      if (!extractedRewrite && !isUser && typeof mainText === 'string') {
                        const quoteMatch = mainText.match(/"([^"]{15,})"/);
                        if (quoteMatch && quoteMatch[1]) {
                          extractedRewrite = quoteMatch[1];
                        }
                      }

                      return (
                        <div key={msg.id || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3.5 rounded-xl max-w-[88%] leading-relaxed ${
                            isUser 
                              ? 'bg-[#00E5FF]/15 border border-[#00E5FF]/30 text-white' 
                              : 'bg-white dark:bg-[#1A202C]/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 shadow-sm'
                          }`}>
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                              <span className="text-[9px] font-mono uppercase tracking-wider font-semibold text-slate-400 dark:text-white/40">
                                {isUser ? 'YOU' : 'SOVEREIGN COACH'}
                              </span>
                              {msg.timestamp && (
                                <span className="text-[8px] font-mono text-slate-400 dark:text-white/30">
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-light whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-100">
                              {mainText}
                            </p>

                            {extractedRewrite && (
                              <div className="mt-3 p-3 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-[#00E5FF]/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#00E5FF] font-semibold flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-[#00E5FF]" />
                                    Suggested Rewrite
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyCoachRewrite(extractedRewrite!, msg.id)}
                                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-white/10 hover:bg-[#00E5FF]/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition-colors"
                                      title="Copy rewrite to clipboard"
                                    >
                                      {coachCopiedId === msg.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span className="text-emerald-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAnalyzeRewrite(extractedRewrite!)}
                                      className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 text-[#00E5FF] border border-[#00E5FF]/40 transition-colors"
                                      title="Set as main draft and re-analyze"
                                    >
                                      <CornerDownRight className="w-3 h-3" />
                                      <span>Apply Draft</span>
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs italic text-slate-900 dark:text-slate-100 font-medium leading-relaxed bg-white/40 dark:bg-black/20 p-2 rounded border border-slate-200 dark:border-white/5">
                                  "{extractedRewrite.replace(/^["“”]|["“”]$/g, '').trim()}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {coachLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-[#1A202C]/80 border border-[#00E5FF]/30 p-3.5 rounded-xl max-w-[85%] text-xs font-mono text-slate-600 dark:text-[#00E5FF] animate-pulse flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 animate-spin text-[#00E5FF]" />
                          <span>Consulting sovereign coaching engine across conversation turns...</span>
                        </div>
                      </div>
                    )}

                    <div ref={coachChatEndRef} />
                  </div>

                  {/* Error Notification with Retry */}
                  {coachError && (
                    <div className="mx-3 my-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{coachError}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const lastUser = [...coachChat].reverse().find(m => m.role === 'user');
                          if (lastUser) handleCoachSend(lastUser.message);
                        }} 
                        className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded text-rose-200 text-[11px] font-medium transition cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Quick Tactical Prompt Chips */}
                  <div className="px-3 pt-2 pb-1 bg-slate-100 dark:bg-[#131517] border-t border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <span className="text-[9px] font-mono text-slate-400 dark:text-white/40 uppercase tracking-wider shrink-0 mr-1">
                      Quick Shifts:
                    </span>
                    {[
                      'Make this message more professional',
                      'Make it slightly warmer',
                      'Translate that into Telugu',
                      'Make it shorter',
                      'Make it more empathetic'
                    ].map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        disabled={coachLoading}
                        onClick={() => handleCoachSend(promptText)}
                        className="text-[10px] font-sans px-2.5 py-1 rounded-full bg-white dark:bg-white/5 hover:bg-[#00E5FF]/10 text-slate-700 dark:text-slate-300 hover:text-[#00E5FF] border border-slate-200 dark:border-white/10 hover:border-[#00E5FF]/30 transition shrink-0 whitespace-nowrap disabled:opacity-50"
                      >
                        {promptText}
                      </button>
                    ))}
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handleCoachSend} className="p-3 bg-slate-100 dark:bg-[#131517] flex gap-2 border-t border-slate-200 dark:border-white/10">
                    <input 
                      type="text" 
                      value={coachInput}
                      onChange={(e) => setCoachInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCoachSend();
                        }
                      }}
                      placeholder="Ask the coach, e.g., 'Make it warmer', 'Translate into Telugu', 'Shorten it'..."
                      className="flex-1 bg-white dark:bg-[#1A202C]/60 text-xs text-slate-900 dark:text-white rounded-xl px-4 py-2.5 focus:outline-none border border-slate-300 dark:border-white/10 focus:border-[#00E5FF]/60 placeholder-slate-400 dark:placeholder-white/30"
                    />
                    <button 
                      type="submit"
                      disabled={coachLoading || !coachInput.trim()}
                      className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 disabled:opacity-40 disabled:cursor-not-allowed text-black p-2.5 rounded-xl transition flex items-center justify-center cursor-pointer shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Gated Scenario Tree Simulator (Pro gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.scenarioSimulator} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'scenarioSimulator', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                  <Compass className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-semibold block">Scenario Tree Simulator</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans font-light leading-relaxed">
                  Interactively simulate multiple turns of potential recipient pushbacks and replies.
                </p>
                
                <div className="bg-slate-50 dark:bg-[#1E293B] p-5 rounded-xl border border-slate-300 dark:border-slate-700 space-y-4 font-sans text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2 font-mono text-[9px] text-slate-600 dark:text-slate-400 font-semibold">
                    <span>SIMULATION MATRIX</span>
                    <span>{simulationLoading ? 'PROCESSING...' : simulatorStep === 0 ? 'STEP 1 OF 2: CHOOSE MOVE' : 'STEP 2 OF 2: PROJECTED TRAJECTORY'}</span>
                  </div>
                  
                  {simulatorStep === 0 && (
                    <div className="space-y-3">
                      <div className="p-3.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 rounded-xl shadow-xs">
                        <span className="text-[9px] text-sky-700 dark:text-[#00E5FF] font-mono block uppercase font-bold tracking-wider">CHOOSE YOUR STRATEGIC FIRST MOVE</span>
                        <p className="text-slate-900 dark:text-slate-100 mt-1 leading-normal font-medium text-xs">How do you want to play this initial communication anchor?</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button 
                          onClick={() => handleSimulateMove('anchoring_firmly', 'Anchoring Firmly')} 
                          className="p-3.5 bg-white hover:bg-slate-50 dark:bg-[#151B28] dark:hover:bg-[#273449] border border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-cyan-400 rounded-xl text-left transition shadow-xs cursor-pointer group"
                        >
                          <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-sky-700 dark:group-hover:text-cyan-400 transition">Anchoring Firmly</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-light leading-snug">State boundary or terms directly without hedging; request signature.</p>
                        </button>
                        <button 
                          onClick={() => handleSimulateMove('value_framing', 'Value Framing First')} 
                          className="p-3.5 bg-white hover:bg-slate-50 dark:bg-[#151B28] dark:hover:bg-[#273449] border border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-cyan-400 rounded-xl text-left transition shadow-xs cursor-pointer group"
                        >
                          <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-sky-700 dark:group-hover:text-cyan-400 transition">Value Framing First</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-light leading-snug">Explain the ROI and mutual context prior to declaring boundaries or terms.</p>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {simulatorStep === 1 && (
                    <div className="space-y-3">
                      {simulationLoading ? (
                        <div className="p-6 text-center space-y-2">
                          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-slate-600 dark:text-slate-300 text-xs font-mono">Simulating recipient cognitive reaction & conversational trajectory...</p>
                        </div>
                      ) : (
                        <>
                          <div className={`p-3.5 rounded-xl shadow-xs border ${
                            simulationData?.emotionalStatus === 'defensive' 
                              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/40' 
                              : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40'
                          }`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`text-[9px] font-mono uppercase font-bold tracking-wider ${
                                simulationData?.emotionalStatus === 'defensive' ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                              }`}>
                                PROJECTED RECIPIENT {simulationData?.emotionalStatus === 'defensive' ? 'PUSHBACK / OBJECTION' : 'COOPERATION / AGREEMENT'} ({simulationData?.moveLabel})
                              </span>
                            </div>
                            <p className="text-slate-900 dark:text-slate-100 mt-1 leading-normal font-medium text-xs">
                              {simulationData?.projectedReaction}
                            </p>
                          </div>
                          
                          {simulationData?.coachTip && (
                            <div className="p-3 bg-white dark:bg-[#151B28] border border-emerald-300 dark:border-emerald-800/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 font-mono flex items-start gap-1.5 shadow-xs">
                              <span className="mt-0.5 font-bold">•</span>
                              <span>{simulationData.coachTip}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-1">
                            <button 
                              onClick={() => { setSimulatorStep(0); setSimulationData(null); }} 
                              className="text-[11px] font-mono text-sky-700 hover:text-sky-800 dark:text-[#00E5FF] dark:hover:text-cyan-300 hover:underline font-semibold cursor-pointer"
                            >
                              ← BACK TO FIRST MOVE
                            </button>
                            {simulationData?.projectedReaction && (
                              <button
                                onClick={() => handleAnalyzeRewrite(simulationData.projectedReaction)}
                                className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                              >
                                ANALYZE THIS REPLY →
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Anticipatory response pathways */}
            {activeAnalysis.output_json.follow_ups && activeAnalysis.output_json.follow_ups.length > 0 && (
              <Card className="space-y-4">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-600 dark:text-slate-300 font-medium block">ANTICIPATORY REPLY WORKBOOK</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-light font-sans">If the recipient responds or pushes back, follow these strategic guidelines:</p>
                
                <div className="space-y-3">
                  {activeAnalysis.output_json.follow_ups.map((f, i) => (
                    <div key={i} className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-2 text-xs font-sans shadow-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold block uppercase tracking-wider">IF: {f.condition}</span>
                        <button
                          onClick={() => handleAnalyzeRewrite(f.message)}
                          className="text-[9px] font-mono text-sky-700 hover:text-sky-800 dark:text-[#00E5FF] dark:hover:text-cyan-300 hover:underline uppercase flex items-center gap-1 transition cursor-pointer font-semibold"
                          title="Analyze this reply version"
                        >
                          <Activity className="w-3 h-3" /> Analyze Reply
                        </button>
                      </div>
                      <p className="text-slate-900 dark:text-slate-100 font-serif font-light leading-relaxed italic text-sm">"{f.message}"</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            </div> {/* This closes Section 2's <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-white/10"> */}
          </div>
        ) : (
          /* Empty state - instructions */
          <Card className="p-12 text-center space-y-6 min-h-[480px] flex flex-col justify-center items-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-full flex items-center justify-center shadow-sm">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-xl font-serif font-medium text-slate-900 dark:text-slate-100">Communication Intelligence Panel</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-md">
                Paste your draft, adjust parameters, and trigger analysis. We'll decompose its interpersonal risks, emotional fingerprint, and write highly customized, strategic alternatives.
              </p>
            </div>

            <div className="border-t border-slate-200 dark:border-white/10 pt-6 w-full max-w-sm space-y-3 text-left">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block text-center uppercase tracking-widest font-semibold">START WITH PRESET WORKFLOWS</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  onClick={() => loadDemo('breakup')}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A202C]/60 dark:hover:bg-[#1A202C] border border-slate-200 dark:border-white/10 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition w-full cursor-pointer group shadow-xs"
                >
                  <p className="font-serif font-semibold text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">Boundary Cushion</p>
                  <p className="text-[10px] leading-normal font-sans text-slate-500 dark:text-slate-400">Declining dating/personal loops gracefully.</p>
                </button>
                <button 
                  onClick={() => loadDemo('invoice')}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-[#1A202C]/60 dark:hover:bg-[#1A202C] border border-slate-200 dark:border-white/10 rounded-xl text-left text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition w-full cursor-pointer group shadow-xs"
                >
                  <p className="font-serif font-semibold text-slate-900 dark:text-slate-100 mb-0.5 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition">Billing Authority</p>
                  <p className="text-[10px] leading-normal font-sans text-slate-500 dark:text-slate-400">Requesting overdue payments firmly.</p>
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
