import {
    ActivityIndicator,
    Animated,
    Easing,
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
import Markdown from 'react-native-markdown-display';
import { sendChatMessage } from '../../services/api/chat';
import { loadActiveChat, saveActiveChat, clearActiveChat } from '../../services/storage/chatStorage';

type Props = { initialMessage?: string; onChatTitleResolved?: (title: string) => void; onChatActiveChange?: (active: boolean, idChat?: number) => void };

type Message = { id: string; text: string; isUser: boolean; timestamp: Date; isAnimating?: boolean };


function ChatMarkdown({text, style, animateWords}: { text: string; style: any; animateWords: boolean }) {
    const indexRef = useRef(0);
    const getDelay = React.useCallback(() => (indexRef.current++) * 70, []);
    const capDelay = (d: number) => Math.min(d, 1200);

    const FadeInView: React.FC<{ delay?: number; children: React.ReactNode }> = ({delay = 0, children}) => {
        const opacity = React.useRef(new Animated.Value(0)).current;
        React.useEffect(() => {
            Animated.timing(opacity, {toValue: 1, duration: 240, delay: capDelay(delay), useNativeDriver: true}).start();
        }, [delay, opacity]);
        return <Animated.View style={{opacity}}>{children}</Animated.View>;
    };
    const FadeInText: React.FC<{ delay?: number; style?: any; children: React.ReactNode }> = ({delay = 0, style, children}) => {
        const opacity = React.useRef(new Animated.Value(0)).current;
        React.useEffect(() => {
            Animated.timing(opacity, {toValue: 1, duration: 240, delay: capDelay(delay), useNativeDriver: true}).start();
        }, [delay, opacity]);
        return <Animated.Text style={[{opacity}, style]}>{children}</Animated.Text>;
    };

    const rules = React.useMemo(() => {
        const containerFadeInline = (styleKey: string) => (node: any, children: any, _parent: any, stylesArg: any) => (
            <FadeInText key={node.key} delay={capDelay(getDelay())} style={stylesArg?.[styleKey]}>{children}</FadeInText>
        );
        const containerFadeHeading = (styleKey: string) => (node: any, children: any, _parent: any, stylesArg: any) => (
            <FadeInText key={node.key} delay={capDelay(getDelay())} style={stylesArg?.[styleKey]}>{children}</FadeInText>
        );
        const containerFadeBlock = () => (node: any, children: any) => (
            <FadeInView key={node.key} delay={capDelay(getDelay())}>{children}</FadeInView>
        );
        const markdownContainers = new Set([
            'strong', 'em', 'link', 'inlineCode',
            'heading1', 'heading2', 'heading3', 'heading4', 'heading5', 'heading6',
            'list_item', 'ordered_list', 'bullet_list',
            'code_block', 'fence', 'blockquote'
        ]);
        return {
            text: (node: any, _children: any, parent: any, stylesArg: any) => {
                const content: string = node.content ?? '';
                if (!content) return null;
                const parentType = parent?.type;
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
                            return <FadeInText key={`${node.key}-w-${i}`} delay={delay}>{tok}</FadeInText>;
                        })}
                    </Text>
                );
            },
            strong: containerFadeInline('strong'),
            em: containerFadeInline('em'),
            link: containerFadeInline('link'),
            inlineCode: containerFadeInline('inlineCode'),
            heading1: containerFadeHeading('heading1'),
            heading2: containerFadeHeading('heading2'),
            heading3: containerFadeHeading('heading3'),
            heading4: containerFadeHeading('heading4'),
            heading5: containerFadeHeading('heading5'),
            heading6: containerFadeHeading('heading6'),
            list_item: containerFadeBlock(),
            ordered_list: containerFadeBlock(),
            bullet_list: containerFadeBlock(),
            code_block: containerFadeBlock(),
            fence: containerFadeBlock(),
            blockquote: containerFadeBlock()
        } as const;
    }, [animateWords, getDelay]);

    indexRef.current = 0;
    return <Markdown style={style} rules={rules}>{text}</Markdown>;
}

const GreySpinner: React.FC<{ size?: number; thickness?: number; color?: string }> = ({ size = 28, thickness = 3, color = '#9AA3AF' }) => {
    const rotate = React.useRef(new Animated.Value(0)).current;
    React.useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(rotate, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => rotate.stopAnimation();
    }, [rotate]);
    const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const baseColor = '#E5E7EB';
    return (
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <View style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: thickness,
                borderColor: baseColor,
                borderTopColor: color,
                borderRightColor: color
            }} />
        </Animated.View>
    );
};

