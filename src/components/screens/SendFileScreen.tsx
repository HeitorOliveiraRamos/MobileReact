import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Animated, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {api} from '../../services/api/client';
import DocumentPicker, { types as DocTypes } from '@react-native-documents/picker';
import {isCancel} from "axios";

type Props = {
  onBack: () => void;
  onNavigateToChat: (initialMessage?: string) => void;
};

type ValidationError = {
  field: string;
  message: string;
};

type UploadSuccess = {
  id_file: number;
  ai_overview: string;
};

export default function SendFileScreen({onBack, onNavigateToChat}: Props) {
  const [file, setFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number | null;
  } | null>(null);
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationError[] | null>(null);
  const [success, setSuccess] = useState<UploadSuccess | null>(null);
  const [navigatingToChat, setNavigatingToChat] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errors || success) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [errors, success, animatedValue]);

  const canSubmit = useMemo(() => {
    return file !== null && !loading;
  }, [file, loading]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocTypes.allFiles],
        allowMultiSelection: false,
      });

      if (result && result.length > 0) {
        const pickedFile: any = result[0];
        setFile({
          uri: pickedFile.uri,
          name: pickedFile.name || 'arquivo',
          type: pickedFile.type || 'application/octet-stream',
          size: pickedFile.size,
        });
        setErrors(null);
        setSuccess(null);
      }
    } catch (error) {
      if (!isCancel(error)) {
        Alert.alert('Erro', 'Falha ao selecionar arquivo');
      }
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !file) return;

    setLoading(true);
    setErrors(null);
    setSuccess(null);

    try {
      const formData = new FormData();

      formData.append('file_name', file.name);
      formData.append('file_type', file.type);

      formData.append('file_data', {
        uri: file.uri,
        type: file.type,
        name: file.name,
      } as any);

      if (observation.trim()) {
        formData.append('observation', observation.trim());
      }

      const headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };

      const response = await api.post('/usuario/files', formData, {
        headers,
        timeout: 60000,
      });

      setSuccess(response.data);
      setFile(null);
      setObservation('');

      if (response.data.ai_overview) {
        setNavigatingToChat(true);
        setTimeout(() => {
          onNavigateToChat(response.data.ai_overview);
        }, 1500);
      }
    } catch (error: any) {
      if (error?.response?.status === 400) {
        if (error?.response?.data?.errors) {
          setErrors(error.response.data.errors);
        } else {
          Alert.alert(
            'Erro de Validação',
            'Os dados enviados não estão no formato correto. Verifique o arquivo selecionado.'
          );
        }
      } else if (error?.response?.status === 404) {
        Alert.alert(
          'Recurso não encontrado',
          'O endpoint de upload não foi encontrado. Verifique se a API está rodando corretamente.\n\nEndpoint esperado: /api/usuario/files'
        );
      } else if (error?.response?.status === 401) {
        Alert.alert('Erro de Autenticação', 'Sua sessão expirou. Faça login novamente.');
      } else if (error?.response?.status === 403) {
        Alert.alert('Acesso Negado', 'Você não tem permissão para fazer upload de arquivos.');
      } else if (error?.response?.status === 413) {
        Alert.alert('Arquivo muito grande', 'O arquivo selecionado excede o tamanho máximo permitido.');
      } else if (error?.response?.status === 415) {
        Alert.alert('Tipo não suportado', 'O tipo do arquivo selecionado não é suportado.');
      } else if (error?.response?.status >= 500) {
        Alert.alert('Erro do Servidor', 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.');
      } else if (!error?.response) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e se a API está rodando.\n\nURL esperada: http://localhost:8080/api/usuario/files'
        );
      } else {
        const message = error?.response?.data?.message || error?.message || 'Erro desconhecido no upload do arquivo';
        Alert.alert('Erro', message);
      }
    } finally {
      setLoading(false);
    }
  }, [canSubmit, file, observation, onNavigateToChat]);

  const getErrorForField = useCallback((field: string) => {
    return errors?.find(error => error.field === field)?.message;
  }, [errors]);

  const formatFileSize = useCallback((bytes?: number | null) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Enviar Arquivo</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selecionar Arquivo</Text>

          <TouchableOpacity
            style={[styles.filePicker, file && styles.filePickerSelected]}
            onPress={handlePickFile}
            disabled={loading}
          >
            <Text style={[styles.filePickerText, file && styles.filePickerTextSelected]}>
              {file ? file.name : 'Toque para selecionar arquivo'}
            </Text>
            {file && file.size && (
              <Text style={styles.fileSizeText}>
                {formatFileSize(file.size)}
              </Text>
            )}
          </TouchableOpacity>

          {getErrorForField('file') && (
            <Text style={styles.errorText}>{getErrorForField('file')}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observações (Opcional)</Text>
          <TextInput
            style={[styles.textArea, getErrorForField('observation') && styles.inputError]}
            placeholder="Adicione observações sobre o arquivo..."
            multiline
            numberOfLines={4}
            value={observation}
            onChangeText={setObservation}
            editable={!loading}
            textAlignVertical="top"
          />
          {getErrorForField('observation') && (
            <Text style={styles.errorText}>{getErrorForField('observation')}</Text>
          )}
        </View>

        {(errors || success) && (
          <Animated.View style={[styles.messageContainer, {opacity: animatedValue}]}>
            {success && !navigatingToChat && (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>✅ Upload realizado com sucesso!</Text>
                <Text style={styles.successText}>ID do arquivo: {success.id_file}</Text>
              </View>
            )}
            {navigatingToChat && (
              <View style={styles.navigatingContainer}>
                <ActivityIndicator color="#007AFF" size="small" style={styles.loadingIcon} />
                <Text style={styles.navigatingTitle}>Sucesso! Iniciando sala de conversação...</Text>
              </View>
            )}
          </Animated.View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Enviar Arquivo</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filePicker: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  filePickerSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  filePickerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  filePickerTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  fileSizeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  inputError: {
    borderColor: '#ff3333',
  },
  errorText: {
    color: '#ff3333',
    fontSize: 12,
    marginTop: 4,
  },
  messageContainer: {
    marginVertical: 16,
  },
  successContainer: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 8,
    padding: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  navigatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingIcon: {
    marginRight: 8,
  },
  navigatingTitle: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
