import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
    View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {login} from '../../services/api/auth';
import {setToken as persistToken} from '../../services/storage/tokenStorage';

type Props = { onSuccess: (token: string) => void };

export default function LoginScreen({onSuccess}: Props) {
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    const canSubmit = usuario.trim().length > 0 && senha.length > 0 && !loading;

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError(null);
        try {
            const token = await login(usuario.trim(), senha);
            await persistToken(token);
            onSuccess(token);
        } catch (e: any) {
            const message = e?.response?.data?.message || e?.message || 'Falha no login. Verifique suas credenciais.';
            setError(message);
            if (__DEV__) console.warn('Erro de login:', message);
            Alert.alert('Erro', message);
        } finally {
            setLoading(false);
        }
    }, [canSubmit, usuario, senha, onSuccess]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <ScrollView
                        contentContainerStyle={[styles.scrollContent, keyboardVisible && styles.scrollContentKeyboard]}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.container}>
                            <Image
                                source={require('../../assets/icon.png')}
                                style={styles.logo}
                                accessibilityRole="image"
                                accessibilityLabel="Logo do aplicativo"
                            />
                            <Text style={styles.title}>Entrar</Text>
                            <TextInput
                                placeholder="Usuário"
                                placeholderTextColor="#666"
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="default"
                                value={usuario}
                                onChangeText={setUsuario}
                                style={styles.input}
                                editable={!loading}
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                            />

                            <View style={styles.passwordContainer}>
                                <TextInput
                                    ref={passwordRef}
                                    placeholder="Senha"
                                    placeholderTextColor="#666"
                                    secureTextEntry={!showPassword}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={senha}
                                    onChangeText={setSenha}
                                    style={[styles.input, styles.passwordInput]}
                                    editable={!loading}
                                    onSubmitEditing={handleSubmit}
                                    returnKeyType="done"
                                />
                                <View style={styles.togglePasswordWrapper}>
                                    <TouchableOpacity
                                        onPress={() => setShowPassword((s) => !s)}
                                        style={styles.togglePasswordBtn}
                                        hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                                        accessibilityRole="button"
                                        accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        <Text style={styles.togglePasswordText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {error && <Text style={styles.errorText}>{error}</Text>}

                            <TouchableOpacity
                                style={[styles.button, !canSubmit && styles.buttonDisabled]}
                                onPress={handleSubmit}
                                disabled={!canSubmit}
                                activeOpacity={0.8}
                            >
                                {loading ? <ActivityIndicator color="white"/> : <Text style={styles.buttonText}>Entrar</Text>}
                            </TouchableOpacity>
                            {keyboardVisible && <View style={{height: 24}} />}
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#f0f0f0' },
    flex: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
    },
    scrollContentKeyboard: {
        paddingBottom: 24,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: 16,
        resizeMode: 'contain'
    },
    title: {fontSize: 24, fontWeight: 'bold', marginBottom: 32, color: '#333'},
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 16,
        width: '100%',
        maxWidth: 300,
        color: '#000'
    },
    passwordContainer: {
        width: '100%',
        maxWidth: 300,
        marginBottom: 16,
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 44, // space for the toggle button
        marginBottom: 0,
    },
    togglePasswordWrapper: {
        position: 'absolute',
        right: 12,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    togglePasswordBtn: {
        paddingVertical: 4,
        paddingHorizontal: 6,
        backgroundColor: 'transparent',
        borderRadius: 16,
    },
    togglePasswordText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
    button: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 8,
        marginTop: 16,
        width: '100%',
        maxWidth: 300,
        alignItems: 'center'
    },
    buttonDisabled: {backgroundColor: '#ccc'},
    buttonText: {color: 'white', fontSize: 18, fontWeight: 'bold'},
    errorText: {color: '#ff3333', fontSize: 14, marginBottom: 8, textAlign: 'center'},
});
