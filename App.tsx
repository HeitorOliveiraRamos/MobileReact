import React, {useCallback, useEffect, useState} from 'react';
import {StyleSheet, Text, TouchableOpacity, Alert, AppState} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import {getToken, clearToken as clearTokenStorage, setToken} from './src/storage/tokenStorage';
import {setAuthToken, clearAuthToken, isTokenValid} from './src/api/client';
import SendFileScreen from './src/screens/SendFileScreen';
import ChatScreen from './src/screens/ChatScreen';
import {SecurityManager} from './src/utils/securityManager';

type AppScreen = 'menu' | 'sendFile' | 'chat';

function App() {
  const [token, setTokenState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [securityManager] = useState(() => SecurityManager.getInstance());
  const [chatInitialMessage, setChatInitialMessage] = useState<string | undefined>(undefined);
  // Define handleLogout first to avoid "used before declaration" error
  const handleLogout = useCallback(async () => {
    try {
      await clearTokenStorage();
      clearAuthToken();
      setTokenState(null);
      setScreen('menu');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, we should clear the local state
      setTokenState(null);
      setScreen('menu');
    }
  }, []);

  // Token validation and hydration with security checks
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Perform security checks first
        const securityReport = await securityManager.initializeSecurityChecks();

        if (!securityReport.isSecure) {
          const shouldContinue = await securityManager.handleSecurityViolation(securityReport);
          if (!shouldContinue) {
            // Exit the app or show error screen
            return;
          }
        }

        const storedToken = await getToken();

        if (storedToken && isTokenValid(storedToken)) {
          setTokenState(storedToken);
          setAuthToken(storedToken);
        } else if (storedToken) {
          // Token exists but is invalid, clear it
          await clearTokenStorage();
          clearAuthToken();
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        // In case of error, clear everything for safety
        await clearTokenStorage();
        clearAuthToken();
      } finally {
        setHydrated(true);
      }
    };

    initializeApp();
  }, [securityManager]);

  // App state change handler for security
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && token) {
        // Perform periodic security checks
        const shouldCheck = await securityManager.shouldPerformSecurityCheck();
        if (shouldCheck) {
          const securityReport = await securityManager.initializeSecurityChecks();
          if (!securityReport.isSecure) {
            const shouldContinue = await securityManager.handleSecurityViolation(securityReport);
            if (!shouldContinue) {
              handleLogout();
              return;
            }
          }
        }

        // Re-validate token when app becomes active
        const storedToken = await getToken();
        if (!storedToken || !isTokenValid(storedToken)) {
          handleLogout();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [token, securityManager, handleLogout]);

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
    Alert.alert(
      'Confirmar Logout',
      'Tem certeza que deseja sair?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Sair', style: 'destructive', onPress: handleLogout},
      ]
    );
  }, [handleLogout]);

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.centeredContainer}>
          <Text style={styles.title}>Carregando…</Text>
          <Text style={styles.subtitle}>Verificando segurança</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!token) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.fullContainer}>
          <LoginScreen onSuccess={handleLoggedIn} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {screen === 'menu' && (
        <SafeAreaView style={styles.container}>
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
        </SafeAreaView>
      )}

      {screen === 'sendFile' && (
        <SendFileScreen
          onBack={() => setScreen('menu')}
          onNavigateToChat={(initialMessage) => {
            setScreen('chat');
            setChatInitialMessage(initialMessage);
          }}
        />
      )}
      {screen === 'chat' && (
        <ChatScreen
          onBack={() => {
            setScreen('menu');
            // Limpa a mensagem inicial quando volta do chat
            setChatInitialMessage(undefined);
          }}
          initialMessage={chatInitialMessage}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 24,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  fullContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  menuButtonSpacing: {marginTop: 12},
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonSpacing: {marginTop: 24},
  outlineButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
