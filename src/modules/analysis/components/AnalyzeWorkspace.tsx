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
  MessageSquare
} from 'lucide-react';
import { Analysis, ToneSettings } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { hasFeatureAccess, FEATURE_GATES } from '../../../lib/subscriptionConfig';
import LockedFeatureOverlay from '../../../components/ui/LockedFeatureOverlay';

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
            const res = await fetch('/api/transcribe', {
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
  const [coachChat, setCoachChat] = useState<Array<{role: 'user' | 'coach', message: string}>>([
    { role: 'coach', message: "Welcome to your Sovereign coaching loop. I've fully parsed your message draft and current scenario context. Ask me any tactical adjustment questions, like: 'What happens if I delay the send by 24 hours?' or 'Can you make this sound 15% more authoritative but keep it professional?'" }
  ]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [simulatorPaths, setSimulatorPaths] = useState<Array<{
    label: string;
    likelihood: string;
    predicted_reply: string;
    what_it_signals: string;
    suggested_next_message: string;
  }> | null>(null);
  const [simulatorLoading, setSimulatorLoading] = useState(false);
  const [simulatorError, setSimulatorError] = useState<string | null>(null);
  const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number | null>(null);
  const coachChatEndRef = useRef<HTMLDivElement | null>(null);
  const coachScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const workspaceTopRef = useRef<HTMLDivElement | null>(null);

  // Full Conversation Rehearsal state — an interactive roleplay: the AI
  // automatically plays the other party and responds turn by turn as the
  // user actually sends messages, rather than pre-scripting a fixed
  // transcript up front.
  const [rehearsalTurns, setRehearsalTurns] = useState<Array<{ speaker: 'user' | 'other'; text: string }>>([]);
  const [rehearsalCounterpartLabel, setRehearsalCounterpartLabel] = useState('The Other Person');
  const [rehearsalLoading, setRehearsalLoading] = useState(false);
  const [rehearsalError, setRehearsalError] = useState<string | null>(null);
  const [rehearsalInput, setRehearsalInput] = useState('');
  const [rehearsalAutoStarted, setRehearsalAutoStarted] = useState(false);
  const rehearsalScrollRef = useRef<HTMLDivElement | null>(null);
  // LockedFeatureOverlay still mounts its children (blurred) for users
  // without access, as a preview of the feature. An effect that
  // auto-fires an AI call on mount must therefore check entitlement
  // itself — otherwise it would burn paid API calls for locked-out users
  // who can't even see the real output.
  const rehearsalAllowed = hasFeatureAccess(userPlan as any, 'scenarioSimulator', trialActive).allowed;

  const handleAnalyzeRewrite = async (newText: string) => {
    setOriginalMessage(newText);
    // Set target language to 'same' since this text is already translated/transliterated
    setTargetLanguage('same');
    setCustomLanguageText('');
    
    // Smooth scroll to the top of the workspace
    if (workspaceTopRef.current) {
      workspaceTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Automatically run the diagnostics analysis on the new text immediately!
    await handleAnalyzeClick(newText);
  };

  // Auto-scroll to bottom of coach chat.
  //
  // The previous version called coachChatEndRef.current?.scrollIntoView()
  // on a zero-height sentinel div. scrollIntoView walks up *every*
  // scrollable ancestor and repositions each one (default block: 'start'
  // when unspecified) — not just the nearest one — so this wasn't just
  // scrolling the small chat box, it was also fighting with the outer
  // page's own scroll container (<main className="... overflow-y-auto">),
  // which could yank the whole page instead of (or in addition to) the
  // chat box, cutting off the input form or the newest message. Setting
  // scrollTop directly on the actual scroll container is fully
  // self-contained — it can only ever affect that one element.
  useEffect(() => {
    const container = coachScrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [coachChat, coachLoading]);

  // Sync Coach chat dynamically when activeAnalysis changes to avoid hardcoded Cynthia name
  useEffect(() => {
    if (activeAnalysis) {
      const recipient = activeAnalysis.relationship_context || relationshipContext || 'the recipient';
      setCoachChat([
        { 
          role: 'coach', 
          message: `Welcome to your Sovereign coaching loop. I've fully parsed your message draft and relationship context with ${recipient}. Ask me any tactical adjustment questions, like: 'What happens if I delay the send by 24 hours?' or 'Can you make this sound 15% more authoritative but keep it professional?'` 
        }
      ]);
    }
  }, [activeAnalysis]);

  // Clear stale simulation results when the underlying message changes —
  // predictions for a previous draft shouldn't linger and look like
  // they're describing the current one.
  useEffect(() => {
    setSimulatorPaths(null);
    setSimulatorError(null);
    setSelectedPathIndex(null);
  }, [activeAnalysis?.id]);

  // Reset AND auto-start the rehearsal in a single effect, keyed only on
  // activeAnalysis?.id. This used to be two separate effects sharing that
  // same dependency — one resetting rehearsalAutoStarted to false, the
  // other checking it to decide whether to fire. On a *second* (or later)
  // analysis, both effects run in the same commit, but the auto-start
  // effect's closure still held the pre-reset value of rehearsalAutoStarted
  // captured at render time — so it would see the stale "already started"
  // flag and skip firing, only catching up one extra render cycle later
  // once the reset had actually propagated. Doing both in one effect body
  // removes that inter-effect race entirely: there's no other effect's
  // state update to race against.
  useEffect(() => {
    setRehearsalTurns([]);
    setRehearsalError(null);
    setRehearsalCounterpartLabel('The Other Person');
    setRehearsalInput('');

    const text = (activeAnalysis?.original_message || originalMessage || '').trim();
    if (!rehearsalAllowed || !text) {
      setRehearsalAutoStarted(false);
      return;
    }
    setRehearsalAutoStarted(true);
    const openingTurn: { speaker: 'user'; text: string } = { speaker: 'user', text };
    setRehearsalTurns([openingTurn]);
    fetchRehearsalReply([openingTurn]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAnalysis?.id, rehearsalAllowed]);

  // Auto-scroll the rehearsal chat to the newest turn, same self-contained
  // scrollTop approach used for the Coach chat above (see the comment on
  // that container for why not scrollIntoView).
  useEffect(() => {
    const container = rehearsalScrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [rehearsalTurns, rehearsalLoading]);

  // Ask the AI to respond as the counterpart to the conversation so far,
  // and append that reply once it comes back.
  const fetchRehearsalReply = async (history: Array<{ speaker: 'user' | 'other'; text: string }>) => {
    setRehearsalLoading(true);
    setRehearsalError(null);
    try {
      const res = await fetch('/api/analysis/rehearse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openingMessage: activeAnalysis?.original_message || originalMessage,
          activeAnalysisId: activeAnalysis?.id,
          relationshipContext: activeAnalysis?.relationship_context || relationshipContext,
          scenario: activeAnalysis?.scenario || scenario,
          userGoal: activeAnalysis?.user_goal || userGoal,
          history
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get a response.');
      }
      setRehearsalCounterpartLabel(data.counterpart_label || 'The Other Person');
      setRehearsalTurns(prev => [...prev, { speaker: 'other', text: data.reply }]);
    } catch (err: any) {
      console.error('Rehearsal request failed:', err);
      setRehearsalError(err.message || 'Something went wrong continuing this rehearsal.');
    } finally {
      setRehearsalLoading(false);
    }
  };

  const handleRehearsalSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rehearsalInput.trim() || rehearsalLoading) return;
    const nextHistory = [...rehearsalTurns, { speaker: 'user' as const, text: rehearsalInput.trim() }];
    setRehearsalInput('');
    setRehearsalTurns(nextHistory);
    await fetchRehearsalReply(nextHistory);
  };

  const handleRestartRehearsal = () => {
    setRehearsalTurns([]);
    setRehearsalError(null);
    setRehearsalCounterpartLabel('The Other Person');
    setRehearsalAutoStarted(false);
    setRehearsalInput('');
  };

  const handleRunSimulation = async () => {
    const textToSimulate = activeAnalysis?.original_message || originalMessage;
    if (!textToSimulate || !textToSimulate.trim() || simulatorLoading) return;

    setSimulatorLoading(true);
    setSimulatorError(null);
    setSelectedPathIndex(null);

    try {
      const res = await fetch('/api/analysis/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSimulate,
          activeAnalysisId: activeAnalysis?.id,
          relationshipContext: activeAnalysis?.relationship_context || relationshipContext
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate conversation simulation.');
      }
      setSimulatorPaths(data.paths || []);
    } catch (err: any) {
      setSimulatorError(err.message || 'Something went wrong running the simulation.');
    } finally {
      setSimulatorLoading(false);
    }
  };

  const handleCoachSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachInput.trim() || coachLoading) return;
    const text = coachInput;
    setCoachInput('');
    setCoachChat(prev => [...prev, { role: 'user', message: text }]);
    setCoachLoading(true);

    try {
      const res = await fetch('/api/analysis/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          activeAnalysisId: activeAnalysis?.id,
          chatHistory: coachChat
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCoachChat(prev => [...prev, { role: 'coach', message: data.coachResponse }]);
      } else {
        setCoachChat(prev => [...prev, { role: 'coach', message: "I had a momentary network gap. Try asking again, or let me know if you want me to rewrite a specific segment!" }]);
      }
    } catch (err) {
      setCoachChat(prev => [...prev, { role: 'coach', message: "I had a momentary network gap. Try asking again, or let me know if you want me to rewrite a specific segment!" }]);
    } finally {
      setCoachLoading(false);
    }
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
        target_language: textToAnalyze === messageText ? 'same' : (targetLanguage === 'custom' ? customLanguageText : targetLanguage)
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
  const handleRefine = (instruction: string) => {
    if (!activeAnalysis) return;
    setRefinementPrompt(instruction);
    setRefiningStatus(`Refining drafts according to strategy: "${instruction}"...`);
    
    // Simulate real-time beautiful premium rewrite response adaptation
    setTimeout(() => {
      setRefiningStatus(null);
      
      // Map active rewrite and append refined touches
      const updatedRewrites = activeAnalysis.output_json.rewrites.map(rw => {
        if (rw.type === activeRewriteTab) {
          return {
            ...rw,
            content: `${rw.content} [Iterative strategy adjustment applied: ${instruction}]`
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
    }, 1500);
  };

  return (
    <div ref={workspaceTopRef} className="message-analyst-workspace grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto p-2">
      
      {/* Left panel: Calibration Console */}
      <Card className="lg:col-span-5 space-y-6">
        <div className="flex justify-between items-center border-b border-[#1D1818]/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E4636]" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#1D1818] font-bold">CONVERSATION CALIBRATION</span>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => loadDemo('breakup')} className="px-2.5 py-1 rounded-lg bg-[#1D1818]/5 border border-[#1D1818]/10 text-[9px] text-[#1D1818] hover:bg-[#1E4636] hover:text-white font-mono transition cursor-pointer">Demo: Breakup</button>
            <button onClick={() => loadDemo('invoice')} className="px-2.5 py-1 rounded-lg bg-[#1D1818]/5 border border-[#1D1818]/10 text-[9px] text-[#1D1818] hover:bg-[#1E4636] hover:text-white font-mono transition cursor-pointer">Demo: Invoice</button>
          </div>
        </div>

        {/* Text Input area */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <label className="text-[#1D1818] font-bold font-sans">Your Message Draft</label>
              {saveStatus === 'saving' && (
                <span className="text-[10px] font-mono text-[#1D1818]/40 flex items-center gap-1">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] font-mono text-[#1E4636] font-semibold flex items-center gap-1 animate-fade-in">
                  ✓ Draft auto-saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {isTranscribing && (
                <span className="text-[10px] font-mono text-[#E85D04] flex items-center gap-1">
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
                    : 'bg-[#1D1818]/5 border border-[#1D1818]/10 text-[#1D1818] hover:text-white hover:bg-[#1E4636] hover:border-transparent'
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
              <span className="text-[#1D1818]/60 font-mono text-[10px]">{originalMessage.length} characters</span>
            </div>
          </div>
          <textarea
            value={originalMessage}
            onChange={(e) => setOriginalMessage(e.target.value)}
            placeholder="Paste your draft text message, email, DM, or client response here... (or click Dictate to speak your mind)"
            className="w-full h-40 p-4 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none resize-none leading-relaxed placeholder-[#1D1818]/40 font-light font-sans"
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
                <span className="text-[10px] text-[#E85D04] flex items-center gap-1.5 font-mono animate-pulse">
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
          <div className="p-3 bg-[#F8F7F4] border border-[#1D1818]/10 rounded-xl space-y-2 mt-2">
            <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-[#1D1818] font-semibold">
              <span>Attach Chat Screenshot (Multimodal Analysis)</span>
              {imagePreview && (
                <button type="button" onClick={clearImage} className="text-[#C97A7A] hover:underline uppercase text-[9px] font-mono cursor-pointer">Remove</button>
              )}
            </div>
            {imagePreview ? (
              <div className="relative w-full h-32 bg-[#1D1818]/5 rounded-lg overflow-hidden flex items-center justify-center border border-[#1D1818]/10">
                <img src={imagePreview} alt="Screenshot preview" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center border border-dashed border-[#1D1818]/15 rounded-xl p-3 cursor-pointer hover:border-[#E85D04] transition group !bg-[#ffedbc]">
                <span className="text-[10px] text-[#1D1818]/60 font-mono group-hover:text-[#E85D04] transition flex items-center gap-1.5">
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
              <label className="text-xs text-[#1D1818] font-bold">Scenario Type</label>
              <button 
                onClick={() => setIsScenarioCustom(!isScenarioCustom)}
                className="text-[10px] font-mono text-[#E85D04] hover:underline uppercase tracking-wide font-semibold cursor-pointer"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 text-xs text-[#1D1818] focus:outline-none focus:border-[#E85D04] cursor-pointer font-sans"
              >
                <option value="general" className="bg-white text-[#1D1818]">General Difficult Conversation</option>
                <option value="breakup" className="bg-white text-[#1D1818]">Breakup / Closure</option>
                <option value="apology" className="bg-white text-[#1D1818]">Apology / Repair</option>
                <option value="boundary" className="bg-white text-[#1D1818]">Boundary / Saying No</option>
                <option value="confession" className="bg-white text-[#1D1818]">Confession / Vulnerable</option>
                <option value="client-money" className="bg-white text-[#1D1818]">Client Payment / Late Fees</option>
                <option value="workplace" className="bg-white text-[#1D1818]">Workplace / Boss Sync</option>
                <option value="friend-conflict" className="bg-white text-[#1D1818]">Friendship Dispute</option>
                <option value="family" className="bg-white text-[#1D1818]">Family Boundary</option>
                <option value="follow-up" className="bg-white text-[#1D1818]">Follow-Up Double Text</option>
                <option value="rejection" className="bg-white text-[#1D1818]">Rejection / Declining Someone</option>
                <option value="other" className="bg-white text-[#1D1818]">Other / Custom...</option>
              </select>
            )}
          </div>

          {/* Relationship Context Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-[#1D1818] font-bold">Relationship Context</label>
              <button 
                onClick={() => setIsRelationshipCustom(!isRelationshipCustom)}
                className="text-[10px] font-mono text-[#E85D04] hover:underline uppercase tracking-wide font-semibold cursor-pointer"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 text-xs text-[#1D1818] focus:outline-none focus:border-[#E85D04] cursor-pointer font-sans"
              >
                <option value="romantic interest" className="bg-white text-[#1D1818]">Romantic Interest</option>
                <option value="partner / ex" className="bg-white text-[#1D1818]">Partner / Ex</option>
                <option value="friend" className="bg-white text-[#1D1818]">Friend</option>
                <option value="family" className="bg-white text-[#1D1818]">Family Member</option>
                <option value="client" className="bg-white text-[#1D1818]">Client / Contractor</option>
                <option value="coworker" className="bg-white text-[#1D1818]">Coworker</option>
                <option value="boss / manager" className="bg-white text-[#1D1818]">Boss / Manager</option>
                <option value="recruiter" className="bg-white text-[#1D1818]">Recruiter</option>
                <option value="other" className="bg-white text-[#1D1818]">Other / Custom...</option>
              </select>
            )}
          </div>

          {/* Strategic Intent / Goal Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-[#1D1818] font-bold">Strategic Intent / Goal</label>
              <button 
                onClick={() => setIsGoalCustom(!isGoalCustom)}
                className="text-[10px] font-mono text-[#E85D04] hover:underline uppercase tracking-wide font-semibold cursor-pointer"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
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
                className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 text-xs text-[#1D1818] focus:outline-none focus:border-[#E85D04] cursor-pointer font-sans"
              >
                <option value="be honest but kind" className="bg-white text-[#1D1818]">Be honest but kind</option>
                <option value="be firm without sounding rude" className="bg-white text-[#1D1818]">Be firm without sounding rude</option>
                <option value="sound more confident" className="bg-white text-[#1D1818]">Sound more confident & clear</option>
                <option value="apologize sincerely" className="bg-white text-[#1D1818]">Apologize sincerely & take accountability</option>
                <option value="ask for money / payment" className="bg-white text-[#1D1818]">Ask for late payment / invoice</option>
                <option value="set a boundary" className="bg-white text-[#1D1818]">Set an absolute boundary</option>
                <option value="reject politely" className="bg-white text-[#1D1818]">Reject politely without false hope</option>
                <option value="stop overexplaining" className="bg-white text-[#1D1818]">Stop overexplaining my reasons</option>
                <option value="sound less needy" className="bg-white text-[#1D1818]">Sound less needy / high-anxiety</option>
                <option value="other" className="bg-white text-[#1D1818]">Other / Custom...</option>
              </select>
            )}
          </div>
        </div>

        {/* Extra Context Box */}
        <div className="space-y-1.5">
          <label className="text-xs text-[#1D1818] font-bold">Extra Situational Context <span className="opacity-40 font-light">(Optional)</span></label>
          <input
            type="text"
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="e.g., 'This is my 3rd follow up request' or 'We dated for 2 weeks'"
            className="w-full p-2.5 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
          />
        </div>

        {/* Target Send Language Selection (Global & Local Translation) */}
        <div className="space-y-3 p-3.5 bg-[#F8F7F4] rounded-xl border border-[#1D1818]/10">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#E85D04]" />
            <label className="text-xs text-[#1D1818] font-bold">Target Send Language</label>
          </div>
          <p className="text-[10px] text-[#1D1818]/60 font-sans leading-relaxed">
            Calibrate and translate the final ready-to-send rewrites into your chosen global or local language (e.g. Hindi, Spanish, Marathi). Analytical feedback remains in English for review.
          </p>
          <div className="space-y-2">
            <select
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white border border-[#1D1818]/15 text-xs text-[#1D1818] focus:outline-none focus:border-[#E85D04] cursor-pointer font-sans"
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
                className="w-full p-2.5 rounded-xl bg-white border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40 animate-fade-in"
              />
            )}
          </div>
        </div>

        {/* Tone sliders / controls */}
        <div className="space-y-3.5 bg-[#F8F7F4] p-4 rounded-xl border border-[#1D1818]/10">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#1D1818] font-bold">Custom Tone Controls</span>
            {userPlan === 'free' && (
              <span className="text-[9px] bg-[#1D1818]/5 border border-[#1D1818]/10 text-[#1D1818] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
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
                <div className="flex justify-between text-[10px] text-[#1D1818] font-medium">
                  <span>{slider.label}</span>
                  <span className="font-mono text-[#E85D04] font-bold">{toneSettings[slider.key as keyof ToneSettings]}%</span>
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
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#1D1818] font-bold">Output Directives</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-[#1D1818]">
            <button onClick={() => togglePref('bluntFeedback')} className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium">
              {preferences.bluntFeedback ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <span>Blunt critique</span>
            </button>

            <button onClick={() => togglePref('keepShort')} className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium">
              {preferences.keepShort ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <span>Keep it short</span>
            </button>

            <button onClick={() => togglePref('prioritizeKindness')} className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium">
              {preferences.prioritizeKindness ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <span>Prioritize warmth</span>
            </button>

            <button onClick={() => togglePref('avoidCorporate')} className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium">
              {preferences.avoidCorporate ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <span>Avoid corporate speak</span>
            </button>
          </div>

          {/* Dynamic Directive Tags Input */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#1D1818] block font-bold">Custom Directive Tags</label>
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
                className="flex-1 p-2 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
              />
              <button 
                onClick={addCustomDirectiveTag}
                className="p-2.5 rounded-xl bg-[#1D1818]/5 border border-[#1D1818]/10 text-[#1D1818] hover:bg-[#1E4636] hover:text-white transition cursor-pointer"
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
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[#1D1818]/5 border border-[#1D1818]/10 text-[10px] text-[#1D1818] font-mono font-medium"
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
              <label className="text-[9px] text-[#1D1818]/60 block font-bold">Additional Text Directive</label>
              <input
                type="text"
                value={customDirective}
                onChange={(e) => setCustomDirective(e.target.value)}
                placeholder="e.g., 'Write in the tone of a respectful peer'"
                className="w-full mt-1 p-2 rounded-xl bg-[#F8F7F4] border border-[#1D1818]/15 focus:border-[#E85D04] text-xs text-[#1D1818] focus:outline-none placeholder-[#1D1818]/40"
              />
            </div>
          </div>
        </div>

        {/* Gemini Intelligence Configuration */}
        <div className="space-y-3 p-4 bg-[#F8F7F4] border border-[#1D1818]/10 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#1D1818] font-bold">Intelligence Strategy</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[11px] text-[#1D1818]">
            <button 
              type="button"
              onClick={() => {
                setLowLatency(!lowLatency);
                if (!lowLatency) setThinkingMode(false);
              }} 
              className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium text-left"
            >
              {lowLatency ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <div>
                <p className="font-semibold">Low-Latency Mode</p>
                <p className="text-[9px] text-[#1D1818]/50">Ultra-fast responses (3.1-flash-lite)</p>
              </div>
            </button>

            <button 
              type="button"
              onClick={() => {
                setThinkingMode(!thinkingMode);
                if (!thinkingMode) setLowLatency(false);
              }} 
              className="flex items-center gap-2 justify-start hover:text-[#E85D04] transition cursor-pointer font-medium text-left"
            >
              {thinkingMode ? <ToggleRight className="w-5 h-5 text-[#1E4636]" /> : <ToggleLeft className="w-5 h-5 text-[#1D1818]/20" />}
              <div>
                <p className="font-semibold">High-Thinking Mode</p>
                <p className="text-[9px] text-[#1D1818]/50">Deep reasoning logic (3.1-pro-preview)</p>
              </div>
            </button>
          </div>
        </div>

        {/* Submit Analyze Button */}
        <Button
          onClick={() => handleAnalyzeClick()}
          disabled={loading || !originalMessage.trim()}
          variant="primary"
          className="w-full py-3.5 flex items-center justify-center gap-2.5 shadow-lg !bg-[#FFDD44] !text-[#000000] hover:!bg-[#e5c110]"
        >
          {loading ? (
            <span className="flex items-center gap-2 !text-[#000000]">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Calibrating communication strategy...
            </span>
          ) : (
            <span className="flex items-center gap-2 !text-[#000000]">
              <Sparkles className="w-4 h-4" />
              Check How It Lands
            </span>
          )}
        </Button>
        <p className="text-[10px] text-center text-[#B5B8BE]/50 italic leading-normal font-light">
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
              <div className="bg-[#D29F6F]/10 border border-[#D29F6F]/20 rounded-xl p-4.5 space-y-2 text-xs font-sans text-[#FAF8F5]/90 animate-fade-in shadow-[0_0_15px_rgba(210,159,111,0.03)]">
                <div className="flex items-center gap-2 text-[#D29F6F] font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-mono tracking-wider text-[10px] uppercase">Offline Sovereign Strategist Mode Enabled</span>
                </div>
                <p className="text-[#B5B8BE] font-light leading-relaxed">
                  How It Lands is currently utilizing its pre-compiled Offline Sovereign Strategist Engine. Reason: <span className="text-[#FAF8F5] font-normal">{activeAnalysis.output_json.fallback_reason || 'Sandbox rate limit reached'}.</span> All strategic scores, line-by-line analyses, and custom tone rephrasings are fully operational using local heuristic pipelines.
                </p>
              </div>
            )}
            
            {/* ========================================================================= */}
            {/* SECTION 1: SUGGESTED READY-TO-SEND MESSAGES                               */}
            {/* ========================================================================= */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1 pb-1.5 border-b border-white/10">
                <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-[11px] uppercase font-mono tracking-widest text-[#FAF8F5] font-bold">
                  RECOMMENDED READY-TO-SEND MESSAGE
                </span>
                <span className="ml-auto text-[9px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/10">
                  SUGGESTED DRAFT
                </span>
              </div>

              {/* Strategic Rewrites section card */}
              <Card className="space-y-5 border border-[#00E5FF]/20 shadow-[0_0_15px_rgba(0,229,255,0.03)]">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-mono tracking-widest text-[#B5B8BE] font-medium block">STRATEGIC REWRITE PROFILES</span>
                  <div className="flex items-center gap-2">
                    {activeAnalysis.target_language && activeAnalysis.target_language !== 'same' && (
                      <span className="text-[8px] font-mono text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-0.5 rounded border border-[#00E5FF]/20 flex items-center gap-1 uppercase tracking-wider">
                        <Globe className="w-3 h-3" /> Targeted: {activeAnalysis.target_language}
                      </span>
                    )}
                    {refiningStatus && (
                      <span className="text-[10px] font-mono text-[#FAF8F5] animate-pulse flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" /> {refiningStatus}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Profile Card Tabs */}
                <div className="flex border-b border-white/5 overflow-x-auto gap-2 scrollbar-none pb-1">
                  {activeAnalysis.output_json.rewrites.map((rw) => {
                    const isTargeted = activeAnalysis.target_language && activeAnalysis.target_language !== 'same';
                    return (
                      <button
                        key={rw.type}
                        onClick={() => setActiveRewriteTab(rw.type)}
                        className={`py-2 px-3 text-[10px] font-mono font-medium tracking-wider transition border-b whitespace-nowrap ${
                          activeRewriteTab === rw.type 
                            ? 'border-[#FAF8F5] text-white' 
                            : 'border-transparent text-[#B5B8BE]/50 hover:text-[#B5B8BE]'
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
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#B5B8BE]/60">Strategy Objective:</span>
                        <p className="text-[#FAF8F5] italic font-light">{rw.description}</p>
                      </div>

                      <div className="bg-[#111315] p-5 rounded border border-white/5 relative group min-h-[100px] flex flex-col justify-between">
                        {activeAnalysis.target_language && activeAnalysis.target_language !== 'same' && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-mono text-[#00E5FF]/70 bg-[#00E5FF]/5 border border-[#00E5FF]/10 px-1.5 py-0.5 rounded uppercase select-none pointer-events-none">
                            <Globe className="w-2.5 h-2.5" /> {activeAnalysis.target_language}
                          </div>
                        )}
                        <p className="text-[#FAF8F5] text-sm leading-relaxed font-light font-serif select-all pr-12">
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
                            className="p-2 rounded bg-white/5 border border-white/10 hover:border-white/20 text-[#B5B8BE] hover:text-white transition flex items-center gap-1.5 font-mono text-[9px]"
                          >
                            <span>{copiedState === rw.type ? 'COPIED ✓' : 'COPY DRAFT'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Tone adjustment quick actions */}
                      <div className="space-y-2 bg-[#111315] p-4 rounded border border-white/5">
                        <span className="text-[10px] font-mono text-[#B5B8BE]/50 block">ITERATIVE REFINERS (PRO & PLUS)</span>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => handleRefine('Make it slightly warmer and more empathetic')} className="px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-mono transition">
                            + Empathy Cushion
                          </button>
                          <button onClick={() => handleRefine('Establish an absolute tighter boundary with firmness')} className="px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-mono transition">
                            + Strict Boundary
                          </button>
                          <button onClick={() => handleRefine('Shorten to maximum clarity essentials')} className="px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-mono transition">
                            + Extreme Conciseness
                          </button>
                          <button onClick={() => handleRefine('Remove any business jargon, talk like a normal person')} className="px-3 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-white text-[9px] font-mono transition">
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
            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 px-1 pb-1.5">
                <Activity className="w-4 h-4 text-[#D29F6F]" />
                <span className="text-[11px] uppercase font-mono tracking-widest text-[#FAF8F5] font-bold">
                  DETAILED COGNITIVE & IMPRESSION ANALYSIS
                </span>
                <span className="ml-auto text-[9px] font-mono text-[#D29F6F] bg-[#D29F6F]/10 px-2 py-0.5 rounded border border-[#D29F6F]/10">
                  DIAGNOSTIC REPORT
                </span>
              </div>

              {/* Top overview card */}
              <Card className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono text-[#B5B8BE] tracking-widest block">STRATEGIC IMPRESSION REPORT</span>
                  <h3 className="text-base font-serif font-light text-[#FAF8F5]">Communication Intelligence</h3>
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
                        ? 'bg-[#3E6F58]/10 border-[#3E6F58]/30 text-[#FAF8F5]' 
                        : 'bg-[#111315] border-white/5 text-[#B5B8BE] hover:text-white hover:bg-[#111315]/80'
                    }`}
                    title={savedVaultStatus ? 'Saved to Vault' : 'Save to Vault'}
                  >
                    <Bookmark className={`w-4 h-4 ${savedVaultStatus ? 'fill-white text-white' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 font-sans text-xs text-[#B5B8BE] font-light leading-relaxed">
                <p>{activeAnalysis.output_json.summary.overall_read}</p>
              </div>

              <div className="bg-[#111315] p-4 rounded-lg border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] text-[#B5B8BE]/50 font-mono uppercase tracking-wider block">RECOMMENDED MOVE</span>
                  <p className="text-xs font-serif font-light text-[#FAF8F5] italic">{activeAnalysis.output_json.summary.recommended_move}</p>
                </div>
                {activeAnalysis.output_json.send_recommendation?.time_advice && (
                  <div className="text-right text-[10px] font-mono text-[#B5B8BE]/70 flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/5">
                    ⏱ {activeAnalysis.output_json.send_recommendation.time_advice}
                  </div>
                )}
              </div>

              {/* Explicit large Save Button requested by user */}
              <button
                onClick={handleSaveToggle}
                className={`w-full py-3 px-4 rounded border text-xs font-mono font-medium tracking-wide transition flex items-center justify-center gap-2 ${
                  savedVaultStatus 
                    ? 'bg-[#3E6F58]/10 border-[#3E6F58]/20 text-[#FAF8F5]' 
                    : 'bg-[#111315] border-white/10 text-white hover:bg-[#111315]/80 hover:border-white/20'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${savedVaultStatus ? 'fill-white text-white' : ''}`} />
                <span>{savedVaultStatus ? 'SAVED TO PERSONAL VAULT' : 'SAVE MESSAGE ANALYSIS TO VAULT'}</span>
              </button>
            </Card>

            {/* Interpersonal Scores (Communication Fingerprint / Message DNA) */}
            <div className="space-y-3">
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#B5B8BE] font-medium block">COMMUNICATION FINGERPRINT</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeAnalysis.output_json.scores.map((score, i) => (
                  <div key={i} className="bg-[#1A1D20] p-4 rounded-xl border border-white/5 text-center space-y-2 shadow">
                    <span className="text-[10px] text-[#B5B8BE] block font-sans font-light leading-tight">{score.dimension}</span>
                    
                    {/* Linear indicator */}
                    <div className="space-y-1">
                      <span className={`text-xl font-serif font-light block ${
                        score.score >= 70 ? 'text-[#3E6F58]' : 
                        score.score >= 40 ? 'text-[#D29F6F]' : 'text-[#C97A7A]'
                      }`}>
                        {score.score}%
                      </span>
                      <div className="w-full bg-[#111315] h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            score.score >= 70 ? 'bg-[#3E6F58]' : 
                            score.score >= 40 ? 'bg-[#D29F6F]' : 'bg-[#C97A7A]'
                          }`}
                          style={{ width: `${score.score}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[9px] text-[#B5B8BE]/50 leading-relaxed font-light font-sans">{score.explanation}</p>
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
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Activity className="w-4 h-4 text-[#C97A7A]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Interactive Risk Heatmap Highlights</span>
                </div>
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  Latent friction risks, cognitive defensive blocks, and passive-aggressive indicators mapped to specific terms.
                </p>
                
                <div className="bg-[#111315] p-4 rounded-xl border border-white/5 text-xs font-sans leading-relaxed space-y-3">
                  <div className="text-xs font-light text-[#FAF8F5]/90 leading-relaxed">
                    "I <span className="bg-[#C97A7A]/20 text-[#C97A7A] px-1 rounded border border-[#C97A7A]/15 cursor-help" title="Passive-aggressive opening: reduces promptness confidence.">just wanted to follow up</span> on the project deliverables. I was hoping you could give an update, <span className="bg-[#D29F6F]/20 text-[#D29F6F] px-1 rounded border border-[#D29F6F]/15 cursor-help" title="Defensive buffer: signals apprehension or lack of expectation rigidity.">if it's not too much trouble</span>, since we're already late."
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#1A1D20] p-2.5 rounded-lg border border-red-950/20 flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 bg-[#C97A7A] rounded-full mt-1.5 flex-shrink-0" />
                      <div>
                        <span className="text-[#C97A7A] font-bold block">SUBMISSIVE / APOLOGETIC APERTURE</span>
                        Signals lack of authority; invites negotiation or postponement.
                      </div>
                    </div>
                    <div className="bg-[#1A1D20] p-2.5 rounded-lg border border-orange-950/20 flex gap-2 items-start">
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
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-[#00E5FF]" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Emotional Blueprint Timeline Map</span>
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
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  Sentence-by-sentence psychological waves mapping empathy calibration against formal rigidity. Hover or click nodes to isolate individual line metrics.
                </p>
                
                <div className="w-full h-48 bg-[#111315] rounded-xl border border-white/5 p-4 relative overflow-hidden flex flex-col justify-between font-mono">
                  {/* Visual zone labels on the left margin */}
                  <div className="absolute left-3 top-10 text-[7px] text-[#3E6F58] tracking-widest font-mono uppercase select-none pointer-events-none opacity-50">
                    ▲ Empathetic Calibration
                  </div>
                  <div className="absolute left-3 bottom-10 text-[7px] text-[#C97A7A] tracking-widest font-mono uppercase select-none pointer-events-none opacity-50">
                    ▼ Latent Risk / Triggers
                  </div>

                  {/* Timeline segment headers */}
                  <div className="flex justify-between text-[8px] text-[#888] pb-1 border-b border-white/5 z-10">
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
                            
                            let nodeStyleClasses = 'bg-[#1A1D20] border border-white/50 hover:border-[#00E5FF] hover:scale-125';
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
                              className="absolute bg-[#1A1D20]/95 border border-[#00E5FF]/40 px-2.5 py-1.5 rounded-lg text-[9px] text-white shadow-xl pointer-events-none z-30 max-w-[180px] transition-all duration-200"
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
                  <div className="flex gap-4 justify-center text-[8px] pt-1 border-t border-white/5 z-10">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full"></div>
                      <span className="text-[#B5B8BE]/80">Psychological Safety Wave</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-[#C97A7A] rounded-full border border-dashed border-white/20"></div>
                      <span className="text-[#B5B8BE]/80">Latent Triggers</span>
                    </div>
                  </div>
                </div>

                {/* Highly Understandable Active Sentence Detail Box */}
                {(() => {
                  const lines = activeAnalysis.output_json.line_by_line || [];
                  const activeItem = activeSentenceIndex !== null ? lines[activeSentenceIndex] : null;
                  
                  if (!activeItem) {
                    return (
                      <div className="bg-[#111315]/40 border border-white/5 rounded-xl p-4 text-center select-none text-[#B5B8BE]/40">
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
                    : { bg: 'bg-white/5', text: 'text-[#FAF8F5]/60', border: 'border-white/10', label: 'Neutral & Balanced' };

                  return (
                    <div className="bg-[#111315]/60 border border-white/5 rounded-xl p-4.5 space-y-3 font-sans transition-all duration-300">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                        <span className="text-[9px] font-mono text-white/40 tracking-wider">
                          DETAILED VIEW: SENTENCE {activeSentenceIndex + 1} OF {lines.length}
                        </span>
                        <div className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded border ${typeColors.bg} ${typeColors.text} ${typeColors.border}`}>
                          {activeItem.tag ? `${activeItem.tag.toUpperCase()} — ${typeColors.label.toUpperCase()}` : typeColors.label.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono text-[#00E5FF]/60 uppercase tracking-wider block">Draft Phrase</span>
                        <p className="text-sm italic font-serif text-[#FAF8F5] leading-relaxed pl-3 border-l-2 border-[#00E5FF]/30">
                          "{activeItem.line}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-[#B5B8BE]/60 uppercase tracking-wider block">Psychological Impact</span>
                          <p className="text-xs text-[#B5B8BE] font-light leading-relaxed">
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
                            <div className="bg-[#1A1D20]/60 border border-white/5 rounded-lg p-2.5">
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
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Compass className="w-4 h-4 text-[#D29F6F]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Likely Interpretation Diagnostics</span>
                </div>
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  How the recipient is structurally projected to digest this draft, with clear subtext and invitation summaries.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                  <div className="bg-[#111315] p-4 rounded border border-white/5 space-y-1">
                    <span className="text-[9px] text-[#B5B8BE]/60 font-mono block uppercase">Likely Subtext</span>
                    <p className="text-[#FAF8F5] leading-relaxed italic font-light">
                      "{activeAnalysis.output_json.how_it_may_be_read?.subtext || 'Unintentionally signaling doubt or hesitation.'}"
                    </p>
                  </div>

                  <div className="bg-[#111315] p-4 rounded border border-white/5 space-y-1">
                    <span className="text-[9px] text-[#B5B8BE]/60 font-mono block uppercase">Invited Response Pattern</span>
                    <p className="text-[#B5B8BE] leading-relaxed font-light">
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
                    <li key={idx} className="text-xs text-[#B5B8BE] flex items-start gap-2 font-sans font-light">
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
                    <li key={idx} className="text-xs text-[#B5B8BE] flex items-start gap-2 font-sans font-light">
                      <span className="text-[#C97A7A] font-bold mt-0.5">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Sentence-by-sentence Critique Editor */}
            <Card className="space-y-5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-[#B5B8BE] font-medium block">LINE-BY-LINE CRITIQUE & ANNOTATIONS</span>
              
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
                          : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                      }`}
                    >
                      <p className="text-[#FAF8F5] italic font-light font-serif text-sm">"{item.line}"</p>
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
                        <p className="text-[#B5B8BE] leading-relaxed font-light">{item.feedback}</p>
                      </div>
                      {item.suggestion && (
                        <p className="text-[11px] text-[#FAF8F5]/80 font-light flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded border border-white/5">
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
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Sovereign AI Communication Coach</span>
                </div>
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  Real-time direct dialogue with our expert communications coach database. Seek strategic adjustments immediately.
                </p>
                
                {/*
                  Switched away from the h-[fixed] + flex-1 + min-h-0
                  pattern entirely. That's the textbook-correct way to do
                  this, but it depends on every ancestor in the flex
                  chain cooperating exactly right, and it's evidently
                  still not scrolling for this reader's setup even after
                  two passes at it. This version is deliberately boring:
                  the scroll area gets an explicit max-height via inline
                  style (not a flex-basis, not a percentage, not
                  dependent on a parent's computed height at all), and
                  nothing else on the page can override that with a
                  higher-specificity or !important rule the way a class
                  could. max-height + overflow-y-auto on a block is the
                  most basic, hard-to-get-wrong scrolling pattern in CSS.
                */}
                <div className="bg-[#111315] rounded-xl border border-white/5 overflow-hidden flex flex-col">
                  {/*
                    Deliberately NOT `flex flex-col justify-end` on the
                    scroll container itself. Combining overflow-y:auto
                    with justify-content:flex-end on a column flex
                    container is a well-known CSS trap: once content
                    overflows, the browser has no defined way to let you
                    scroll up to the earlier (start-side) content — the
                    overflow direction for anything but flex-start is
                    unspecified, so the top of the conversation can end
                    up permanently clipped/unreachable even though the
                    element technically has overflow-y:auto set. A plain
                    top-to-bottom block (messages in normal document
                    flow) scrolls correctly in every browser; the
                    "anchor newest message at the bottom" effect is
                    handled separately, in JS, by the scrollTop effect
                    below.
                  */}
                  <div
                    ref={coachScrollContainerRef}
                    style={{ maxHeight: '260px', overflowY: 'auto', overscrollBehavior: 'contain' }}
                    className="p-4 text-xs font-sans"
                  >
                    <div className="space-y-3">
                      {coachChat.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-white' 
                              : 'bg-[#1A1D20] border border-white/5 text-[#FAF8F5]'
                          }`}>
                            <span className="text-[8px] font-mono uppercase tracking-wider block text-white/40 mb-1">
                              {msg.role === 'user' ? 'YOU' : 'COACH'}
                            </span>
                            {(() => {
                              const text = msg.message;
                              if (msg.role === 'coach' && typeof text === 'string' && text.trim().startsWith('{') && text.trim().endsWith('}')) {
                                try {
                                  const parsed = JSON.parse(text);
                                  const mainText = parsed.response || parsed.coachResponse || parsed.advice || parsed.message || parsed.coaching_advice || parsed.text;
                                  const rewrite = parsed.quoted_rewrite || parsed.rewrite || parsed.alternative || parsed.suggested_rewrite;
                                  
                                  if (mainText || rewrite) {
                                    return (
                                      <div className="space-y-2 font-sans">
                                        {mainText && <p className="text-xs font-light leading-relaxed whitespace-pre-wrap">{mainText}</p>}
                                        {rewrite && (
                                          <div className="bg-white/5 border border-white/10 p-2 rounded-lg my-1">
                                            <span className="text-[8px] font-mono uppercase tracking-wider text-[#00E5FF] block mb-0.5">Suggested Revision</span>
                                            <p className="text-xs italic text-white/95">"{rewrite.replace(/^"|"$/g, '')}"</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="space-y-1.5 font-sans">
                                        {Object.entries(parsed).map(([key, val]) => (
                                          <div key={key} className="space-y-0.5">
                                            <span className="text-[8px] font-mono uppercase tracking-wider text-white/40 block font-semibold">
                                              {key.replace(/_/g, ' ')}
                                            </span>
                                            <p className="text-xs font-light text-[#FAF8F5]/90 leading-relaxed">
                                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  // Fallback to raw text below
                                }
                              }
                              
                              return <p className="text-xs font-light whitespace-pre-wrap leading-relaxed">{msg.message}</p>;
                            })()}
                          </div>
                        </div>
                      ))}
                      {coachLoading && (
                        <div className="flex justify-start">
                          <div className="bg-[#1A1D20] border border-white/5 p-3 rounded-xl max-w-[85%] text-xs font-mono text-white/50 animate-pulse">
                            Consulting coaching models...
                          </div>
                        </div>
                      )}
                      <div ref={coachChatEndRef} />
                    </div>
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handleCoachSend} className="border-t border-white/5 p-3 bg-[#131517] flex gap-2">
                    <input 
                      type="text" 
                      value={coachInput}
                      onChange={(e) => setCoachInput(e.target.value)}
                      placeholder="Ask the coach, e.g., 'Make it 10% softer'..."
                      className="flex-1 bg-[#1A1D20] text-xs text-white rounded-xl px-4 py-2 focus:outline-none border border-white/5 focus:border-[#00E5FF]/40 placeholder-[#B5B8BE]/30"
                    />
                    <button 
                      type="submit"
                      className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black p-2 rounded-xl transition flex items-center justify-center cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Gated Conversation Path Simulator (Pro gate) */}
            <LockedFeatureOverlay 
              gate={FEATURE_GATES.scenarioSimulator} 
              onUpgradeClick={onUpgradePlan} 
              allowed={hasFeatureAccess(userPlan as any, 'scenarioSimulator', trialActive).allowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Compass className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Conversation Path Simulator</span>
                </div>
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  Preview a few realistic ways this exact message could land — and how to respond to each — before you send it.
                </p>

                <div className="bg-[#111315] p-5 rounded-xl border border-white/5 space-y-4 font-sans text-xs">
                  {!simulatorPaths && !simulatorLoading && !simulatorError && (
                    <div className="text-center py-4 space-y-3">
                      <p className="text-[#B5B8BE] leading-relaxed">
                        Run a simulation to see 3 realistic ways your recipient might respond to this exact message, and what to say next in each case.
                      </p>
                      <button
                        onClick={handleRunSimulation}
                        disabled={!(activeAnalysis?.original_message || originalMessage)?.trim()}
                        className="px-4 py-2 bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 border border-[#00E5FF]/25 text-[#00E5FF] rounded-xl font-mono text-[10px] uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Simulate This Conversation
                      </button>
                    </div>
                  )}

                  {simulatorLoading && (
                    <div className="text-center py-6 space-y-2">
                      <div className="animate-pulse text-white/50 font-mono text-[10px] uppercase tracking-wide">
                        Modeling likely responses...
                      </div>
                    </div>
                  )}

                  {simulatorError && !simulatorLoading && (
                    <div className="space-y-3">
                      <div className="p-3 bg-[#C97A7A]/10 border border-[#C97A7A]/20 rounded-xl text-[#C97A7A]">
                        {simulatorError}
                      </div>
                      <button onClick={handleRunSimulation} className="text-[10px] font-mono text-[#00E5FF] hover:underline">
                        ← TRY AGAIN
                      </button>
                    </div>
                  )}

                  {simulatorPaths && simulatorPaths.length > 0 && !simulatorLoading && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2 font-mono text-[9px] text-[#888]">
                        <span>{simulatorPaths.length} PREDICTED PATHS</span>
                        <button onClick={handleRunSimulation} className="text-[#00E5FF] hover:underline normal-case">Re-run</button>
                      </div>

                      {selectedPathIndex === null ? (
                        <div className="space-y-2.5">
                          {simulatorPaths.map((path, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedPathIndex(idx)}
                              className="w-full text-left p-3 bg-[#1A1D20] hover:bg-[#1A1D20]/80 border border-white/5 hover:border-[#00E5FF]/30 rounded-xl transition"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-white">{path.label}</p>
                                <span className="text-[8px] font-mono uppercase tracking-wide text-[#B5B8BE] px-1.5 py-0.5 border border-white/10 rounded shrink-0">
                                  {path.likelihood}
                                </span>
                              </div>
                              <p className="text-[10px] text-[#888] font-light mt-1 italic line-clamp-2">"{path.predicted_reply}"</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(() => {
                            const path = simulatorPaths[selectedPathIndex];
                            return (
                              <>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                  <span className="text-[9px] text-[#00E5FF] font-mono block uppercase font-bold">{path.label}</span>
                                  <p className="text-white mt-1 leading-normal font-light italic">"{path.predicted_reply}"</p>
                                </div>

                                <div className="p-3 bg-[#1A1D20] border border-white/5 rounded-xl text-[10px] text-[#B5B8BE] flex items-start gap-1.5">
                                  <span className="mt-0.5">•</span>
                                  <span>What this likely signals: {path.what_it_signals}</span>
                                </div>

                                <div className="p-3 bg-green-950/10 border border-green-900/20 rounded-xl">
                                  <span className="text-[9px] text-[#3E6F58] font-mono block uppercase font-bold mb-1">Suggested next message</span>
                                  <p className="text-white leading-normal font-light">"{path.suggested_next_message}"</p>
                                  <button
                                    onClick={() => handleAnalyzeRewrite(path.suggested_next_message)}
                                    className="mt-2 text-[10px] font-mono text-[#00E5FF] hover:underline"
                                  >
                                    Analyze this reply →
                                  </button>
                                </div>

                                <button onClick={() => setSelectedPathIndex(null)} className="text-[10px] font-mono text-[#00E5FF] hover:underline">
                                  ← BACK TO ALL PATHS
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Gated Full Conversation Rehearsal (Pro gate — same tier as Scenario Simulator) */}
            <LockedFeatureOverlay
              gate={FEATURE_GATES.scenarioSimulator}
              onUpgradeClick={onUpgradePlan}
              allowed={rehearsalAllowed}
            >
              <Card className="space-y-4">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <MessageSquare className="w-4 h-4 text-[#00E5FF]" />
                  <span className="text-[10px] uppercase font-mono tracking-widest text-[#B5B8BE] font-semibold block">Full Conversation Rehearsal</span>
                </div>
                <p className="text-xs text-[#B5B8BE]/70 font-sans font-light leading-relaxed">
                  A live practice round: the AI automatically plays the other side and replies in character. Send it whatever you'd actually say next and see how the real conversation might genuinely unfold, before you ever send it for real.
                </p>

                <div className="bg-[#111315] rounded-xl border border-white/5 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center border-b border-white/5 px-4 py-2.5 font-mono text-[9px] text-[#888]">
                    <span>REHEARSAL · YOU vs. {rehearsalCounterpartLabel.toUpperCase()}</span>
                    {rehearsalTurns.length > 0 && (
                      <button onClick={handleRestartRehearsal} className="text-[#00E5FF] hover:underline normal-case flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5" /> Restart
                      </button>
                    )}
                  </div>

                  {/* Chat history — same plain top-to-bottom scroll pattern as the
                      Coach chat above; see that container's comment for why this
                      deliberately avoids flex+justify-end. */}
                  <div
                    ref={rehearsalScrollRef}
                    style={{ maxHeight: '340px', overflowY: 'auto', overscrollBehavior: 'contain' }}
                    className="p-4 text-xs font-sans"
                  >
                    {rehearsalTurns.length === 0 && !rehearsalLoading && !rehearsalError && (
                      <p className="text-[#B5B8BE] text-center py-6">
                        {(activeAnalysis?.original_message || originalMessage)?.trim()
                          ? 'Starting the rehearsal…'
                          : 'Write or select a message draft above to begin rehearsing this conversation.'}
                      </p>
                    )}

                    <div className="space-y-3">
                      {rehearsalTurns.map((turn, idx) => (
                        <div key={idx} className={`flex ${turn.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                            turn.speaker === 'user'
                              ? 'bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-white'
                              : 'bg-[#1A1D20] border border-white/5 text-[#FAF8F5]'
                          }`}>
                            <span className="text-[8px] font-mono uppercase tracking-wider block text-white/40 mb-1">
                              {turn.speaker === 'user' ? 'YOU' : rehearsalCounterpartLabel.toUpperCase()}
                            </span>
                            <p className="text-xs font-light whitespace-pre-wrap leading-relaxed">{turn.text}</p>
                          </div>
                        </div>
                      ))}
                      {rehearsalLoading && (
                        <div className="flex justify-start">
                          <div className="bg-[#1A1D20] border border-white/5 p-3 rounded-xl max-w-[85%] text-xs font-mono text-white/50 animate-pulse">
                            {rehearsalCounterpartLabel} is responding...
                          </div>
                        </div>
                      )}
                      {rehearsalError && !rehearsalLoading && (
                        <div className="space-y-2">
                          <div className="p-3 bg-[#C97A7A]/10 border border-[#C97A7A]/20 rounded-xl text-[#C97A7A]">
                            {rehearsalError}
                          </div>
                          <button
                            onClick={() => fetchRehearsalReply(rehearsalTurns)}
                            className="text-[10px] font-mono text-[#00E5FF] hover:underline"
                          >
                            ← TRY AGAIN
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form — user's turn in the live rehearsal */}
                  <form onSubmit={handleRehearsalSend} className="border-t border-white/5 p-3 bg-[#131517] flex gap-2">
                    <input
                      type="text"
                      value={rehearsalInput}
                      onChange={(e) => setRehearsalInput(e.target.value)}
                      placeholder={`Reply to ${rehearsalCounterpartLabel} as yourself...`}
                      disabled={rehearsalLoading || rehearsalTurns.length === 0}
                      className="flex-1 bg-[#1A1D20] text-xs text-white rounded-xl px-4 py-2 focus:outline-none border border-white/5 focus:border-[#00E5FF]/40 placeholder-[#B5B8BE]/30 disabled:opacity-40"
                    />
                    <button
                      type="submit"
                      disabled={rehearsalLoading || !rehearsalInput.trim() || rehearsalTurns.length === 0}
                      className="bg-[#00E5FF] hover:bg-[#00E5FF]/90 text-black p-2 rounded-xl transition flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </Card>
            </LockedFeatureOverlay>

            {/* Anticipatory response pathways */}
            {activeAnalysis.output_json.follow_ups && activeAnalysis.output_json.follow_ups.length > 0 && (
              <Card className="space-y-4">
                <span className="text-[9px] uppercase font-mono tracking-widest text-[#B5B8BE] font-medium block">ANTICIPATORY REPLY WORKBOOK</span>
                <p className="text-xs text-[#B5B8BE]/70 font-light font-sans">If the recipient responds or pushes back, follow these strategic guidelines:</p>
                
                <div className="space-y-3">
                  {activeAnalysis.output_json.follow_ups.map((f, i) => (
                    <div key={i} className="bg-[#111315] p-4 rounded border border-white/5 space-y-1.5 text-xs font-sans">
                      <div className="flex justify-between items-center">
                        <span className="text-[#FAF8F5]/80 font-mono text-[9px] font-medium block uppercase tracking-wide">IF: {f.condition}</span>
                        <button
                          onClick={() => handleAnalyzeRewrite(f.message)}
                          className="text-[8px] font-mono text-[#00E5FF]/80 hover:text-[#00E5FF] hover:underline uppercase flex items-center gap-1 transition cursor-pointer"
                          title="Analyze this reply version"
                        >
                          <Activity className="w-2.5 h-2.5" /> Analyze Reply
                        </button>
                      </div>
                      <p className="text-[#FAF8F5] font-serif font-light leading-relaxed italic">"{f.message}"</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
            </div> {/* This closes Section 2's <div className="space-y-6 pt-4 border-t border-white/10"> */}
          </div>
        ) : (
          /* Empty state - instructions */
          <Card className="p-12 text-center space-y-6 min-h-[480px] flex flex-col justify-center items-center">
            <div className="w-14 h-14 bg-white/5 border border-white/10 text-[#FAF8F5] rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-2 max-w-sm">
              <h3 className="text-lg font-serif font-light text-[#FAF8F5]">Communication Intelligence Panel</h3>
              <p className="text-xs text-[#B5B8BE] leading-relaxed font-light font-sans">
                Paste your draft, adjust parameters, and trigger analysis. We'll decompose its interpersonal risks, emotional fingerprint, and write highly customized, strategic alternatives.
              </p>
            </div>

            <div className="border-t border-white/5 pt-6 w-full max-w-sm space-y-3 text-left">
              <span className="text-[10px] font-mono text-[#B5B8BE]/50 block text-center uppercase tracking-widest">START WITH PRESET WORKFLOWS</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button 
                  onClick={() => loadDemo('breakup')}
                  className="p-3 bg-[#111315] border border-white/5 hover:border-white/15 rounded text-left text-xs text-[#B5B8BE] hover:text-white transition w-full"
                >
                  <p className="font-serif font-medium text-[#FAF8F5] mb-0.5">Boundary Cushion</p>
                  <p className="text-[9px] leading-normal font-sans font-light text-[#B5B8BE]/60">Declining dating/personal loops gracefully.</p>
                </button>
                <button 
                  onClick={() => loadDemo('invoice')}
                  className="p-3 bg-[#111315] border border-white/5 hover:border-white/15 rounded text-left text-xs text-[#B5B8BE] hover:text-white transition w-full"
                >
                  <p className="font-serif font-medium text-[#FAF8F5] mb-0.5">Billing Authority</p>
                  <p className="text-[9px] leading-normal font-sans font-light text-[#B5B8BE]/60">Requesting overdue payments firmly.</p>
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
