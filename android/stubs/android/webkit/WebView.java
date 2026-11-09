package android.webkit;

import android.content.Context;

public class WebView {
    public WebView(Context context) {}
    public WebSettings getSettings() { return new WebSettings(); }
    public void setWebViewClient(WebViewClient client) {}
    public void loadUrl(String url) {}
    public boolean canGoBack() { return false; }
    public void goBack() {}
}
