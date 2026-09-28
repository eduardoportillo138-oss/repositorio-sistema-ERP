import { AppRegistry } from 'react-native';
import { configureApiBaseURL } from '@erp/api-client';
import App from './src/App';
configureApiBaseURL(process.env.API_BASE_URL || 'http://10.0.2.2:3000/api/v1');
AppRegistry.registerComponent('ERP', () => App);
