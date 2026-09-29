import { AppRegistry } from 'react-native';
import { configureApiBaseURL } from '@erp/api-client';
import { getMobileApiBaseURL } from './src/config/api';
import App from './src/App';
configureApiBaseURL(getMobileApiBaseURL(__DEV__));
AppRegistry.registerComponent('ERP', () => App);
