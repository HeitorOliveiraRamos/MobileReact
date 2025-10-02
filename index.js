import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import React from 'react';
import {initialWindowMetrics, SafeAreaProvider} from 'react-native-safe-area-context';

function Root() {
    return (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <App/>
        </SafeAreaProvider>
    );
}

AppRegistry.registerComponent(appName, () => Root);
