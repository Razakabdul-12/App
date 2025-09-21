import type GetUAForWebView from './types';

/**
 * Android WebView is built on top of Chromium which can cause certain web apps to display warnings, so we spoof a
 * modern mobile Chrome user agent string.
 */
const getUAForWebView: GetUAForWebView = () => 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.159 Mobile Safari/537.36';

export default getUAForWebView;
