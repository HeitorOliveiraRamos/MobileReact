import {
    ActivityIndicator,
    Animated,
    FlatList,
    Keyboard,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '../../services/api/client';
import Markdown from 'react-native-markdown-display';

type Props = { initialMessage?: string };

type Message = { id: string; text: string; isUser: boolean; timestamp: Date; isAnimating?: boolean };


// Animated Markdown renderer that staggers text node tokens while preserving Markdown styling
function ChatMarkdown({text, style, animateWords}: { text: string; style: any; animateWords: boolean }) {
    const indexRef = useRef(0);
    const getDelay = React.useCallback(() => (indexRef.current++) * 70, []);
    const capDelay = (d: number) => Math.min(d, 1200);

    const FadeIn: React.FC<{ delay?: number; children: React.ReactNode }> = ({delay = 0, children}) => {
        const opacity = React.useRef(new Animated.Value(0)).current;
        React.useEffect(() => {
            Animated.timing(opacity, {toValue: 1, duration: 240, delay: capDelay(delay), useNativeDriver: true}).start();
        }, [delay, opacity]);
        return <Animated.View style={{opacity}}>{children}</Animated.View>;
    };

    const rules = React.useMemo(() => {
        const containerFadeOnce = (node: any, children: any) => (
            <FadeIn key={node.key} delay={capDelay(getDelay())}>{children}</FadeIn>
        );
        const markdownContainers = new Set([
            'strong', 'em', 'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
            'link', 'inlineCode', 'code_block', 'fence', 'blockquote'
        ]);
        return {
            // Animate plain text word-by-word when allowed
            text: (node: any, _children: any, parent: any, stylesArg: any) => {
                const content: string = node.content ?? '';
                if (!content) return null;
                const parentType = parent?.type;
                // Skip word-by-word inside markdown containers or when not animating
                if (!animateWords || markdownContainers.has(parentType)) {
                    return <Text key={node.key} style={stylesArg?.text}>{content}</Text>;
                }
                const tokens = content.split(/(\s+)/);
                return (
                    <Text key={node.key}>
                        {tokens.map((tok: string, i: number) => {
                            if (!tok) return null;
                            if (/^\s+$/.test(tok)) return <Text key={`${node.key}-s-${i}`}>{tok}</Text>;
                            const delay = capDelay(getDelay());
                            return (
                                <FadeIn key={`${node.key}-w-${i}`} delay={delay}>
                                    <Text>{tok}</Text>
                                </FadeIn>
                            );
                        })}
                    </Text>
                );
            },
            // Fade these markdown blocks as a whole once
            strong: (node: any, children: any) => containerFadeOnce(node, children),
            em: (node: any, children: any) => containerFadeOnce(node, children),
            link: (node: any, children: any) => containerFadeOnce(node, children),
            heading1: (node: any, children: any) => containerFadeOnce(node, children),
            heading2: (node: any, children: any) => containerFadeOnce(node, children),
            heading3: (node: any, children: any) => containerFadeOnce(node, children),
            heading4: (node: any, children: any) => containerFadeOnce(node, children),
            heading5: (node: any, children: any) => containerFadeOnce(node, children),
            heading6: (node: any, children: any) => containerFadeOnce(node, children),
            inlineCode: (node: any, children: any) => containerFadeOnce(node, children),
            code_block: (node: any, children: any) => containerFadeOnce(node, children),
            fence: (node: any, children: any) => containerFadeOnce(node, children),
            blockquote: (node: any, children: any) => containerFadeOnce(node, children)
        } as const;
    }, [animateWords, getDelay]);

    // Reset sequence per render to start stagger from the beginning
    indexRef.current = 0;
    return <Markdown style={style} rules={rules}>{text}</Markdown>;
}

export default function ChatScreen({initialMessage}: Props) {
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        const welcomeMessage: Message = {
            id: 'welcome-' + Date.now(),
            text: initialMessage || 'Olá! Como posso ajudá-lo hoje?',
            isUser: false,
            timestamp: new Date()
        };
        setMessages([welcomeMessage]);
    }, [initialMessage]);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({animated: true});
        }, 100);
    }, []);
    const handleAIAnimationComplete = useCallback(() => {
        // Animation removed in favor of Markdown rendering; keep scroll just in case
        scrollToBottom();
    }, [scrollToBottom]);

    const sendMessage = useCallback(async () => {
        if (!inputText.trim() || loading) return;
        const userMessage: Message = {
            id: Date.now().toString(), text: inputText.trim(), isUser: true, timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setLoading(true);
        scrollToBottom();
        try {
            const response = await api.post('/chat/message', {message: userMessage.text});
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.response || 'Desculpe, não consegui processar sua mensagem.',
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            scrollToBottom();
        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
            if (__DEV__) console.error('Erro no chat:', error);
        } finally {
            setLoading(false);
            scrollToBottom();
        }
    }, [inputText, loading, scrollToBottom]);

    const renderMessage = useCallback(({item}: { item: Message }) => (
        <View style={[styles.messageContainer, item.isUser ? styles.userMessage : styles.aiMessage]}>
            {item.isUser ? (
                <Markdown style={markdownStyles.user}>{item.text}</Markdown>
            ) : (
                <ChatMarkdown text={item.text} style={markdownStyles.ai} animateWords={true} />
            )}
            <Text style={[styles.timestamp, item.isUser ? styles.userTimestamp : styles.aiTimestamp]}>
                {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
            </Text>
        </View>
    ), []);

    const keyExtractor = useCallback((item: Message) => item.id, []);

    useEffect(() => {
        const showEvt = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
        const hideEvt = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';
        const showSub = Keyboard.addListener(showEvt, (e: any) => {
            setKeyboardHeight(e.endCoordinates?.height || 0);
            scrollToBottom();
        });
        const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [scrollToBottom]);

    return (<View
            style={[styles.container, {paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0}]}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={keyExtractor}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={scrollToBottom}
                keyboardShouldPersistTaps="handled"
            />
            <View
                style={[styles.inputContainer, {paddingBottom: insets.bottom + 12}]}
            >
                <TextInput
                    style={styles.textInput}
                    placeholder="Digite sua mensagem..."
                    placeholderTextColor="#555"
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={500}
                    editable={!loading}
                    onSubmitEditing={sendMessage}
                    returnKeyType="send"
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
                    onPress={sendMessage}
                    disabled={!inputText.trim() || loading}
                    activeOpacity={0.8}
                >
                    {loading ? (<ActivityIndicator color="white" size="small"/>) : (
                        <Text style={styles.sendButtonText}>Enviar</Text>)}
                </TouchableOpacity>
            </View>
        </View>);
}

// Markdown styles for user and AI messages
const markdownStyles = {
    ai: {
        body: { color: '#000', fontSize: 16, lineHeight: 20 },
        text: { color: '#000' },
        paragraph: { marginTop: 0, marginBottom: 0 },
        heading1: { color: '#000', fontSize: 22, fontWeight: '700' },
        heading2: { color: '#000', fontSize: 20, fontWeight: '700' },
        heading3: { color: '#000', fontSize: 18, fontWeight: '700' },
        strong: { fontWeight: '700' }
    },
    user: {
        body: { color: '#fff', fontSize: 16, lineHeight: 20 },
        text: { color: '#fff' },
        paragraph: { marginTop: 0, marginBottom: 0 },
        heading1: { color: '#fff', fontSize: 22, fontWeight: '700' },
        heading2: { color: '#fff', fontSize: 20, fontWeight: '700' },
        heading3: { color: '#fff', fontSize: 18, fontWeight: '700' },
        strong: { fontWeight: '700' }
    }
} as const;

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#ffffff'},
    content: {flex: 1},
    messagesList: {flex: 1, paddingHorizontal: 16},
    messagesContent: {paddingVertical: 16},
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16
    },
    userMessage: {alignSelf: 'flex-end', backgroundColor: '#007AFF', borderBottomRightRadius: 4},
    aiMessage: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderBottomLeftRadius: 4
    },
    messageText: {fontSize: 16, lineHeight: 20},
    userMessageText: {color: 'white'},
    aiMessageText: {color: '#333'},
    timestamp: {fontSize: 12, marginTop: 4},
    userTimestamp: {color: 'rgba(255, 255, 255, 0.7)', textAlign: 'right'},
    aiTimestamp: {color: '#666'},
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#ddd',
        alignItems: 'flex-end'
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
        color: '#111'
    },
    sendButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginLeft: 8,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center'
    },
    sendButtonDisabled: {backgroundColor: '#ccc'},
    sendButtonText: {color: 'white', fontSize: 16, fontWeight: '600'}
});