export default function ChatScreen({initialMessage, onChatTitleResolved, onChatActiveChange}: Props) {
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [idChat, setIdChat] = useState<number | null>(null);
    const idChatRef = useRef<number | null>(null);
    const [titleStored, setTitleStored] = useState(false);
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [hydrated, setHydrated] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (initialMessage != null && initialMessage !== '') {
                    await clearActiveChat();
                    if (!mounted) return;
                    const welcomeMessage: Message = {
                        id: 'welcome-' + Date.now(),
                        text: initialMessage,
                        isUser: false,
                        timestamp: new Date()
                    };
                    setMessages([welcomeMessage]);
                    setHydrated(true);
                    return;
                }
                const persisted = await loadActiveChat();
                if (persisted && mounted) {
                    setIdChat(persisted.idChat);
                    idChatRef.current = persisted.idChat;
                    if (persisted.title) {
                        setTitle(persisted.title);
                        setTitleStored(true);
                        onChatTitleResolved?.(persisted.title);
                    }
                    const restored: Message[] = (persisted.messages || []).map(m => ({
                        id: m.id,
                        text: m.text,
                        isUser: m.isUser,
                        timestamp: new Date(m.timestamp)
                    }));
                    if (restored.length > 0) {
                        setMessages(restored);
                        setHydrated(true);
                        return;
                    }
                }
                if (mounted) {
                    const welcomeMessage: Message = {
                        id: 'welcome-' + Date.now(),
                        text: initialMessage || 'Olá! Como posso ajudá-lo hoje?',
                        isUser: false,
                        timestamp: new Date()
                    };
                    setMessages([welcomeMessage]);
                    setHydrated(true);
                }
            } catch (e) {
                if (__DEV__) console.error('Falha ao hidratar chat:', e);
                if (mounted) {
                    const welcomeMessage: Message = {
                        id: 'welcome-' + Date.now(),
                        text: initialMessage || 'Olá! Como posso ajudá-lo hoje?',
                        isUser: false,
                        timestamp: new Date()
                    };
                    setMessages([welcomeMessage]);
                    setHydrated(true);
                }
            }
        })();
        return () => { mounted = false; };
    }, []);

    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({animated: true});
        }, 100);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        const toPersist = {
            idChat,
            messages: messages.map(m => ({ id: m.id, text: m.text, isUser: m.isUser, timestamp: m.timestamp.toISOString() })),
            title
        };
        saveActiveChat(toPersist).catch(() => {});
    }, [messages, idChat, title, hydrated]);

    const sendMessage = useCallback(async () => {
        if (!inputText.trim() || loading) return;
        const contentToSend = inputText.trim();
        const localUserMessage: Message = {
            id: Date.now().toString(), text: contentToSend, isUser: true, timestamp: new Date()
        };
        setMessages(prev => [...prev, localUserMessage]);
        setInputText('');
        setLoading(true);
        scrollToBottom();
        try {
            const payload = idChat != null ? { id_chat: idChat, conteudo: contentToSend } : { conteudo: contentToSend };
            const data = await sendChatMessage(payload);

            if (data && typeof data.id_chat === 'number' && idChat == null) {
                setIdChat(data.id_chat);
            }
            if (!titleStored && data?.titulo) {
                setTitleStored(true);
                setTitle(data.titulo);
                onChatTitleResolved?.(data.titulo);
            }

            const responseMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: data?.conteudo ?? 'Desculpe, não consegui processar sua mensagem.',
                isUser: (data?.tipo || 'A') === 'U',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, responseMessage]);
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
    }, [inputText, loading, scrollToBottom, idChat, titleStored, onChatTitleResolved]);

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

    useEffect(() => {
        idChatRef.current = idChat;
        if (idChat != null) onChatActiveChange?.(true, idChat);
    }, [idChat, onChatActiveChange]);

    useEffect(() => {
        return () => {
            onChatActiveChange?.(false);
        };
    }, [onChatActiveChange]);

    if (!hydrated) {
        return (
            <View style={[styles.container, styles.centeredHydrate]}>
                <View style={styles.hydrateWrap}>
                    <GreySpinner size={28} thickness={3} color={'#9AA3AF'} />
                    <Text style={styles.hydrateText}>Carregando mensagens…</Text>
                </View>
            </View>
        );
    }

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
    centeredHydrate: { justifyContent: 'center', alignItems: 'center' },
    hydrateWrap: { alignItems: 'center', gap: 8 },
    hydrateText: { marginTop: 6, fontSize: 13, color: '#4a5a6a' },
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
