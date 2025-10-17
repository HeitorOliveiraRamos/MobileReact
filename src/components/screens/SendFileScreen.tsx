import React, {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Animated,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {api} from '../../services/api/client';
import {API_BASE_URL} from '../../services/api/config';
import {errorCodes, isErrorWithCode, pick as pickDocument, types as DocTypes} from '@react-native-documents/picker';
import { saveActiveChat } from '../../services/storage/chatStorage';
import { useChatInFlight } from '../../services/api/chatBusy';
import { ErrorModalContext } from '../ErrorModalContext';

type Props = { onNavigateToChat: (initialMessage?: string) => void };

type ValidationError = { field: string; message: string };

type UploadSuccess = {
    id_file: number;
    ai_overview: string;
    id_chat?: number;
    titulo?: string;
    file_name?: string;
    file_type?: string;
    observation?: string | null;
    size_bytes?: number
};

export default function SendFileScreen({onNavigateToChat}: Props) {
    const insets = useSafeAreaInsets();
    const [file, setFile] = useState<{ uri: string; name: string; type: string; size?: number | null } | null>(null);
    const [observation, setObservation] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<ValidationError[] | null>(null);
    const [success, setSuccess] = useState<UploadSuccess | null>(null);
    const [navigatingToChat, setNavigatingToChat] = useState(false);
    const [connectivityStatus, setConnectivityStatus] = useState<string | null>(null);
    const animatedValue = useRef(new Animated.Value(0)).current;
    const chatBusy = useChatInFlight();
    const showErrorModal = useContext(ErrorModalContext)?.showErrorModal;

    useEffect(() => {
        if (errors || success) {
            Animated.timing(animatedValue, {toValue: 1, duration: 300, useNativeDriver: true}).start();
        }
    }, [errors, success, animatedValue]);

    const canSubmit = useMemo(() => file !== null && !loading && !chatBusy, [file, loading, chatBusy]);

    const handlePickFile = useCallback(async () => {
        if (chatBusy) return;
        if (typeof pickDocument !== 'function') {
            showErrorModal?.('Document Picker indisponível', 'A função pick não está disponível.');
            return;
        }
        try {
            const results = await pickDocument({type: [DocTypes.allFiles]});
            if (Array.isArray(results) && results.length > 0) {
                const result: any = results[0];
                setFile({
                    uri: result.fileCopyUri || result.uri,
                    name: result.name || 'arquivo',
                    type: result.type || 'application/octet-stream',
                    size: result.size || null
                });
                setErrors(null);
                setSuccess(null);
            }
        } catch (err: any) {
            if (isErrorWithCode?.(err) && err.code === errorCodes.OPERATION_CANCELED) return;
            console.log('[DocumentPicker] erro seleção', err);
            showErrorModal?.('Erro', 'Falha ao selecionar arquivo');
        }
    }, [pickDocument, chatBusy]);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit || !file) return;
        setLoading(true);
        setErrors(null);
        setSuccess(null);
        try {
            const formData = new FormData();
            const extension = (() => {
                if (file.name && file.name.includes('.')) {
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    if (ext && ext.length <= 8) return ext;
                }
                if (file.type) {
                    if (file.type === 'application/pdf') return 'pdf';
                    if (file.type.startsWith('image/')) return file.type.replace('image/', '');
                    if (file.type.startsWith('text/')) return file.type.replace('text/', '');
                }
                return 'bin';
            })();
            formData.append('file_name', file.name);
            formData.append('file_type', extension);
            const filePart: any = {uri: file.uri, type: file.type || 'application/octet-stream', name: file.name};
            formData.append('file_data', filePart);
            if (observation.trim()) formData.append('observation', observation.trim());
            try {
                const debugParts: Record<string, any[]> = {};
                const fd: any = formData as any;
                if (Array.isArray(fd._parts)) {
                    for (const [k, v] of fd._parts) {
                        if (!debugParts[k]) debugParts[k] = [];
                        if (v && typeof v === 'object' && 'uri' in v) debugParts[k].push({
                            name: v.name,
                            type: v.type,
                            uri: v.uri
                        }); else debugParts[k].push(v);
                    }
                }
                console.log('[Upload][FormData]', debugParts);
            } catch (e) {
                console.log('[Upload] Falha ao inspecionar FormData', e);
            }
            const response = await api.post('/usuario/files', formData, {
                timeout: 60000,
                onUploadProgress: (progressEvent: any) => {
                    if (progressEvent && progressEvent.total) {
                        const pct = (progressEvent.loaded / progressEvent.total) * 100;
                        if (pct % 10 < 1) console.log(`[Upload] Progresso ~${pct.toFixed(0)}%`);
                    }
                }
            });
            console.log('[Upload] Sucesso', response.status, response.data);
            setSuccess(response.data);
            setFile(null);
            setObservation('');

            const { ai_overview, id_chat, titulo } = response.data as UploadSuccess;
            if (ai_overview) {
                try {
                    if (id_chat || titulo) {
                        await saveActiveChat({
                            idChat: typeof id_chat === 'number' ? id_chat : null,
                            title: titulo,
                            messages: [{
                                id: 'overview-' + Date.now(),
                                text: ai_overview,
                                isUser: false,
                                timestamp: new Date().toISOString()
                            }]
                        });
                    } else {
                        await saveActiveChat({
                            idChat: null,
                            messages: [{
                                id: 'overview-' + Date.now(),
                                text: ai_overview,
                                isUser: false,
                                timestamp: new Date().toISOString()
                            }]
                        });
                    }
                } catch (e) {
                    console.log('[Upload] Falha ao persistir chat inicial', e);
                }
                setNavigatingToChat(true);
                setTimeout(() => {
                    onNavigateToChat();
                }, 800);
            }
        } catch (error: any) {
            console.log('[Upload] Erro bruto', error?.message, error?.response?.status, error?.response?.data);
            if (error?.response?.status === 400) {
                if (error?.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                }
            } else if (!error?.response) {
                const applied = attemptHostFallback();
                showErrorModal?.('Erro de Conexão', `Não foi possível conectar.\nHost: ${API_BASE_URL}\n${applied ? 'Fallback aplicado.' : 'Verifique a API.'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [canSubmit, file, observation, onNavigateToChat]);

    const getErrorForField = useCallback((field: string) => errors?.find(error => error.field === field)?.message, [errors]);

    const formatFileSize = useCallback((bytes?: number | null) => {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    }, []);

    const attemptHostFallback = useCallback(() => {
        if (!__DEV__ || Platform.OS !== 'android') return false;
        try {
            const currentOverride = (globalThis as any).__API_OVERRIDE__ as string | undefined;
            let next: string | null = null;
            const base = API_BASE_URL.replace(/\/api$/, '');
            if (currentOverride) {
                if (currentOverride.includes('10.0.2.2')) next = 'http://localhost:8080'; else if (currentOverride.includes('localhost')) next = 'http://10.0.2.2:8080';
            } else {
                if (base.includes('10.0.2.2')) next = 'http://localhost:8080'; else if (base.includes('localhost')) next = 'http://10.0.2.2:8080';
            }
            if (next) {
                (globalThis as any).__API_OVERRIDE__ = next;
                console.log('[FallbackHost] override', next);
                setConnectivityStatus(`Fallback: ${next}`);
                return true;
            }
        } catch {
        }
        return false;
    }, []);

    return (
        <View style={[styles.container, {paddingBottom: Math.max(insets.bottom, 12)}]}>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Selecionar Arquivo</Text>
                    <TouchableOpacity
                        style={[styles.filePicker, file && styles.filePickerSelected, (loading || chatBusy) && {opacity: 0.6}]}
                        onPress={handlePickFile}
                        disabled={loading || chatBusy}
                    >
                        <Text style={[styles.filePickerText, file && styles.filePickerTextSelected]}>
                            {file ? file.name : 'Toque para selecionar arquivo'}
                        </Text>
                        {file && file.size && (
                            <Text style={styles.fileSizeText}>{formatFileSize(file.size)}</Text>
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
                        placeholder="Adicione observações sobre o arquivo..." multiline numberOfLines={4}
                        value={observation} onChangeText={setObservation} editable={!loading && !chatBusy}
                        textAlignVertical="top"
                    />
                    {getErrorForField('observation') && (
                        <Text style={styles.errorText}>{getErrorForField('observation')}</Text>
                    )}
                </View>

                {(errors || success || connectivityStatus) && (
                    <Animated.View style={[styles.messageContainer, {opacity: animatedValue}]}>
                        {connectivityStatus && (
                            <View
                                style={[styles.successContainer, {backgroundColor: '#eef4ff', borderColor: '#4a6ee0'}]}>
                                <Text style={[styles.successTitle, {color: '#2c4fb8'}]}>
                                    Conectividade: {connectivityStatus}
                                </Text>
                            </View>
                        )}

                        {success && !navigatingToChat && (
                            <View style={styles.successContainer}>
                                <Text style={styles.successTitle}>✅ Upload realizado com sucesso!</Text>
                                <Text style={styles.successText}>ID: {success.id_file}</Text>
                                {success.file_name && (
                                    <Text style={styles.successText}>Nome: {success.file_name}</Text>
                                )}
                                {success.file_type && (
                                    <Text style={styles.successText}>Tipo: {success.file_type}</Text>
                                )}
                                {typeof success.size_bytes === 'number' && (
                                    <Text
                                        style={styles.successText}>Tamanho: {formatFileSize(success.size_bytes)}</Text>
                                )}
                                {success.observation && (
                                    <Text style={styles.successText}>Obs: {success.observation}</Text>
                                )}
                                {success.titulo && (
                                    <Text style={styles.successText}>Título do Chat: {success.titulo}</Text>
                                )}
                                {typeof success.id_chat === 'number' && (
                                    <Text style={styles.successText}>ID do Chat: {success.id_chat}</Text>
                                )}
                                {success.ai_overview && (
                                    <Text style={styles.successText}>AI: {success.ai_overview}</Text>
                                )}
                            </View>
                        )}

                        {navigatingToChat && (
                            <View style={styles.navigatingContainer}>
                                <ActivityIndicator color="#007AFF" size="small" style={styles.loadingIcon}/>
                                <Text style={styles.navigatingTitle}>Sucesso! Iniciando sala de conversação...</Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    activeOpacity={canSubmit ? 0.8 : 1}
                >
                    {loading ? (
                        <ActivityIndicator color="white"/>
                    ) : (
                        <Text style={styles.submitButtonText}>{chatBusy ? 'Aguardando resposta do chat…' : 'Enviar Arquivo'}</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1},
    content: {flex: 1, paddingHorizontal: 16, paddingTop: 12},
    section: {marginVertical: 16},
    sectionTitle: {fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8},
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
        minHeight: 80
    },
    filePickerSelected: {borderColor: '#007AFF', backgroundColor: '#f0f8ff'},
    filePickerText: {fontSize: 16, color: '#666', textAlign: 'center'},
    filePickerTextSelected: {color: '#007AFF', fontWeight: '600'},
    fileSizeText: {fontSize: 12, color: '#999', marginTop: 4},
    textArea: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 100
    },
    inputError: {borderColor: '#ff3333'},
    errorText: {color: '#ff3333', fontSize: 12, marginTop: 4},
    messageContainer: {marginVertical: 16},
    successContainer: {
        backgroundColor: '#e8f5e8',
        borderWidth: 1,
        borderColor: '#4caf50',
        borderRadius: 8,
        padding: 16
    },
    successTitle: {fontSize: 16, fontWeight: 'bold', color: '#2e7d32', marginBottom: 8},
    successText: {fontSize: 14, color: '#2e7d32'},
    navigatingContainer: {flexDirection: 'row', alignItems: 'center', padding: 16},
    loadingIcon: {marginRight: 8},
    navigatingTitle: {fontSize: 16, color: '#007AFF', fontWeight: 'bold'},
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24
    },
    submitButtonDisabled: {backgroundColor: '#ccc'},
    submitButtonText: {color: 'white', fontSize: 16, fontWeight: 'bold'}
});
