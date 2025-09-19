import React, {useCallback, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Animated, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from '../api/client';

type Props = {
  onBack: () => void;
  initialMessage?: string;
};

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isAnimating?: boolean;
};

// Componente para animação de texto palavra por palavra
const AnimatedText = React.memo(({text, onAnimationComplete}: {text: string; onAnimationComplete?: () => void}) => {
  const words = text.split(' ');
  const [animatedValues, setAnimatedValues] = useState<Animated.Value[]>([]);

  // Inicializar valores animados quando o texto mudar
  useEffect(() => {
    const newAnimatedValues = words.map(() => new Animated.Value(0));
    setAnimatedValues(newAnimatedValues);
  }, [words]);

  // Executar animação quando os valores animados estiverem prontos
  useEffect(() => {
    if (animatedValues.length === 0 || animatedValues.length !== words.length) {
      return;
    }

    // Reset all values to 0
    animatedValues.forEach(value => value.setValue(0));

    // Start word-by-word animation
    const animateWords = () => {
      words.forEach((_, index) => {
        setTimeout(() => {
          Animated.timing(animatedValues[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }).start(() => {
            // Call completion callback when last word is animated
            if (index === words.length - 1 && onAnimationComplete) {
              setTimeout(onAnimationComplete, 100);
            }
          });
        }, index * 200); // 200ms delay between words
      });
    };

    // Small delay before starting animation
    const timer = setTimeout(animateWords, 200);
    return () => clearTimeout(timer);
  }, [animatedValues, words, onAnimationComplete]);

  // Don't render anything until animated values are ready
  if (animatedValues.length !== words.length) {
    return <Text style={[styles.messageText, styles.aiMessageText]}> </Text>;
  }

  return (
    <Text style={styles.messageText}>
      {words.map((word, index) => (
        <Animated.Text
          key={`${text}-${index}`} // Use text in key to force re-render on text change
          style={[
            styles.aiMessageText,
            {
              opacity: animatedValues[index],
              transform: [
                {
                  translateY: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [15, 0],
                  }),
                },
                {
                  scale: animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {word}{index < words.length - 1 ? ' ' : ''}
        </Animated.Text>
      ))}
    </Text>
  );
});

export default function ChatScreen({onBack, initialMessage}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Add welcome message
    setMessages(prevMessages => [
      {
        id: 'welcome',
        text: initialMessage || 'Olá! Como posso ajudá-lo hoje?',
        isUser: false,
        timestamp: new Date(),
      },
      ...prevMessages,
    ]);
  }, [initialMessage]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({animated: true});
    }, 100);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    try {
      const response = await api.post('/chat/message', {
        message: userMessage.text,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response || 'Desculpe, não consegui processar sua mensagem.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      scrollToBottom();
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      if (__DEV__) {
        console.error('Chat error:', error);
      }
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [inputText, loading, scrollToBottom]);

  const renderMessage = useCallback(({item}: {item: Message}) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.aiMessage
    ]}>
      {item.isUser ? (
        // Mensagem do usuário - texto normal
        <Text style={[styles.messageText, styles.userMessageText]}>
          {item.text}
        </Text>
      ) : (
        // Mensagem da IA - com animação palavra por palavra
        <AnimatedText
          text={item.text}
          onAnimationComplete={() => {
            // Opcional: fazer algo quando a animação terminar
            scrollToBottom();
          }}
        />
      )}
      <Text style={[
        styles.timestamp,
        item.isUser ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
      </Text>
    </View>
  ), [scrollToBottom]);

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Chat IA</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Digite sua mensagem..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Enviar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 8,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
