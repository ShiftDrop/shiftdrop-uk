package com.pixelnotchstudio.shiftdroppro;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        clearWebViewCache();
    }

    @Override
    public void onResume() {
        super.onResume();
        clearWebViewCache();
    }

    private void clearWebViewCache() {
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.clearCache(true);
                WebSettings settings = webView.getSettings();
                settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            }
        } catch (Exception ignored) {}
    }
}