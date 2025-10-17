import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getChatDetails, listUserChats, UserChatListItem} from '../../services/api/chat';
import {saveActiveChat} from '../../services/storage/chatStorage';
import {useHeaderTitle} from '../header/HeaderTitleContext';

type Props = {
    onNavigateToChat: () => void;
    onStartNewChat: () => Promise<void> | void;
    setHeaderTitle: (title: string | null) => void;
};

export default function ChatSelectorScreen({onNavigateToChat, onStartNewChat, setHeaderTitle}: Props) {
    const {setTitle} = useHeaderTitle();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<UserChatListItem[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [openingId, setOpeningId] = useState<number | null>(null);

    const CACHE_KEY = 'chatListCache';
    const CACHE_TIME_KEY = 'chatListCacheTime';

    useEffect(() => {
        setTitle('Meus Chats');
    }, [setTitle]);

    const fetchAndCache = useCallback(async () => {
        try {
            setError(null);
            const data = await listUserChats();
            const chats = Array.isArray(data?.chats) ? data.chats : [];
            setItems(chats);
            const now = Date.now();
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(chats));
            await AsyncStorage.setItem(CACHE_TIME_KEY, now.toString());
        } catch (e) {
            setError('Não foi possível carregar seus chats.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialize = async () => {
            try {
                const cachedStr = await AsyncStorage.getItem(CACHE_KEY);
                const timeStr = await AsyncStorage.getItem(CACHE_TIME_KEY);
                if (cachedStr && timeStr) {
                    const time = parseInt(timeStr);
                    const now = Date.now();
                    if (now - time < 5 * 60 * 1000) {
                        const cached = JSON.parse(cachedStr);
                        setItems(cached);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) {
            }
            await fetchAndCache();
        };
        initialize();
    }, [fetchAndCache]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchAndCache();
        } finally {
            setRefreshing(false);
        }
    }, [fetchAndCache]);

    const handleOpenChat = useCallback(async (id_chat: number) => {
        try {
            setOpeningId(id_chat);
            const details = await getChatDetails(id_chat);
            const messages = (details.messages || []).map((m, idx) => ({
                id: `m-${id_chat}-${idx}`,
                text: m.conteudo,
                isUser: (m.tipo || 'A') === 'U',
                timestamp: new Date().toISOString(),
            }));
            await saveActiveChat({
                idChat: details.id_chat,
                messages,
                title: details.titulo,
                quickQuestions: (details.perguntas_rapidas || []).map(p => p.pergunta).filter(Boolean),
            });
            const item = items.find(it => it.id_chat === id_chat);
            setHeaderTitle(item?.titulo || details.titulo || 'Chat IA');
            onNavigateToChat();
        } catch (e) {
            setError('Falha ao abrir o chat selecionado.');
        } finally {
            setOpeningId(null);
        }
    }, [onNavigateToChat, items, setHeaderTitle]);

    const renderItem = useCallback(({item}: { item: UserChatListItem }) => {
        const isOpening = openingId === item.id_chat;
        const disabled = isOpening;
        const showSpinner = isOpening;
        return (<TouchableOpacity
                style={[styles.card, disabled && styles.cardDisabled]}
                onPress={() => handleOpenChat(item.id_chat)}
                activeOpacity={disabled ? 1 : 0.85}
                disabled={disabled}
            >
                <View style={styles.cardRow}>
                    <View style={styles.cardIcon}><Text style={styles.cardIconText}>{item.emoji || '💬'}</Text></View>
                    <View style={styles.cardBody}>
                        <Text style={styles.cardTitle}>{item.titulo || `Chat #${item.id_chat}`}</Text>
                    </View>
                    {showSpinner && <ActivityIndicator size="small" color="#007AFF"/>}
                </View>
            </TouchableOpacity>);
    }, [handleOpenChat, openingId]);

    const listEmpty = (<View style={styles.emptyWrap}>
            {loading ? (<ActivityIndicator size="small" color="#6b7280"/>) : (<>
                    <Text style={styles.emptyTitle}>Você ainda não tem chats</Text>
                    <Text style={styles.emptySubtitle}>Crie um novo chat para começar uma conversa.</Text>
                </>)}
        </View>);

    return (<View style={styles.container}>
            {!!error && (<View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>)}

            <FlatList
                data={items}
                keyExtractor={(it) => String(it.id_chat)}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, items.length === 0 && {flex: 1}]}
                ItemSeparatorComponent={() => <View style={{height: 8}}/>}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
                ListEmptyComponent={listEmpty}
            />
        </View>);
}

const styles = StyleSheet.create({
    container: {flex: 1, backgroundColor: '#ffffff', padding: 1},
    actionsRow: {flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12},
    newChatBtn: {
        backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    },
    newChatBtnText: {color: '#fff', fontSize: 16, fontWeight: '700'},
    errorBox: {
        backgroundColor: '#fdecea',
        borderColor: '#f5c2c0',
        borderWidth: 1,
        padding: 10,
        borderRadius: 8,
        marginBottom: 10
    },
    errorText: {color: '#a33a2b'},
    listContent: {paddingBottom: 16},
    card: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 12,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: {width: 0, height: 2},
        elevation: 1,
    },
    cardDisabled: {opacity: 0.55},
    cardRow: {flexDirection: 'row', alignItems: 'center'},
    cardIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#eef2ff',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    cardIconText: {fontSize: 18},
    cardBody: {flex: 1},
    cardTitle: {fontSize: 16, fontWeight: '700', color: '#111827'},
    emptyWrap: {flex: 1, alignItems: 'center', justifyContent: 'center'},
    emptyTitle: {fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4},
    emptySubtitle: {fontSize: 13, color: '#6b7280'},
});
