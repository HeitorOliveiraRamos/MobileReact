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
    View
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import LoginScreen from './src/components/screens/LoginScreen';
import {clearToken as clearTokenStorage, getToken, setToken} from './src/services/storage/tokenStorage';
import SendFileScreen from './src/components/screens/SendFileScreen';
import ChatScreen from './src/components/screens/ChatScreen';
import {clearAuthToken, isTokenValid, setAuthToken} from './src/services/api/client';

type AppScreen = 'menu' | 'sendFile' | 'chat';

const SIDEBAR_OPEN_WIDTH = 220;
const SIDEBAR_CLOSED_WIDTH = 60;

function App() {
    const insets = useSafeAreaInsets();
    const [token, setTokenState] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [screen, setScreen] = useState<AppScreen>('menu');
    const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
    const [chatTitle, setChatTitle] = useState<string | undefined>(undefined);
    const [activeChatId, setActiveChatId] = useState<number | null>(null);
    const [chatSessionKey, setChatSessionKey] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const sidebarWidth = useRef(new Animated.Value(SIDEBAR_CLOSED_WIDTH)).current;

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
            clearAuthToken();
            setTokenState(null);
            setScreen('menu');
        } catch (error) {
            console.error('Error during logout:', error);
            setTokenState(null);
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
                } else if (storedToken) {
                    await clearTokenStorage();
                    clearAuthToken();
                }
            } catch (error) {
                console.error('Erro ao inicializar app:', error);
                await clearTokenStorage();
                clearAuthToken();
            } finally {
                setHydrated(true);
            }
        };
        initializeApp();
    }, []);

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

    const handleLoggedIn = useCallback(async (newToken: string) => {
        try {
            if (!isTokenValid(newToken)) {
                Alert.alert('Erro', 'Token inválido recebido');
                return;
            }
            await setToken(newToken);
            setTokenState(newToken);
            setAuthToken(newToken);
            setScreen('menu');
        } catch (error) {
            console.error('Error storing token:', error);
            Alert.alert('Erro', 'Falha ao salvar credenciais');
        }
    }, []);

    const confirmLogout = useCallback(() => {
        Alert.alert('Confirmar Logout', 'Tem certeza que deseja sair?', [{
            text: 'Cancelar', style: 'cancel'
        }, {text: 'Sair', style: 'destructive', onPress: handleLogout},]);
    }, [handleLogout]);

    const handleNewChatPress = useCallback(async () => {
        // Rely on ChatScreen unmount to send PUT (end chat), then refresh
        setChatTitle(undefined);
        setChatInitialMessage(undefined);
        setActiveChatId(null);
        setChatSessionKey(k => k + 1);
    }, []);

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
    const arrowIcon = sidebarOpen ? '‹' : '›';
    const iconSource = require('./src/assets/icon.png');
    const headerTitle = screen === 'menu' ? 'Tecno Tooling' : screen === 'sendFile' ? 'Enviar Arquivo' : (chatTitle ?? 'Chat IA');


    return (<SafeAreaView edges={safeEdges} style={styles.safeAreaWhite}>
            <StatusBar translucent={false} backgroundColor={'#122033'} barStyle={'dark-content'}/>
            <Animated.View style={[styles.sidebarOverlay, {
                width: sidebarWidth,
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 12
            }]}>
                <View style={styles.sidebarHeader}>
                    {sidebarOpen && <Text style={styles.sidebarTitle}>Menu</Text>}
                    <TouchableOpacity style={[styles.toggleButton, {marginTop: 4}]} onPress={toggleSidebar} activeOpacity={0.7}>
                        <Text style={styles.toggleIcon}>{arrowIcon}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.sidebarContent}>
                    <TouchableOpacity
                        onPress={() => {
                            setScreen('sendFile');
                            if (sidebarOpen) closeSidebar();
                        }}
                        style={[styles.navItem, screen === 'sendFile' && styles.navItemActive]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.navItemText, screen === 'sendFile' && styles.navItemTextActive]}>
                            {sidebarOpen ? 'Enviar Arquivo' : '📤'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setChatInitialMessage(undefined);
                            setChatTitle(undefined);
                            setScreen('chat');
                            if (sidebarOpen) closeSidebar();
                        }}
                        style={[styles.navItem, screen === 'chat' && styles.navItemActive]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.navItemText, screen === 'chat' && styles.navItemTextActive]}>
                            {sidebarOpen ? 'Chat' : '💬'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            setChatInitialMessage(undefined);
                            setScreen('menu');
                            if (sidebarOpen) closeSidebar();
                        }}
                        style={[styles.navItem, screen === 'menu' && styles.navItemActive]}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.navItemText, screen === 'menu' && styles.navItemTextActive]}>
                            {sidebarOpen ? 'Início' : '🏠'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.sidebarFooter}>
                    <TouchableOpacity onPress={confirmLogout} style={[styles.logoutBtn, {marginBottom: 8}]} activeOpacity={0.8}>
                        <Text style={styles.logoutText}>{sidebarOpen ? 'Sair' : '⎋'}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
            {sidebarOpen && (<TouchableOpacity style={[styles.overlay, {top: 0, bottom: 0}]} onPress={closeSidebar}
                                               activeOpacity={1}/>)}
            <View style={[styles.mainArea, {marginLeft: SIDEBAR_CLOSED_WIDTH, paddingBottom: screen === 'chat' ? 0 : insets.bottom}]}>
                <View style={[styles.header, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]}>
                    <Text style={styles.appName}>{headerTitle}</Text>
                    {screen === 'chat' && activeChatId != null && (
                        <TouchableOpacity onPress={handleNewChatPress} activeOpacity={0.8} style={styles.newChatBtn}>
                            <Text style={styles.newChatBtnText}>+</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={[styles.mainContentWrapper, screen === 'chat' && {padding: 0}]}>
                    {screen === 'menu' && (<View style={styles.brandContainer}>
                        <Image source={iconSource} style={styles.brandImage} resizeMode="contain"/>
                    </View>)}
                    {screen === 'sendFile' && (<SendFileScreen
                        onNavigateToChat={(initialMessage) => {
                            setChatInitialMessage(initialMessage);
                            setChatTitle(undefined);
                            setActiveChatId(null);
                            setChatSessionKey(k => k + 1);
                            setScreen('chat');
                        }}
                    />)}
                    {screen === 'chat' && (<ChatScreen
                        key={chatSessionKey}
                        initialMessage={chatInitialMessage}
                        onChatTitleResolved={(title) => { if (!chatTitle) setChatTitle(title); }}
                        onChatActiveChange={(active, id) => {
                            setActiveChatId(active ? (id ?? null) : null);
                        }}
                    />)}
                </View>
            </View>
        </SafeAreaView>);
}

