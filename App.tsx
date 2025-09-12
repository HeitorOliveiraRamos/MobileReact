import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaProvider,} from 'react-native-safe-area-context';
import {useState} from 'react';

function App() {
    const [count, setCount] = useState(0);

    const incrementCounter = () => {
        setCount(count + 1);
    };

    return (<SafeAreaProvider>
            <View style={styles.container}>
                <Text style={styles.title}>Contador de cliques</Text>
                <Text style={styles.counter}>{count}</Text>
                <TouchableOpacity style={styles.button} onPress={incrementCounter}>
                    <Text style={styles.buttonText}>Clica ai!</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaProvider>);
}

const styles = StyleSheet.create({
    container: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0',
    }, title: {
        fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333',
    }, counter: {
        fontSize: 48, fontWeight: 'bold', marginBottom: 30, color: '#007AFF',
    }, button: {
        backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 8,
    }, buttonText: {
        color: 'white', fontSize: 18, fontWeight: 'bold',
    },
});


export default App;
