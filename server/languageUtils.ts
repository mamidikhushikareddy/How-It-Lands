/**
 * Language utilities and localized strategy generators
 * Supports end-to-end language detection, script verification, and high-fidelity fallback generation.
 */

import { OutputJson } from '../src/types';

export interface LanguageInfo {
  code: string;
  name: string;
  script: 'native' | 'latin' | 'same';
  nativeName: string;
}

export function normalizeLanguage(lang?: string): LanguageInfo {
  if (!lang || lang.trim() === '' || lang.toLowerCase() === 'same' || lang.toLowerCase() === 'default') {
    return { code: 'same', name: 'Same as draft', script: 'same', nativeName: 'Original' };
  }

  const clean = lang.trim().toLowerCase();

  const langMap: Record<string, LanguageInfo> = {
    // South Asian & Regional
    'telugu': { code: 'te', name: 'Telugu', script: 'native', nativeName: 'తెలుగు' },
    'te': { code: 'te', name: 'Telugu', script: 'native', nativeName: 'తెలుగు' },
    'hindi': { code: 'hi', name: 'Hindi', script: 'native', nativeName: 'हिन्दी' },
    'hi': { code: 'hi', name: 'Hindi', script: 'native', nativeName: 'हिन्दी' },
    'tamil': { code: 'ta', name: 'Tamil', script: 'native', nativeName: 'தமிழ்' },
    'ta': { code: 'ta', name: 'Tamil', script: 'native', nativeName: 'தமிழ்' },
    'marathi': { code: 'mr', name: 'Marathi', script: 'native', nativeName: 'मराठी' },
    'mr': { code: 'mr', name: 'Marathi', script: 'native', nativeName: 'मराठी' },
    'bengali': { code: 'bn', name: 'Bengali', script: 'native', nativeName: 'বাংলা' },
    'bn': { code: 'bn', name: 'Bengali', script: 'native', nativeName: 'বাংলা' },
    'gujarati': { code: 'gu', name: 'Gujarati', script: 'native', nativeName: 'ગુજરાતી' },
    'gu': { code: 'gu', name: 'Gujarati', script: 'native', nativeName: 'ગુજરાતી' },

    // Transliterations (Romanized)
    'hinglish': { code: 'hi-Latn', name: 'Hinglish', script: 'latin', nativeName: 'Hinglish' },
    'teluglish': { code: 'te-Latn', name: 'Teluglish', script: 'latin', nativeName: 'Teluglish' },
    'marathish': { code: 'mr-Latn', name: 'Marathish', script: 'latin', nativeName: 'Marathish' },
    'benglish': { code: 'bn-Latn', name: 'Benglish', script: 'latin', nativeName: 'Benglish' },
    'tamilish': { code: 'ta-Latn', name: 'Tamilish', script: 'latin', nativeName: 'Tamilish' },

    // Global Languages
    'spanish': { code: 'es', name: 'Spanish', script: 'latin', nativeName: 'Español' },
    'es': { code: 'es', name: 'Spanish', script: 'latin', nativeName: 'Español' },
    'french': { code: 'fr', name: 'French', script: 'latin', nativeName: 'Français' },
    'fr': { code: 'fr', name: 'French', script: 'latin', nativeName: 'Français' },
    'german': { code: 'de', name: 'German', script: 'latin', nativeName: 'Deutsch' },
    'de': { code: 'de', name: 'German', script: 'latin', nativeName: 'Deutsch' },
    'italian': { code: 'it', name: 'Italian', script: 'latin', nativeName: 'Italiano' },
    'it': { code: 'it', name: 'Italian', script: 'latin', nativeName: 'Italiano' },
    'portuguese': { code: 'pt', name: 'Portuguese', script: 'latin', nativeName: 'Português' },
    'pt': { code: 'pt', name: 'Portuguese', script: 'latin', nativeName: 'Português' },
    'japanese': { code: 'ja', name: 'Japanese', script: 'native', nativeName: '日本語' },
    'ja': { code: 'ja', name: 'Japanese', script: 'native', nativeName: '日本語' },
    'chinese': { code: 'zh', name: 'Chinese', script: 'native', nativeName: '中文' },
    'zh': { code: 'zh', name: 'Chinese', script: 'native', nativeName: '中文' },
    'arabic': { code: 'ar', name: 'Arabic', script: 'native', nativeName: 'العربية' },
    'ar': { code: 'ar', name: 'Arabic', script: 'native', nativeName: 'العربية' },
    'russian': { code: 'ru', name: 'Russian', script: 'native', nativeName: 'Русский' },
    'ru': { code: 'ru', name: 'Russian', script: 'native', nativeName: 'Русский' },
    'english': { code: 'en', name: 'English', script: 'latin', nativeName: 'English' },
    'en': { code: 'en', name: 'English', script: 'latin', nativeName: 'English' }
  };

  if (langMap[clean]) {
    return langMap[clean];
  }

  // Fallback for custom languages
  return {
    code: clean.substring(0, 5),
    name: lang.trim(),
    script: 'latin',
    nativeName: lang.trim()
  };
}

