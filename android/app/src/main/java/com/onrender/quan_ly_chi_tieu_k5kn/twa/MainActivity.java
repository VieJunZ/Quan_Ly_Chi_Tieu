package com.onrender.quan_ly_chi_tieu_k5kn.twa;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * MainActivity - Trình bao bọc Native WebView cho Ứng Dụng Quản Lý Thu Chi.
 * Tải trực tiếp Cloud Web App và xử lý các lệnh gọi từ Widget màn hình chính.
 */
public class MainActivity extends Activity {

    private static final String DEFAULT_URL = "https://quan-ly-chi-tieu-k5kn.onrender.com";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        webView.setWebViewClient(new WebViewClient());

        handleIntent(getIntent());
    }

    private void handleIntent(Intent intent) {
        String targetUrl = DEFAULT_URL;
        if (intent != null) {
            Uri data = intent.getData();
            if (data != null && data.toString().length() > 0) {
                targetUrl = data.toString();
            }
        }
        if (webView != null) {
            webView.loadUrl(targetUrl);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

