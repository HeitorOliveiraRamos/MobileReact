import React, {useCallback, useState} from 'react';
import {ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {login} from '../../services/api/auth';
import {setToken as persistToken} from '../../services/storage/tokenStorage';

type Props = {
  onSuccess: (token: string) => void;
};

export default function LoginScreen({onSuccess}: Props) {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (__DEV__) {
        console.warn('Erro de login:', message);
      }
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }, [canSubmit, usuario, senha, onSuccess]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Entrar</Text>

      <TextInput
        placeholder="Usuário"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="default"
        value={usuario}
        onChangeText={setUsuario}
        style={styles.input}
        editable={!loading}
      />

      <TextInput
        placeholder="Senha"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={senha}
        onChangeText={setSenha}
        style={styles.input}
        editable={!loading}
        onSubmitEditing={handleSubmit}
        returnKeyType="done"
      />

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#333',
  },
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
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
});