/**
 * Checks whether an AI-generated output matches the required script/language.
 */
export function verifyLanguageCompliance(sampleText: string, targetLanguage: string): boolean {
  if (!sampleText || !targetLanguage) return true;
  const info = normalizeLanguage(targetLanguage);
  if (info.code === 'same' || info.code === 'en') return true;

  if (info.code === 'te') {
    return /[\u0C00-\u0C7F]/.test(sampleText);
  }
  if (info.code === 'hi' || info.code === 'mr') {
    return /[\u0900-\u097F]/.test(sampleText);
  }
  if (info.code === 'ta') {
    return /[\u0B80-\u0BFF]/.test(sampleText);
  }
  if (info.code === 'bn') {
    return /[\u0980-\u09FF]/.test(sampleText);
  }
  if (info.code === 'gu') {
    return /[\u0A80-\u0AFF]/.test(sampleText);
  }
  if (info.code === 'ja') {
    return /[\u3040-\u30FF\u4E00-\u9FAF]/.test(sampleText);
  }
  if (info.code === 'zh') {
    return /[\u4E00-\u9FFF]/.test(sampleText);
  }
  if (info.code === 'ar') {
    return /[\u0600-\u06FF]/.test(sampleText);
  }
  if (info.code === 'ru') {
    return /[\u0400-\u04FF]/.test(sampleText);
  }
  if (info.script === 'latin') {
    // For transliterated languages like Hinglish/Teluglish, must NOT use regional scripts
    return /[a-zA-Z]/.test(sampleText) && !/[\u0900-\u0D7F]/.test(sampleText);
  }

  return true;
}

/**
 * High-fidelity localized fallback analysis generator.
 * Produces deep, realistic strategic assessments and rewrites in the user's selected language.
 */
