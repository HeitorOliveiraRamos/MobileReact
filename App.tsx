import React, {useCallback, useEffect, useState} from 'react';
import {Alert, AppState, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import LoginScreen from './src/components/screens/LoginScreen';
import {clearToken as clearTokenStorage, getToken, setToken} from './src/services/storage/tokenStorage';
import SendFileScreen from './src/components/screens/SendFileScreen';
import ChatScreen from './src/components/screens/ChatScreen';
import {clearAuthToken, isTokenValid, setAuthToken} from './src/services/api/client';

type AppScreen = 'menu' | 'sendFile' | 'chat';

function App() {
    const [token, setTokenState] = useState<string | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [screen, setScreen] = useState<AppScreen>('menu');
    const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
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
            text: 'Cancelar',
            style: 'cancel'
        }, {text: 'Sair', style: 'destructive', onPress: handleLogout},]);
    }, [handleLogout]);

    if (!hydrated) {
        return (<SafeAreaProvider>
                <SafeAreaView style={styles.centeredContainer}>
                    <Text style={styles.title}>Carregando…</Text>
                    <Text style={styles.subtitle}>Verificando segurança</Text>
                </SafeAreaView>
            </SafeAreaProvider>);
    }

    if (!token) {
        return (<SafeAreaProvider>
                <SafeAreaView style={styles.fullContainer}>
                    <LoginScreen onSuccess={handleLoggedIn}/>
                </SafeAreaView>
            </SafeAreaProvider>);
    }

    return (<SafeAreaProvider>
            {screen === 'menu' && (<SafeAreaView style={styles.container}>
                    <Text style={styles.title}>Menu</Text>
                    <Text style={styles.subtitle}>Escolha uma opção</Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setScreen('sendFile')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Enviar Arquivo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.menuButtonSpacing]}
                        onPress={() => setScreen('chat')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Chat</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.outlineButton, styles.logoutButtonSpacing]}
                        onPress={confirmLogout}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.outlineButtonText}>Sair</Text>
                    </TouchableOpacity>
                </SafeAreaView>)}

            {screen === 'sendFile' && (<SendFileScreen
                    onBack={() => setScreen('menu')}
                    onNavigateToChat={(initialMessage) => {
                        setScreen('chat');
                        setChatInitialMessage(initialMessage);
                    }}
                />)}
            {screen === 'chat' && (<ChatScreen
                    onBack={() => {
                        setScreen('menu');
                        setChatInitialMessage(undefined);
                    }}
                    initialMessage={chatInitialMessage}
                />)}
        </SafeAreaProvider>);
}

const styles = StyleSheet.create({
    container: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0', paddingHorizontal: 24,
    }, centeredContainer: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0',
    }, fullContainer: {
        flex: 1,
    }, title: {
        fontSize: 24, fontWeight: 'bold', marginBottom: 8, color: '#333',
    }, subtitle: {
        fontSize: 16, color: '#555', marginBottom: 24,
    }, button: {
        backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8,
    }, menuButtonSpacing: {marginTop: 12}, buttonText: {
        color: 'white', fontSize: 18, fontWeight: 'bold',
    }, outlineButton: {
        borderWidth: 1, borderColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8,
    }, logoutButtonSpacing: {marginTop: 24}, outlineButtonText: {
        color: '#007AFF', fontSize: 16, fontWeight: '600',
    },
});

export default App;
