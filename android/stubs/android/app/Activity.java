package android.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

public class Activity extends Context {
    @Override
    public SharedPreferences getSharedPreferences(String name, int mode) { return null; }
    @Override
    public String getPackageName() { return ""; }

    protected void onCreate(Bundle savedInstanceState) {}
    public void setContentView(int layoutResID) {}
    public void setContentView(Object view) {}
    public Intent getIntent() { return null; }
    public void onBackPressed() {}
}