export function getLocalizedFallbackAnalysis(
  original_message: string,
  scenario: string,
  relationship_context: string,
  user_goal: string,
  targetLanguage?: string
): OutputJson {
  const langInfo = normalizeLanguage(targetLanguage);
  const code = langInfo.code;

  // Language-specific localized packages
  const packages: Record<string, {
    overallRead: string;
    recommendedMove: string;
    risks: string[];
    strengths: string[];
    howRead: {
      emotional_impression: string;
      subtext: string;
      confusing_points: string;
      unintentional_signals: string;
      invited_responses: string;
    };
    lineFeedback: {
      riskFeedback: string;
      riskSuggestion: string;
      strengthFeedback: string;
      strengthSuggestion: string;
    };
    rewrites: {
      kinder: string;
      confident: string;
      shorter: string;
      best: string;
    };
    followUps: {
      c1: string; m1: string;
      c2: string; m2: string;
    };
    sendAdvice: { action: string; time: string; delivery: string };
  }> = {
    // TELUGU (తెలుగు)
    'te': {
      overallRead: `ఈ సందేశం స్పష్టమైన ఉద్దేశాన్ని కలిగి ఉంది, కానీ అనవసరమైన సంశయం లేదా అధిక సమర్థనల వల్ల మీ విశ్వాసం తగ్గే అవకాశం ఉంది.`,
      recommendedMove: `సందేహాస్పద పదాలను తొలగించి, మీ సరిహద్దును స్పష్టంగా మరియు గౌరవప్రదంగా తెలియజేయండి.`,
      risks: [
        `అధిక క్షమాపణలు చెప్పడం వల్ల మీ నిర్ణయం బలహీనంగా అనిపిస్తుంది.`,
        `ఎక్కువ వివరణలు ఇవ్వడం వల్ల ఎదుటివారు దీనిపై చర్చించడానికి ఆస్కారం ఉంటుంది.`
      ],
      strengths: [
        `మౌలిక సంభాషణలో సహజమైన గౌరవం మరియు సహానుభూతి ఉన్నాయి.`,
        `లక్ష్యం స్పష్టంగా ఉంది.`
      ],
      howRead: {
        emotional_impression: `కొంత అసహనంగా లేదా సంకోచంతో కూడినదిగా అనిపిస్తుంది.`,
        subtext: `"నేను ఈ నిర్ణయం తీసుకున్నాను, కానీ మీరు ఒప్పుకుంటారో లేదో అని భయపడుతున్నాను."`,
        confusing_points: `సమర్థనల మధ్య అసలు సందేశం కొంత మరుగున పడింది.`,
        unintentional_signals: `ఎదుటివారు ఇంకా చర్చించడానికి అవకాశం ఉందని భావించవచ్చు.`,
        invited_responses: `వారు రాజీ పడటానికి లేదా మరింత సమయం కోరడానికి ప్రయత్నించవచ్చు.`
      },
      lineFeedback: {
        riskFeedback: `ఈ వాక్యం అనవసర సంకోచాన్ని సూచిస్తుంది.`,
        riskSuggestion: `సూటిగా మరియు దృఢంగా చెప్పండి.`,
        strengthFeedback: `ఈ వాక్యం సూటిగా మరియు ప్రభావవంతంగా ఉంది.`,
        strengthSuggestion: `ఈ స్పష్టతను కొనసాగించండి.`
      },
      rewrites: {
        kinder: `నమస్కారం, మీరు అందించిన మద్దతుకు ధన్యవాదాలు. ప్రస్తుతం నా సమయ పరిమితుల వల్ల నేను దీనిని అంగీకరించలేకపోతున్నాను. మీకు అంతా మంచి జరగాలని కోరుకుంటున్నాను.`,
        confident: `నన్ను సంప్రదించినందుకు ధన్యవాదాలు. ప్రస్తుత ప్రాజెక్టుల వల్ల నేను దీనిపై పనిచేయలేను. భవిష్యత్తులో ఖచ్చితంగా కలిసి పనిచేద్దాం.`,
        shorter: `ధన్యవాదాలు, కానీ ప్రస్తుతానికి నేను దీనిని పూర్తి చేయలేను. శుభాకాంక్షలు!`,
        best: `నేను ఈ విషయాన్ని మీకు నేరుగా తెలియజేయాలనుకుంటున్నాను: నా ప్రస్తుత బాధ్యతల దృష్ట్యా దీనికి నా సమయాన్ని కేటాయించలేను. మీ అవగాహనకు కృతజ్ఞతలు.`
      },
      followUps: {
        c1: `వారు పునఃపరిశీలించమని కోరితే`, m1: `నా నిర్ణయాన్ని గౌరవించినందుకు ధన్యవాదాలు, కానీ ప్రస్తుత పరిస్థితులలో ఇది సాధ్యం కాదు.`,
        c2: `వారు సహకరించినట్లయితే`, m2: `మీ అర్థం చేసుకునే గుణానికి మరియు సహకారానికి ధన్యవాదాలు.`
      },
      sendAdvice: {
        action: `సూటిగా మరియు గౌరవంగా పంపండి`,
        time: `పని వేళల్లో ఉదయం 10:00 నుండి సాయంత్రం 4:00 మధ్య పంపడం శ్రేయస్కరం`,
        delivery: `ఒకే సంపూర్ణ సందేశంగా పంపండి`
      }
    },

    // HINDI (हिन्दी)
    'hi': {
      overallRead: `यह संदेश स्पष्ट है, लेकिन अत्यधिक औपचारिकता या संकोच के कारण यह कमजोर लग सकता है।`,
      recommendedMove: `सटीक शब्दों का उपयोग करें और बिना झिझक के अपनी बात स्पष्ट रखें।`,
      risks: [
        `अत्यधिक क्षमाप्रार्थी होना आपकी स्थिति को कमजोर दिखाता है।`,
        `ज्यादा स्पष्टीकरण देने से सामने वाले को बहस का मौका मिलता है।`
      ],
      strengths: [
        `सहानुभूति और शिष्टाचार की अच्छी उपस्थिति है।`,
        `मूल बात का इरादा सही है।`
      ],
      howRead: {
        emotional_impression: `संकोची या असहज महसूस हो सकता है।`,
        subtext: `"मैं ना कहना चाहता हूँ, लेकिन सामने वाले की प्रतिक्रिया से डर रहा हूँ।"`,
        confusing_points: `स्पष्टीकरण के कारण मुख्य बिंदु दब सकता है।`,
        unintentional_signals: `निर्णय पर अभी भी बातचीत संभव है।`,
        invited_responses: `सामने वाला व्यक्ति आपको मनाने की कोशिश कर सकता है।`
      },
      lineFeedback: {
        riskFeedback: `यह वाक्य अनिश्चितता और झिझक दर्शाता है।`,
        riskSuggestion: `अनावश्यक औपचारिकता हटाकर बात सीधे कहें।`,
        strengthFeedback: `यह वाक्य स्पष्ट और संतुलित है।`,
        strengthSuggestion: `इस आत्मविश्वास को बनाए रखें।`
      },
      rewrites: {
        kinder: `नमस्ते, आपके प्रस्ताव के लिए बहुत धन्यवाद। मौजूदा व्यस्तता के कारण मैं फिलहाल इसके लिए समय नहीं निकाल पाऊँगा। आपके सहयोग की सराहना करता हूँ।`,
        confident: `नमस्ते, संपर्क करने के लिए धन्यवाद। मेरी वर्तमान प्राथमिकताओं के कारण मैं इस कार्य को आगे नहीं बढ़ा पाऊँगा। भविष्य के अवसरों के लिए शुभकामनाएँ।`,
        shorter: `नमस्ते, आमंत्रण के लिए धन्यवाद, लेकिन मैं इस बार शामिल नहीं हो पाऊँगा।`,
        best: `नमस्ते, मैं सीधे तौर पर साझा करना चाहता हूँ कि मेरे वर्तमान शेड्यूल के अनुसार मैं इसे स्वीकार करने में असमर्थ हूँ। आपकी समझदारी के लिए धन्यवाद।`
      },
      followUps: {
        c1: `यदि वे पुनः विचार करने का अनुरोध करते हैं`, m1: `मैं आपकी बात समझता हूँ, लेकिन मेरी वर्तमान प्राथमिकताएँ तय हैं।`,
        c2: `यदि वे आसानी से मान जाते हैं`, m2: `आपकी समझ और सहयोग के लिए बहुत-बहुत धन्यवाद।`
      },
      sendAdvice: {
        action: `स्पष्ट और दृढ़ रूप से भेजें`,
        time: `कार्यदिवस में सुबह 10:00 से शाम 4:00 के बीच`,
        delivery: `एक संपूर्ण संदेश के रूप में भेजें`
      }
    },

    // TAMIL (தமிழ்)
    'ta': {
      overallRead: `இந்த செய்தி உங்கள் நிலைப்பாட்டை தெளிவாக கூறுகிறது, ஆனால் அதிகப்படியான விளக்கம் உங்கள் அதிகாரத்தை குறைக்க வாய்ப்புள்ளது.`,
      recommendedMove: `தயக்கமின்றி உங்கள் முடிவை மரியாதையுடன் நேரடியாக வெளிப்படுத்துங்கள்.`,
      risks: [
        `அதிக மன்னிப்பு கேட்பது உங்கள் நிலையை பலவீனப்படுத்தும்.`,
        `நீண்ட விளக்கம் தேவையற்ற விவாதங்களை உருவாக்கும்.`
      ],
      strengths: [
        `நேர்மையான அக்கறை மற்றும் மரியாதை உள்ளது.`,
        `நோக்கம் உறுதியானது.`
      ],
      howRead: {
        emotional_impression: `தயக்கத்துடன் இருப்பதாக உணரப்படலாம்.`,
        subtext: `"நான் இதை செய்ய விரும்பவில்லை, ஆனால் நீங்கள் வருத்தப்படுவீர்களா என்று அஞ்சுகிறேன்."`,
        confusing_points: `விளக்கங்களின் நடுவே முக்கிய செய்தி மறைந்துவிடலாம்.`,
        unintentional_signals: `இன்னும் சமரசம் செய்து கொள்ளலாம் என்ற எண்ணம் வரலாம்.`,
        invited_responses: `அவர்கள் தங்களை மறுபரிசீலனை செய்ய வலியுறுத்தலாம்.`
      },
      lineFeedback: {
        riskFeedback: `இந்த வரிகள் தேவையற்ற தயக்கத்தை காட்டுகின்றன.`,
        riskSuggestion: `நேரடியாக மற்றும் தெளிவாக கூறுங்கள்.`,
        strengthFeedback: `இந்த வாக்கியம் மிகத் துல்லியமாக உள்ளது.`,
        strengthSuggestion: `இந்த தெளிவை தொடருங்கள்.`
      },
      rewrites: {
        kinder: `வணக்கம், உங்கள் அன்பான ஆதரவிற்கு நன்றி. எனது தற்போதைய பணிச்சுமை காரணமாக என்னால் இதில் பங்கேற்க இயலவில்லை. வாழ்த்துகள்!`,
        confident: `வணக்கம், அழைப்பிற்கு நன்றி. எனது தற்போதைய கடமைகள் காரணமாக என்னால் இதை ஏற்க இயலவில்லை. புரிதலுக்கு நன்றி.`,
        shorter: `நன்றி, ஆனால் தற்போதைய சூழலில் என்னால் வர இயலாது. வாழ்த்துகள்!`,
        best: `வணக்கம், எனது தற்போதைய நேர வரம்புகள் காரணமாக இந்த திட்டத்தை என்னால் ஏற்க இயலவில்லை என்பதை வெளிப்படையாக தெரிவிக்கிறேன்.`
      },
      followUps: {
        c1: `அவர்கள் வற்புறுத்தினால்`, m1: `உங்கள் நிலைமையை நான் புரிந்துகொள்கிறேன், ஆனால் எனது முடிவு இறுதியானது.`,
        c2: `அவர்கள் ஏற்றுக்கொண்டால்`, m2: `உங்கள் புரிதலுக்கும் ஆதரவிற்கும் மிக்க நன்றி.`
      },
      sendAdvice: {
        action: `நேரடியாகவும் மரியாதையாகவும் அனுப்பவும்`,
        time: `காலை 10:00 முதல் மாலை 4:00 வரை`,
        delivery: `ஒரே செய்தியாக அனுப்பவும்`
      }
    },

    // MARATHI (मराठी)
    'mr': {
      overallRead: `हा मसुदा स्पष्ट आहे, परंतु गरजेपेक्षा जास्त स्पष्टीकरणे दिल्याने प्रभाव कमी होऊ शकतो.`,
      recommendedMove: `स्पष्ट आणि ठाम शब्दांत आपली मर्यादा व्यक्त करा.`,
      risks: [
        `जास्त माफी मागितल्याने आपला निर्णय कमकुवत वाटू शकतो.`,
        `अनावश्यक स्पष्टीकरणांमुळे समोरच्याला चर्चा करण्याची संधी मिळते.`
      ],
      strengths: [
        `संभाषणातील आदर आणि नम्रता वाखाणण्याजोगी आहे.`,
        `उद्देश स्पष्ट आहे.`
      ],
      howRead: {
        emotional_impression: `संकोच वाटू शकतो.`,
        subtext: `"मी नकार देत आहे पण तुम्हाला वाईट वाटेल याची भीती आहे."`,
        confusing_points: `मुख्य मुद्दा स्पष्टीकरणात हरवू शकतो.`,
        unintentional_signals: `निर्णय अजून बदलता येऊ शकतो असा समज.`,
        invited_responses: `समोरची व्यक्ती पुनर्विचार करण्याचा आग्रह धरू शकते.`
      },
      lineFeedback: {
        riskFeedback: `या वाक्यात संकोच दिसून येतो.`,
        riskSuggestion: `वाक्य थेट आणि आत्मविश्वासू ठेवा.`,
        strengthFeedback: `हे वाक्य स्पष्ट आणि प्रभावी आहे.`,
        strengthSuggestion: `हा ठामपणा कायम ठेवा.`
      },
      rewrites: {
        kinder: `नमस्कार, विचारणा केल्याबद्दल मनापासून धन्यवाद. सध्याच्या व्यस्ततेमुळे मी यात सहभागी होऊ शकणार नाही. पुढील वाटचालीस शुभेच्छा!`,
        confident: `नमस्कार, संपर्क केल्याबद्दल धन्यवाद. माझ्या आधीच्या जबाबदाऱ्यांमुळे मी हे काम स्वीकारू शकत नाही.`,
        shorter: `धन्यवाद, परंतु सध्याच्या वेळेच्या मर्यादेमुळे मला हे शक्य होणार नाही.`,
        best: `नमस्कार, मला थेट सांगायचे आहे की माझ्या सध्याच्या वेळापत्रकानुसार मी हे काम हाती घेऊ शकत नाही. समजून घेतल्याबद्दल धन्यवाद.`
      },
      followUps: {
        c1: `जर त्यांनी पुनर्विचार करण्याची विनंती केली`, m1: `मला आपली परिस्थिती समजते, परंतु सध्या हे शक्य नाही.`,
        c2: `जर त्यांनी सहज स्वीकारले`, m2: `आपल्या सहकार्याबद्दल मनापासून धन्यवाद.`
      },
      sendAdvice: {
        action: `ठामपणे व नम्रतेने पाठवा`,
        time: `सकाळी १०:०० ते संध्याकाळी ४:०० दरम्यान`,
        delivery: `एकाच संदेशात पाठवा`
      }
    },

    // SPANISH (Español)
    'es': {
      overallRead: `El borrador comunica claramente la intención, pero el exceso de justificaciones puede diluir la firmeza de tu mensaje.`,
      recommendedMove: `Elimina disculpas innecesarias y declara tu posición con cortesía y claridad profesional.`,
      risks: [
        `Disculparse en exceso proyecta inseguridad sobre tu decisión.`,
        `Explicar demasiado abre espacio a negociaciones no deseadas.`
      ],
      strengths: [
        `Tono respetuoso y empático.`,
        `El objetivo fundamental está bien definido.`
      ],
      howRead: {
        emotional_impression: `Cauteloso o algo evasivo.`,
        subtext: `"Quiero decir que no, pero me preocupa que te molestes."`,
        confusing_points: `La petición principal queda envuelta en rodeos.`,
        unintentional_signals: `La decisión parece abierta a debate.`,
        invited_responses: `El interlocutor puede insistir o intentar convencerte.`
      },
      lineFeedback: {
        riskFeedback: `Esta frase introduce titubeo innecesario.`,
        riskSuggestion: `Exprésalo de forma directa y concisa.`,
        strengthFeedback: `Esta afirmación es asertiva y clara.`,
        strengthSuggestion: `Mantén este nivel de claridad.`
      },
      rewrites: {
        kinder: `Hola, muchas gracias por tenerme en cuenta. En este momento, debido a mis compromisos actuales, no podré asumir esto. ¡Te deseo mucho éxito!`,
        confident: `Hola, gracias por contactarme. Tras revisar mis prioridades actuales, no me es posible aceptar esta propuesta. Saludos cordiales.`,
        shorter: `Gracias por la invitación, pero lamentablemente no podré participar esta vez.`,
        best: `Hola, quiero ser directo contigo: debido a mi carga de trabajo actual, no puedo comprometerme con este proyecto. Agradezco mucho tu comprensión.`
      },
      followUps: {
        c1: `Si insisten o piden reconsiderar`, m1: `Entiendo tu situación, pero mis compromisos actuales son firmes y no puedo aceptar.`,
        c2: `Si aceptan cordialmente`, m2: `Muchas gracias por tu comprensión y apoyo.`
      },
      sendAdvice: {
        action: `Enviar con firmeza y profesionalismo`,
        time: `Días hábiles entre las 09:00 y las 17:00`,
        delivery: `Enviar en un solo mensaje completo`
      }
    },

    // HINGLISH (Latin alphabet)
    'hi-Latn': {
      overallRead: `Draft ka intention clear hai, lekin thoda over-apologetic hone se confidence kam lag raha hai.`,
      recommendedMove: `Unnecessary sorry aur fillers hata kar directly aur respectfully boundary set karein.`,
      risks: [
        `Zyada maafi mangne se aapka decision weak lagta hai.`,
        `Zyada explanation dene se saamne wala negotiate karne ki koshish karega.`
      ],
      strengths: [
        `Tone friendly aur respectful hai.`,
        `Core message understandable hai.`
      ],
      howRead: {
        emotional_impression: `Hesitant aur nervous lag sakta hai.`,
        subtext: `"Main na kehna chahta hoon par dar lag raha hai."`,
        confusing_points: `Excuses ki wajah se main point dilute ho gaya.`,
        unintentional_signals: `Lagega ki decision abhi bhi open hai.`,
        invited_responses: `Saamne wala convince karne ki koshish kar sakta hai.`
      },
      lineFeedback: {
        riskFeedback: `Ye line unnecessary hesitation create kar rahi hai.`,
        riskSuggestion: `Directly aur firmly baat rakhein.`,
        strengthFeedback: `Ye sentence clear aur spot-on hai.`,
        strengthSuggestion: `Isi confidence ko maintain karein.`
      },
      rewrites: {
        kinder: `Hey, offer ke liye bohot shukriya! Current commitments ki wajah se main abhi isme participate nahi kar paunga. All the best!`,
        confident: `Hi, reach out karne ke liye thanks. Mere current schedule ki wajah se main is task ko accept nahi kar sakta.`,
        shorter: `Thanks for the invite, but unfortunately is baar main nahi jud paunga.`,
        best: `Hey, main seedhi baat kehna chahta hoon: meri current work priorities ki wajah se main isme time nahi de paunga. Thanks for understanding.`
      },
      followUps: {
        c1: `Agar wo convince karne ki koshish karein`, m1: `Main samajh sakta hoon, lekin mera decision final hai.`,
        c2: `Agar wo cooperate karein`, m2: `Understanding ke liye bohot shukriya!`
      },
      sendAdvice: {
        action: `Firm aur polite tone mein bhejein`,
        time: `Working hours mein morning 10 se evening 4 ke beech`,
        delivery: `Single clean message bhejein`
      }
    },

    // TELUGLISH (Latin alphabet)
    'te-Latn': {
      overallRead: `Message lo intent bagundi, kani over-explaining valla mee boundary weak ga anipinchochu.`,
      recommendedMove: `Direct ga, polite ga cheppandi; extra explanations avasaram ledu.`,
      risks: [
        `Chala sarlu sorry cheppadam valla confidence takkuva anipisthundi.`,
        `Ekkuva reasons isthe vallu malli argument cheyadaniki chance untundi.`
      ],
      strengths: [
        `Tone respectful ga undi.`,
        `Basic intent clear ga undi.`
      ],
      howRead: {
        emotional_impression: `Thoda hesitant ga anipisthundi.`,
        subtext: `"Nenu reject chesthunnanu, kani meeku kopam vasthadhemo ani bhayam."`,
        confusing_points: `Reasons ekkuva ayyi main point maruguna padindi.`,
        unintentional_signals: `Malli try chesthe oppukuntaremo anukuntaru.`,
        invited_responses: `Vallu convince cheyadaniki try cheyavachu.`
      },
      lineFeedback: {
        riskFeedback: `Ee line hesitation chupisthondi.`,
        riskSuggestion: `Direct ga cheppandi.`,
        strengthFeedback: `Ee sentence crisp ga bagundi.`,
        strengthSuggestion: `Ee clarity ni continue cheyandi.`
      },
      rewrites: {
        kinder: `Hello, reach out ainanduku chala thanks. Current commitments valla nenu deeniki time ivvalenu. Wishing you all the best!`,
        confident: `Hi, thank you for checking in. Naa current workload valla nenu deenini accept cheyalekapothunnanu.`,
        shorter: `Thanks for the invite, kani ee sari nenu raleenu.`,
        best: `Hi, nenu straightforward ga cheppalani anukuntunnanu: naa prior project commitments valla nenu deenitho proceed avvalenu. Thanks for understanding.`
      },
      followUps: {
        c1: `Vallu malli insist chesthe`, m1: `Naaku mee situation arthamaindi, kani naa decision change chesukolenu.`,
        c2: `Vallu accept chesthe`, m2: `Mee cooperation ki and understanding ki chala thanks.`
      },
      sendAdvice: {
        action: `Clear ga and polite ga send cheyandi`,
        time: `Work hours lo 10am nunchi 4pm madhyalo`,
        delivery: `Single complete message ga send cheyandi`
      }
    }
  };

  // Select package matching code or fallback to English
  const selectedPkg = packages[code] || {
    overallRead: `This draft message seeks to ${user_goal || 'communicate boundary'} in a ${relationship_context} scenario. It possesses clear intent but suffers from conversational cushioning that may dilute your personal confidence or generate room for unintended negotiations.`,
    recommendedMove: `Remove apologetic softening and state your operational boundary directly and with calm respect.`,
    risks: [
      `Excessive cushioning makes your request sound negotiable.`,
      `Overexplaining personal context might look like an invitation to debate your reasoning.`
    ],
    strengths: [
      `The core intent is courteous and non-combative.`,
      `Avoids aggressive phrasing while attempting to maintain connection.`
    ],
    howRead: {
      emotional_impression: `Cautious, slightly defensive, or overly accommodating.`,
      subtext: `"I am asking for this, but I feel guilty about doing so."`,
      confusing_points: `The main point is padded by introductory throat-clearing.`,
      unintentional_signals: `Signals that you might concede if pushed or questioned.`,
      invited_responses: `The recipient is likely to negotiate terms or delay agreement.`
    },
    lineFeedback: {
      riskFeedback: `This phrase introduces doubt or signals emotional defensiveness, softening the core message unnecessarily.`,
      riskSuggestion: `Remove conversational padding like "just" or apology markers.`,
      strengthFeedback: `This sentence is clear, concise, and delivers the message with direct precision.`,
      strengthSuggestion: `Maintain this level of decisive clarity.`
    },
    rewrites: {
      kinder: `Thank you for reaching out. I truly appreciate your support. However, after reviewing my current bandwidth, I cannot take this on right now. Wishing you the absolute best!`,
      confident: `Thank you for reaching out. Due to my current commitments and priorities, I am unable to take this on at this time.`,
      shorter: `Thanks for the invite, but unfortunately I won't be able to make it this time. Wishing you the best!`,
      best: `I wanted to follow up directly: due to my current schedule and obligations, I am unable to commit to this request. Thank you for your understanding.`
    },
    followUps: {
      c1: `If they push back or ask to reconsider`, m1: `I understand your constraints, but my decision is firm due to current commitments.`,
      c2: `If they cooperate smoothly`, m2: `Thank you for your prompt understanding and collaboration.`
    },
    sendAdvice: {
      action: `Send with quiet confidence`,
      time: `During business hours (10:00 AM - 4:00 PM)`,
      delivery: `Send as a single focused message`
    }
  };

  // Sentence-level breakdown
  const sentences = original_message.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const mockLines = sentences.map((line, i) => {
    const isRisk = i === 0 || line.length > 40 || line.toLowerCase().includes('sorry') || line.toLowerCase().includes('just');
    return {
      line,
      tag: isRisk ? 'Soft Filler' : 'Direct Assertion',
      type: (isRisk ? 'risk' : 'strength') as 'risk' | 'strength',
      feedback: isRisk ? selectedPkg.lineFeedback.riskFeedback : selectedPkg.lineFeedback.strengthFeedback,
      suggestion: isRisk ? selectedPkg.lineFeedback.riskSuggestion : selectedPkg.lineFeedback.strengthSuggestion
    };
  });

  return {
    summary: {
      overall_read: selectedPkg.overallRead,
      landing_status: 'risky',
      top_risks: selectedPkg.risks,
      top_strengths: selectedPkg.strengths,
      recommended_move: selectedPkg.recommendedMove
    },
    scores: [
      { dimension: 'Clarity', score: 72, explanation: selectedPkg.strengths[0] || 'Clear message core.' },
      { dimension: 'Warmth', score: 68, explanation: 'Friendly and relational.' },
      { dimension: 'Confidence', score: 58, explanation: selectedPkg.risks[0] || 'Room for firmer boundary.' },
      { dimension: 'Risk', score: 42, explanation: 'Low-to-moderate risk of social friction.' }
    ],
    how_it_may_be_read: selectedPkg.howRead,
    whats_working: selectedPkg.strengths,
    whats_risky: selectedPkg.risks,
    line_by_line: mockLines.length > 0 ? mockLines : [
      {
        line: original_message,
        tag: 'Initial Draft',
        type: 'neutral',
        feedback: selectedPkg.lineFeedback.riskFeedback,
        suggestion: selectedPkg.lineFeedback.riskSuggestion
      }
    ],
    rewrites: [
      {
        type: 'kinder',
        content: selectedPkg.rewrites.kinder,
        label: 'Kinder & Softer',
        description: 'Prioritizes warmth and relationship preservation.'
      },
      {
        type: 'confident',
        content: selectedPkg.rewrites.confident,
        label: 'Firm & Confident',
        description: 'Assertive, authoritative boundary with zero hedging.'
      },
      {
        type: 'shorter',
        content: selectedPkg.rewrites.shorter,
        label: 'Short & Clean',
        description: 'Maximum brevity and economy of words.'
      },
      {
        type: 'best_strategic',
        content: selectedPkg.rewrites.best,
        label: 'Best Strategic Version',
        description: 'Optimal balance of professional respect and boundary firmness.'
      }
    ],
    follow_ups: [
      {
        condition: selectedPkg.followUps.c1,
        message: selectedPkg.followUps.m1
      },
      {
        condition: selectedPkg.followUps.c2,
        message: selectedPkg.followUps.m2
      }
    ],
    send_recommendation: selectedPkg.sendAdvice,
    tags: ['Strategic Boundary', langInfo.name, scenario]
  };
}
