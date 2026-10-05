import { AppRegistry, NativeModules } from 'react-native';
import { configureApiBaseURL } from '@erp/api-client';
import { getMobileApiBaseURL } from './src/config/api';
import App from './src/App';
configureApiBaseURL(getMobileApiBaseURL(__DEV__, NativeModules.ERPBuildMode?.isLocal === true));
AppRegistry.registerComponent('ERP', () => App);
