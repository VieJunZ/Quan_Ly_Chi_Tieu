package android.content;

public interface SharedPreferences {
    String getString(String key, String defValue);
    int getInt(String key, int defValue);
    boolean getBoolean(String key, boolean defValue);
}

