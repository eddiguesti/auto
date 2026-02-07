/**
 * AIAssistantScreen
 * Interview-style AI writing assistant
 * Matches webapp's AIAssistant.jsx styling exactly
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAIAssistant, Message } from '../hooks/useAIAssistant';
import { colors, spacing, fonts } from '../utils/theme';
import haptics from '../utils/haptics';
import { IconX, IconFeather, IconCheck } from '../components/Icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Heritage colors from STYLE_GUIDE.md
const COLORS = {
  cream: '#FBF7F2',
  card: '#FFFCF9',
  ink: '#3D3833',
  text: '#6B6560',
  sepia: '#9C7B5C',
  sepiaLight: '#D4C4B0',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber600: '#D97706',
  amber800: '#92400E',
};

interface QuestionContext {
  chapterId: string;
  question: {
    id: string;
    question: string;
    prompt?: string;
  };
  answer?: string;
}

// Message bubble matching webapp exactly
function MessageBubble({ message, index }: { message: Message; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isUser = message.role === 'user';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: 50,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease),
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.messageRowUser : styles.messageRowAssistant,
        { opacity: fadeAnim },
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    </Animated.View>
  );
}

// Typing indicator matching webapp
function TypingIndicator() {
  return (
    <View style={styles.messageRowAssistant}>
      <View style={styles.typingBubble}>
        <View style={styles.typingDots}>
          <Animated.View style={styles.typingDot} />
          <Animated.View style={styles.typingDot} />
          <Animated.View style={styles.typingDot} />
        </View>
      </View>
    </View>
  );
}

export default function AIAssistantScreen({ navigation, route }: any) {
  const { context, onInsertText } = route.params as {
    context: QuestionContext;
    onInsertText: (text: string) => void;
  };

  const {
    messages,
    phase,
    loading,
    editableStory,
    gatheredContent,
    startInterview,
    sendResponse,
    markReady,
    writeStory,
    setEditableStory,
    insertStory,
    resetConversation,
    generateDraftAndClose,
  } = useAIAssistant(context);

  const [input, setInput] = useState('');
  const [closing, setClosing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      haptics.lightTap();
      sendResponse(input);
      setInput('');
    }
  };

  const handleClose = async () => {
    haptics.lightTap();
    const userResponses = gatheredContent.filter(g => g.type === 'response');
    if (userResponses.length > 0 && phase !== 'review') {
      setClosing(true);
      const draft = await generateDraftAndClose();
      if (draft) {
        onInsertText(draft);
      }
      setClosing(false);
    }
    navigation.goBack();
  };

  const handleInsertStory = () => {
    haptics.success();
    const story = insertStory();
    if (story) {
      onInsertText(story);
    }
    navigation.goBack();
  };

  const handleStartOver = () => {
    haptics.lightTap();
    resetConversation();
  };

  const getPhaseStatus = () => {
    if (closing) return 'Saving your draft...';
    switch (phase) {
      case 'start': return 'Ready to help craft your story';
      case 'interview': return 'Gathering your memories...';
      case 'ready': return 'Ready to compose your narrative';
      case 'writing': return 'Crafting your story...';
      case 'review': return 'Review and edit before saving';
      default: return '';
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <MessageBubble message={item} index={index} />
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header - matches webapp bg-sepia/5 */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Writing Assistant</Text>
              <Text style={styles.headerSubtitle}>{getPhaseStatus()}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={closing}
            >
              {closing ? (
                <Text style={styles.closingText}>...</Text>
              ) : (
                <Text style={styles.closeX}>×</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Context Preview - matches webapp */}
          <View style={styles.contextBar}>
            <Text style={styles.contextText} numberOfLines={2}>
              "{context.question.question}"
            </Text>
          </View>

          {/* Start Screen */}
          {phase === 'start' && (
            <View style={styles.startScreen}>
              <View style={styles.startIcon}>
                <IconFeather size={32} color={COLORS.sepia} />
              </View>
              <Text style={styles.startTitle}>
                Let's Write Your Story Together
              </Text>
              <Text style={styles.startDescription}>
                I'll ask questions to draw out the details of your memory. Once we've gathered enough,
                I'll compose it into a beautifully written passage for your autobiography.
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => {
                  haptics.mediumTap();
                  startInterview();
                }}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator color="rgba(255,255,255,0.9)" />
                ) : (
                  <Text style={styles.startButtonText}>Begin Conversation</Text>
                )}
              </TouchableOpacity>

              {context.answer && context.answer.trim() && (
                <Text style={styles.startNote}>
                  I'll build upon what you've already written.
                </Text>
              )}
            </View>
          )}

          {/* Chat Messages */}
          {phase !== 'start' && (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={loading ? <TypingIndicator /> : null}
            />
          )}

          {/* Input Area - matches webapp bg-sepia/5 */}
          {phase !== 'start' && (
            <View style={styles.inputArea}>
              {/* Ready Button */}
              {phase === 'interview' && gatheredContent.length >= 2 && !loading && (
                <TouchableOpacity
                  style={styles.readyButton}
                  onPress={() => {
                    haptics.lightTap();
                    markReady();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.readyButtonText}>
                    I've shared enough — compose my story
                  </Text>
                </TouchableOpacity>
              )}

              {/* Compose Button */}
              {phase === 'ready' && !loading && (
                <TouchableOpacity
                  style={styles.composeButton}
                  onPress={() => {
                    haptics.mediumTap();
                    writeStory();
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={styles.composeButtonEmoji}>*</Text>
                  <Text style={styles.composeButtonText}>Compose My Story</Text>
                </TouchableOpacity>
              )}

              {/* Review Phase */}
              {phase === 'review' && !loading && editableStory && (
                <View style={styles.reviewContainer}>
                  {/* Amber header */}
                  <View style={styles.reviewHeader}>
                    <IconFeather size={16} color={COLORS.amber600} />
                    <Text style={styles.reviewTitle}>Review & edit before saving</Text>
                    <Text style={styles.reviewHint}>Fix any names, dates or details</Text>
                  </View>

                  {/* Textarea */}
                  <View style={styles.reviewTextareaContainer}>
                    <TextInput
                      style={styles.reviewTextarea}
                      value={editableStory}
                      onChangeText={setEditableStory}
                      multiline
                      textAlignVertical="top"
                      placeholder="Your story..."
                      placeholderTextColor={COLORS.text}
                    />
                  </View>

                  {/* Save button */}
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleInsertStory}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.saveButtonEmoji}>*</Text>
                    <Text style={styles.saveButtonText}>Save to My Story</Text>
                  </TouchableOpacity>

                  {/* Secondary actions */}
                  <View style={styles.reviewActions}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        haptics.lightTap();
                        setEditableStory('');
                        writeStory();
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>Regenerate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={handleStartOver}
                    >
                      <Text style={styles.secondaryButtonText}>Start over</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Text Input */}
              {(phase === 'interview' || phase === 'ready') && (
                <View style={styles.inputContainer}>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.textInput}
                      value={input}
                      onChangeText={setInput}
                      placeholder="Share more details..."
                      placeholderTextColor={COLORS.text}
                      multiline
                      editable={!loading && !closing}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[
                        styles.sendButton,
                        (!input.trim() || loading) && styles.sendButtonDisabled,
                      ]}
                      onPress={handleSend}
                      disabled={!input.trim() || loading}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                  </View>

                  {messages.length > 2 && (
                    <TouchableOpacity onPress={handleStartOver} style={styles.startOverLink}>
                      <Text style={styles.startOverText}>Start over</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F3', // webapp bg-[#faf8f3]
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Header - webapp: bg-sepia/5 border-b border-sepia/20
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 123, 92, 0.2)', // border-sepia/20
    backgroundColor: 'rgba(156, 123, 92, 0.05)', // bg-sepia/5
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: fonts.bodyMedium,
    color: COLORS.ink,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: fonts.bodyItalic,
    color: 'rgba(156, 123, 92, 0.7)', // text-sepia/70
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: 24,
    color: 'rgba(156, 123, 92, 0.6)', // text-sepia/60
  },
  closingText: {
    fontSize: 12,
    color: COLORS.sepia,
  },

  // Context - webapp: border-b border-sepia/10
  contextBar: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(156, 123, 92, 0.1)', // border-sepia/10
  },
  contextText: {
    fontSize: 14,
    fontFamily: fonts.bodyItalic,
    color: 'rgba(156, 123, 92, 0.8)', // text-sepia/80
  },

  // Start Screen
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  startIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 123, 92, 0.1)', // bg-sepia/10
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  startTitle: {
    fontSize: 20,
    fontFamily: fonts.bodyMedium,
    color: COLORS.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  startDescription: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: 'rgba(156, 123, 92, 0.7)', // text-sepia/70
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    maxWidth: 320,
  },
  startButton: {
    width: '100%',
    maxWidth: 280,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.ink, // bg-ink
    borderRadius: 8,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'rgba(255, 255, 255, 0.9)', // text-white/90
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  startNote: {
    fontSize: 14,
    fontFamily: fonts.bodyItalic,
    color: 'rgba(156, 123, 92, 0.5)', // text-sepia/50
    marginTop: 16,
    textAlign: 'center',
  },

  // Messages
  messagesList: {
    padding: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.85,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8, // webapp: rounded
  },
  userBubble: {
    backgroundColor: 'rgba(156, 123, 92, 0.1)', // bg-sepia/10
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.2)', // border-sepia/20
  },
  assistantBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // bg-white/70
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.1)', // border-sepia/10
  },
  messageText: {
    fontSize: 15,
    fontFamily: fonts.body,
    color: COLORS.ink,
    lineHeight: 24, // leading-relaxed
  },

  // Typing
  typingBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // bg-white/70
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.1)', // border-sepia/10
  },
  typingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(156, 123, 92, 0.4)', // bg-sepia/40
  },

  // Input Area - webapp: bg-sepia/5 border-t border-sepia/15
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(156, 123, 92, 0.15)', // border-sepia/15
    backgroundColor: 'rgba(156, 123, 92, 0.05)', // bg-sepia/5
    gap: 12,
  },
  inputContainer: {
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)', // bg-white/70
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.2)', // border-sepia/20
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
    color: COLORS.ink,
    maxHeight: 100,
    minHeight: 48,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.ink, // bg-ink
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: 'rgba(255, 255, 255, 0.9)', // text-white/90
    fontSize: 15,
    fontFamily: fonts.sans,
  },
  startOverLink: {
    alignSelf: 'flex-start',
  },
  startOverText: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: 'rgba(156, 123, 92, 0.4)', // text-sepia/40
  },

  // Ready Button - webapp: border border-sepia/30 rounded
  readyButton: {
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.3)', // border-sepia/30
    borderRadius: 8,
    alignItems: 'center',
  },
  readyButtonText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: COLORS.sepia,
  },

  // Compose Button - webapp: bg-ink text-white/90 rounded
  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.ink,
    borderRadius: 8,
    gap: 8,
  },
  composeButtonEmoji: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  composeButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontFamily: fonts.sans,
  },

  // Review - webapp: bg-white rounded-lg border border-sepia/20
  reviewContainer: {
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.amber50, // bg-amber-50
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(253, 230, 138, 0.5)', // border-amber-200/50
    gap: 8,
  },
  reviewTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: COLORS.amber800, // text-amber-800
  },
  reviewHint: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: 'rgba(217, 119, 6, 0.7)', // text-amber-600/70
  },
  reviewTextareaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.2)', // border-sepia/20
    overflow: 'hidden',
  },
  reviewTextarea: {
    padding: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    color: COLORS.ink,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 200,
  },

  // Save Button - webapp: bg-sepia text-white rounded
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.sepia, // bg-sepia
    borderRadius: 8,
    gap: 8,
  },
  saveButtonEmoji: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
  },

  // Secondary Buttons - webapp: border border-sepia/15 rounded
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(156, 123, 92, 0.15)', // border-sepia/15
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: fonts.body,
    color: 'rgba(156, 123, 92, 0.6)', // text-sepia/60
  },
});
