package android.content;

import android.net.Uri;

public class Intent {
    public static final String ACTION_VIEW = "android.intent.action.VIEW";
    public static final String ACTION_MAIN = "android.intent.action.MAIN";

    public Intent() {}
    public Intent(String action) {}
    public Intent(String action, Uri uri) {}
    public Intent(Context packageContext, Class<?> cls) {}

    public Uri getData() { return null; }
}
