package com.onrender.quan_ly_chi_tieu_k5kn.twa;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;

/**
 * ThuChiWidgetMediumProvider - Widget màn hình chính 4x2
 * Hiển thị: Mochi + Streak + Hạn mức hôm nay + 3 nút thao tác (Nói, Chụp bill, Ghi)
 */
public class ThuChiWidgetMediumProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "ThuChiWidgetData";
    private static final String BASE_URL = "https://quan-ly-chi-tieu-k5kn.onrender.com";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String remainingText = prefs.getString("remaining_today", "150.000 đ");
        String streakText = prefs.getString("streak_text", "🔥 5 ngày");
        String petEmoji = prefs.getString("pet_emoji", "🐱");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_thu_chi_medium);
        views.setTextViewText(R.id.tv_medium_remaining, remainingText);
        views.setTextViewText(R.id.tv_streak_badge, streakText);
        views.setTextViewText(R.id.pet_medium_emoji, petEmoji);

        // Chạm vào thân Widget: Mở trang chủ
        Intent openAppIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home"));
        PendingIntent pendingOpen = PendingIntent.getActivity(
                context, 10, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_medium_root, pendingOpen);

        // Nút 1: Nói để ghi
        Intent voiceIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home?voice=1"));
        PendingIntent pendingVoice = PendingIntent.getActivity(
                context, 11, voiceIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_voice, pendingVoice);

        // Nút 2: Chụp ảnh bill
        Intent scanIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home?scan=1"));
        PendingIntent pendingScan = PendingIntent.getActivity(
                context, 12, scanIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_scan, pendingScan);

        // Nút 3: Ghi nhanh
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home?add=1"));
        PendingIntent pendingAdd = PendingIntent.getActivity(
                context, 13, addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_add, pendingAdd);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
