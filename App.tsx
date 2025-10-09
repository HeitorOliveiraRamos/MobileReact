import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Animated,
    AppState,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Modal
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LoginScreen from './src/components/screens/LoginScreen';
import {clearToken as clearTokenStorage, getToken, setToken, getNome, setNome, clearNome} from './src/services/storage/tokenStorage';
import SendFileScreen from './src/components/screens/SendFileScreen';
import ChatScreen from './src/components/screens/ChatScreen';
import {clearAuthToken, isTokenValid, setAuthToken} from './src/services/api/client';
import { endChat } from './src/services/api/chat';
import { clearActiveChat } from './src/services/storage/chatStorage';
import Sidebar, { MenuItem } from './src/components/sidebar/Sidebar';
import { HeaderTitleProvider, useHeaderTitle } from './src/components/header/HeaderTitleContext';

type AppScreen = string;

const SIDEBAR_OPEN_WIDTH = 220;
const SIDEBAR_CLOSED_WIDTH = 60;

function App() {
    const insets = useSafeAreaInsets();
    const [token, setTokenState] = useState<string | null>(null);
    const [nome, setNomeState] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [screen, setScreen] = useState<AppScreen>('menu');
    const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [chatSessionKey, setChatSessionKey] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [titlePopupVisible, setTitlePopupVisible] = useState(false);
    const [titleIsTruncated, setTitleIsTruncated] = useState(false);
    const [logoutPopupVisible, setLogoutPopupVisible] = useState(false);
    const sidebarWidth = useRef(new Animated.Value(SIDEBAR_CLOSED_WIDTH)).current;

    const navigateToChat = useCallback((initialMessage?: string) => {
        setChatInitialMessage(initialMessage);
        setActiveChatId(null);
        setChatSessionKey(k => k + 1);
        setScreen('chat');
    }, []);

    const handleNewChatPress = useCallback(async () => {
        try {
            if (activeChatId != null) {
                await endChat(activeChatId);
            }
        } catch (e) {
        } finally {
            await clearActiveChat();
            setChatInitialMessage(undefined);
            setActiveChatId(null);
            setChatSessionKey(k => k + 1);
        }
    }, [activeChatId]);

    const routes: Array<{ key: AppScreen; label: string; iconClosed?: string; render: () => React.ReactNode }> = [
        {
            key: 'menu',
            label: 'Início',
            iconClosed: '🏠',
            render: () => {
                const iconSource = require('./src/assets/icon.png');
                return (
                    <View style={styles.brandContainer}>
                        <Image source={iconSource} style={styles.brandImage} resizeMode="contain"/>
                    </View>
                );
            }
        },
        {
            key: 'sendFile',
            label: 'Enviar Arquivo',
            iconClosed: '📤',
            render: () => (
                <SendFileScreen onNavigateToChat={navigateToChat} />
            )
        },
        {
            key: 'chat',
            label: 'Chat',
            iconClosed: '💬',
            render: () => (
                <ChatScreen
                    key={chatSessionKey}
                    initialMessage={chatInitialMessage}
                    onChatActiveChange={(active, id) => {
                        setActiveChatId(active ? (id ?? null) : null);
                    }}
                />
            )
        }
    ];

    const menuItems: MenuItem[] = routes.map(r => ({ key: r.key, label: r.label, iconClosed: r.iconClosed }));

    const toggleSidebar = useCallback(() => {
        const next = !sidebarOpen;
        setSidebarOpen(next);
        Animated.timing(sidebarWidth, {
            toValue: next ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false
        }).start();
    }, [sidebarOpen, sidebarWidth]);

    const closeSidebar = useCallback(() => {
        if (sidebarOpen) {
            setSidebarOpen(false);
            Animated.timing(sidebarWidth, {
                toValue: SIDEBAR_CLOSED_WIDTH, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false
            }).start();
        }
    }, [sidebarOpen, sidebarWidth]);

    const handleLogout = useCallback(async () => {
        try {
            await clearTokenStorage();
            await clearNome();
            clearAuthToken();
            setTokenState(null);
            setNomeState(null);
            setScreen('menu');
        } catch (error) {
            console.error('Error during logout:', error);
            setTokenState(null);
            setNomeState(null);
            setScreen('menu');
        }
    }, []);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                const storedToken = await getToken();
                if (storedToken && isTokenValid(storedToken)) {
                    setTokenState(storedToken);
                    setAuthToken(storedToken);
                    const storedNome = await getNome();
                    setNomeState(storedNome ?? null);
                } else if (storedToken) {
                    await clearTokenStorage();
                    await clearNome();
                    clearAuthToken();
                } else {
                    await clearNome();
                }
            } catch (error) {
                console.error('Erro ao inicializar app:', error);
                await clearTokenStorage();
                await clearNome();
                clearAuthToken();
            } finally {
                setHydrated(true);
            }
        };
        initializeApp();
    }, []);

    useEffect(() => {
        setTitlePopupVisible(false);
    }, [screen]);

    useEffect(() => {
        const handleAppStateChange = async (nextAppState: string) => {
            if (nextAppState === 'active' && token) {
                const storedToken = await getToken();
                if (!storedToken || !isTokenValid(storedToken)) {
                    handleLogout();
                }
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, [token, handleLogout]);

    const handleLoggedIn = useCallback(async (newToken: string, newNome: string) => {
        try {
            if (!isTokenValid(newToken)) {
                Alert.alert('Erro', 'Token inválido recebido');
                return;
            }
            await setToken(newToken);
            await setNome(newNome ?? '');
            setTokenState(newToken);
            setNomeState(newNome ?? '');
            setAuthToken(newToken);
            setScreen('menu');
        } catch (error) {
            console.error('Error storing token/nome:', error);
            Alert.alert('Erro', 'Falha ao salvar credenciais');
        }
    }, []);

    const confirmLogout = useCallback(() => {
        setLogoutPopupVisible(true);
    }, []);

    const performLogout = useCallback(async () => {
        setLogoutPopupVisible(false);
        await handleLogout();
    }, [handleLogout]);

    const safeEdges = screen === 'chat' ? (['top', 'right', 'left'] as const) : (['top', 'right', 'left', 'bottom'] as const);


    if (!hydrated) {
        return (<SafeAreaView edges={['top', 'right', 'left', 'bottom']}
                              style={[styles.safeAreaWhite, styles.centeredContainer]}>
                <Text style={styles.loadingTitle}>Carregando…</Text>
                <Text style={styles.loadingSubtitle}>Verificando segurança</Text>
            </SafeAreaView>);
    }
    if (!token) {
        return (<SafeAreaView edges={['top', 'right', 'left', 'bottom']}
                              style={[styles.safeAreaWhite, styles.fullContainer]}>
                <LoginScreen onSuccess={handleLoggedIn}/>
            </SafeAreaView>);
    }

    const currentRoute = routes.find(r => r.key === screen) ?? routes[0];
    const defaultHeaderTitle = currentRoute.key === 'menu' ? 'Tecno Tooling' : currentRoute.label;
    const widthStyle = { width: sidebarWidth } as const;

    return (<SafeAreaView edges={safeEdges} style={styles.safeAreaWhite}>
            <StatusBar translucent={false} backgroundColor={'#122033'} barStyle={'dark-content'}/>
            <Sidebar
                open={sidebarOpen}
                widthStyle={widthStyle}
                title={'Menu'}
                nome={nome}
                onToggle={toggleSidebar}
                items={menuItems}
                activeKey={screen}
                onSelect={(key) => { setScreen(key); closeSidebar(); }}
                onLogout={confirmLogout}
            />
            {sidebarOpen && (<TouchableOpacity style={[styles.overlay, {top: 0, bottom: 0}]} onPress={closeSidebar}
                                               activeOpacity={1}/>)}
            <HeaderTitleProvider defaultTitle={defaultHeaderTitle}>
                <HeaderTitleRenderer
                    defaultTitle={defaultHeaderTitle}
                    screen={screen}
                    activeChatId={activeChatId}
                    onNewChatPress={handleNewChatPress}
                    titleIsTruncated={titleIsTruncated}
                    setTitleIsTruncated={setTitleIsTruncated}
                    bottomPadding={screen === 'chat' ? 0 : insets.bottom}
                    isTitlePopupVisible={titlePopupVisible}
                    onOpenTitlePopup={() => setTitlePopupVisible(true)}
                    onCloseTitlePopup={() => setTitlePopupVisible(false)}
                >
                    {currentRoute.render()}
                </HeaderTitleRenderer>
            </HeaderTitleProvider>

            <Modal
                visible={logoutPopupVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setLogoutPopupVisible(false)}
            >
                <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={() => setLogoutPopupVisible(false)}>
                    <View style={styles.titlePopupContainer}>
                        <Text style={[styles.titlePopupText, {marginBottom: 8}]}>Sair da conta</Text>
                        <Text style={{fontSize: 14, color: '#4a5a6a', textAlign: 'center', marginBottom: 12}}>Tem certeza que deseja sair?</Text>
                        <View style={styles.popupButtonsRow}>
                            <TouchableOpacity style={[styles.popupBtn, styles.popupBtnSecondary]} onPress={() => setLogoutPopupVisible(false)} activeOpacity={0.8}>
                                <Text style={[styles.popupBtnText, styles.popupBtnTextSecondary]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.popupBtn, styles.popupBtnDestructive]} onPress={performLogout} activeOpacity={0.8}>
                                <Text style={[styles.popupBtnText, styles.popupBtnTextDestructive]}>Sair</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>);
}

const HeaderTitleRenderer: React.FC<{
    defaultTitle: string;
    screen: string;
    activeChatId: number | null;
    onNewChatPress: () => void;
    titleIsTruncated: boolean;
    setTitleIsTruncated: (v: boolean) => void;
    bottomPadding: number;
    isTitlePopupVisible: boolean;
    onOpenTitlePopup: () => void;
    onCloseTitlePopup: () => void;
    children: React.ReactNode;
}> = ({ defaultTitle, screen, activeChatId, onNewChatPress, titleIsTruncated, setTitleIsTruncated, bottomPadding, isTitlePopupVisible, onOpenTitlePopup, onCloseTitlePopup, children }) => {
    const { title } = useHeaderTitle();
    const headerTitle = title ?? defaultTitle;
    const shouldOpenPopup = titleIsTruncated || (headerTitle?.length ?? 0) > 18;
    return (
        <View style={[styles.mainArea, {marginLeft: SIDEBAR_CLOSED_WIDTH, paddingBottom: bottomPadding}]}>
            <View style={[styles.header, styles.headerRow]}>
                <View style={styles.headerTitleWrap}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => { if (shouldOpenPopup) onOpenTitlePopup(); }}
                        accessibilityRole="button"
                        accessibilityLabel="Mostrar título completo"
                    >
                        <Text
                            style={styles.appName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            onTextLayout={(e) => {
                                const first = e.nativeEvent.lines?.[0]?.text ?? '';
                                setTitleIsTruncated(first.includes('…'));
                            }}
                        >
                            {headerTitle}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerRight}>
                    {screen === 'chat' && activeChatId != null ? (
                        <TouchableOpacity onPress={onNewChatPress} activeOpacity={0.8} style={styles.newChatBtn}>
                            <Text style={styles.newChatBtnText}>+</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{width: 32, height: 32}} />
                    )}
                </View>
            </View>
            <View style={[styles.mainContentWrapper, screen === 'chat' && {padding: 0}]}>
                {children}
            </View>

            {/* Title full popup now shows the live header title (context or default) */}
            <Modal
                visible={isTitlePopupVisible}
                animationType="fade"
                transparent
                onRequestClose={onCloseTitlePopup}
            >
                <TouchableOpacity style={styles.popupBackdrop} activeOpacity={1} onPress={onCloseTitlePopup}>
                    <View style={styles.titlePopupContainer}>
                        <Text style={styles.titlePopupText}>{headerTitle}</Text>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    safeAreaWhite: {flex: 1, backgroundColor: '#ffffff'},
    safeArea: {flex: 1, backgroundColor: '#122033'},
    appRoot: {flex: 1, flexDirection: 'row', backgroundColor: '#f5f6fa'},
    fullContainer: {flex: 1},
    centeredContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa'},
    loadingTitle: {fontSize: 22, fontWeight: '600', color: '#222', marginBottom: 4},
    loadingSubtitle: {fontSize: 14, color: '#666'},
    mainArea: {flex: 1, flexDirection: 'column', backgroundColor: '#ffffff'},
    header: {
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e6ea',
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#ffffff'
    },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    headerTitleWrap: { flex: 1, minWidth: 0, paddingRight: 12 },
    headerRight: { width: 48, alignItems: 'flex-end', justifyContent: 'center' },
    appName: {fontSize: 20, fontWeight: '700', color: '#1a2533', letterSpacing: 0.5},
    mainContentWrapper: {flex: 1, padding: 16, backgroundColor: '#ffffff'},
    brandContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20},
    brandImage: {width: 160, height: 160, opacity: 0.95},
    brandTagline: {marginTop: 12, fontSize: 14, color: '#4a5a6a', fontWeight: '500'},
    overlay: {
        position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 900
    },
    newChatBtn: {
        backgroundColor: '#007AFF',
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    newChatBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 },
    popupBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    titlePopupContainer: {
        maxWidth: '85%',
        backgroundColor: '#ffffff',
        borderRadius: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#e2e6ea',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5
    },
    titlePopupText: { fontSize: 16, color: '#1a2533', fontWeight: '600', textAlign: 'center' },
    popupButtonsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' },
    popupBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    popupBtnText: { fontSize: 15, fontWeight: '600' },
    popupBtnSecondary: { backgroundColor: '#f1f3f5', borderWidth: 1, borderColor: '#e2e6ea' },
    popupBtnTextSecondary: { color: '#1a2533' },
    popupBtnDestructive: { backgroundColor: '#d93636' },
    popupBtnTextDestructive: { color: '#fff' }
});

export default App;
