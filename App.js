import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';

const LANGUAGES = {
  NO_TO_ZH: {
    from: 'no',
    to: 'zh-TW',
    fromLabel: '挪威語',
    toLabel: '中文',
    speechLang: 'zh-TW',
    placeholder: '輸入挪威語文字...\n（點鍵盤麥克風可語音輸入）',
  },
  ZH_TO_NO: {
    from: 'zh-TW',
    to: 'no',
    fromLabel: '中文',
    toLabel: '挪威語',
    speechLang: 'nb-NO',
    placeholder: '輸入中文文字...\n（點鍵盤麥克風可語音輸入）',
  },
};

async function fetchTranslation(text, from, to) {
  // 方案一：Google Translate 非官方端點
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data[0].map(seg => seg[0]).join('');
    if (translated) return translated;
  } catch {}

  // 方案二：MyMemory 備用
  const mmFrom = from === 'zh-TW' ? 'zh' : from;
  const mmTo = to === 'zh-TW' ? 'zh' : to;
  const url2 = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${mmFrom}|${mmTo}`;
  const res2 = await fetch(url2);
  const data2 = await res2.json();
  if (data2.responseStatus === 200) {
    const raw = data2.responseData.translatedText;
    return raw.includes('%') ? decodeURIComponent(raw) : raw;
  }
  throw new Error(`翻譯失敗：${data2.responseStatus}`);
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [direction, setDirection] = useState('NO_TO_ZH');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const soundRef = React.useRef(null);

  const lang = LANGUAGES[direction];

  const translate = async () => {
    const text = inputText.trim();
    if (!text) return;
    if (text.length > 500) {
      Alert.alert('文字太長', `請縮短至 500 字以內（目前 ${text.length} 字）`);
      return;
    }
    setIsLoading(true);
    setTranslatedText('');
    try {
      const result = await fetchTranslation(text, lang.from, lang.to);
      setTranslatedText(result);
    } catch (e) {
      Alert.alert('翻譯失敗', e.message || '請確認手機有網路連線');
    }
    setIsLoading(false);
  };

  const speak = async () => {
    if (isSpeaking) {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }
    if (!translatedText) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
      });

      const ttsLang = lang.speechLang === 'zh-TW' ? 'zh-TW' : 'no';
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translatedText)}&tl=${ttsLang}&client=tw-ob`;

      setIsSpeaking(true);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setIsSpeaking(false);
        }
      });
    } catch (e) {
      setIsSpeaking(false);
      Alert.alert('朗讀失敗', String(e));
    }
  };

  const toggleDirection = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsSpeaking(false);
    setDirection(prev => (prev === 'NO_TO_ZH' ? 'ZH_TO_NO' : 'NO_TO_ZH'));
    setInputText('');
    setTranslatedText('');
  };

  const clear = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsSpeaking(false);
    setInputText('');
    setTranslatedText('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌍 同步翻譯</Text>
        <Text style={styles.headerSub}>
          {lang.fromLabel} ⇄ {lang.toLabel}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* 切換語言方向 */}
          <TouchableOpacity style={styles.toggleBtn} onPress={toggleDirection}>
            <Text style={styles.toggleText}>
              {lang.fromLabel}  ⇄  {lang.toLabel}
            </Text>
            <Text style={styles.toggleHint}>點擊切換翻譯方向</Text>
          </TouchableOpacity>

          {/* 輸入區 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{lang.fromLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={lang.placeholder}
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, inputText.length > 500 && styles.charCountOver]}>
              {inputText.length} / 500
            </Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.clearBtn} onPress={clear}>
                <Text style={styles.clearBtnText}>清除</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.translateBtn, !inputText.trim() && styles.btnDisabled]}
                onPress={translate}
                disabled={!inputText.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.translateBtnText}>翻譯</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* 輸出區 */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{lang.toLabel}</Text>
            <View style={styles.outputBox}>
              {isLoading ? (
                <ActivityIndicator color="#e94560" size="large" />
              ) : translatedText ? (
                <Text style={styles.translatedText}>{translatedText}</Text>
              ) : (
                <Text style={styles.placeholderText}>翻譯結果會顯示在這裡</Text>
              )}
            </View>
            {translatedText ? (
              <TouchableOpacity style={styles.speakBtn} onPress={speak}>
                <Text style={styles.speakBtnText}>
                  {isSpeaking ? '⏹  停止朗讀' : '🔊  朗讀翻譯'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* 提示 */}
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              💡 語音輸入：點擊輸入框後，按 iOS 鍵盤右下角麥克風圖示即可說話
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    backgroundColor: '#16213e',
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#0f3460',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e94560',
  },
  headerSub: {
    fontSize: 13,
    color: '#a8b2d8',
    marginTop: 4,
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  toggleBtn: {
    backgroundColor: '#0f3460',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: 'bold',
  },
  toggleHint: {
    color: '#a8b2d8',
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    color: '#a8b2d8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 26,
    minHeight: 110,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  clearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a8b2d8',
  },
  clearBtnText: {
    color: '#a8b2d8',
    fontWeight: '600',
    fontSize: 15,
  },
  translateBtn: {
    backgroundColor: '#e94560',
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  translateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  outputBox: {
    minHeight: 110,
    justifyContent: 'center',
  },
  translatedText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 30,
  },
  placeholderText: {
    color: '#555',
    fontSize: 15,
    textAlign: 'center',
  },
  speakBtn: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  speakBtnText: {
    color: '#4A90E2',
    fontWeight: 'bold',
    fontSize: 16,
  },
  charCount: {
    color: '#666',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  charCountOver: {
    color: '#e94560',
  },
  hint: {
    backgroundColor: '#0f3460',
    borderRadius: 10,
    padding: 14,
  },
  hintText: {
    color: '#a8b2d8',
    fontSize: 13,
    lineHeight: 22,
  },
});
