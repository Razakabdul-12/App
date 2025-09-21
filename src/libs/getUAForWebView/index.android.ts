import type GetUAForWebView from './types';

/**
 * Android WebView is built on top of Chromium, so we spoof a more modern Chrome-based user agent to avoid compatibility warnings.
 */
const getUAForWebView: GetUAForWebView = () => 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.159 Mobile Safari/537.36';

export default getUAForWebView;