const styles = StyleSheet.create({
    safeAreaWhite: {flex: 1, backgroundColor: '#ffffff'},
    safeArea: {flex: 1, backgroundColor: '#122033'},
    appRoot: {flex: 1, flexDirection: 'row', backgroundColor: '#f5f6fa'},
    fullContainer: {flex: 1},
    centeredContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f6fa'},
    loadingTitle: {fontSize: 22, fontWeight: '600', color: '#222', marginBottom: 4},
    loadingSubtitle: {fontSize: 14, color: '#666'},
    sidebarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#122033',
        zIndex: 1000,
        paddingTop: 8,
        paddingBottom: 12,
        borderRightWidth: 1,
        borderRightColor: '#1f2f44',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: {width: 2, height: 0},
        elevation: 4
    },
    sidebarHeader: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 12},
    sidebarTitle: {flex: 1, fontSize: 18, fontWeight: '700', color: '#fff'},
    toggleButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1d334d',
        justifyContent: 'center',
        alignItems: 'center'
    },
    toggleIcon: {color: '#fff', fontSize: 20, fontWeight: '600'},
    sidebarContent: {flexGrow: 1, paddingHorizontal: 6},
    navItem: {
        borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, marginVertical: 4, backgroundColor: 'transparent'
    },
    navItemActive: {backgroundColor: '#1d334d'},
    navItemText: {color: '#d0d8e2', fontSize: 15, fontWeight: '500', textAlign: 'center'},
    navItemTextActive: {color: '#fff', fontWeight: '600'},
    sidebarFooter: {paddingHorizontal: 10, marginTop: 12},
    logoutBtn: {borderRadius: 8, paddingVertical: 12, alignItems: 'center', backgroundColor: '#d93636'},
    logoutText: {color: '#fff', fontSize: 15, fontWeight: '600'},
    mainArea: {flex: 1, flexDirection: 'column', backgroundColor: '#ffffff'},
    header: {
        height: 54,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e6ea',
        justifyContent: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#ffffff'
    },
    appName: {fontSize: 20, fontWeight: '700', color: '#1a2533', letterSpacing: 0.5},
    mainContentWrapper: {flex: 1, padding: 16, backgroundColor: '#ffffff'},
    brandContainer: {flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20},
    brandImage: {width: 160, height: 160, opacity: 0.95},
    brandTagline: {marginTop: 12, fontSize: 14, color: '#4a5a6a', fontWeight: '500'},
    menuButton: {
        position: 'absolute',
        left: 16,
        top: 10,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1d334d',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    menuIcon: {color: '#fff', fontSize: 18, fontWeight: '600'},
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
    newChatBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 24 }
});

export default App;
