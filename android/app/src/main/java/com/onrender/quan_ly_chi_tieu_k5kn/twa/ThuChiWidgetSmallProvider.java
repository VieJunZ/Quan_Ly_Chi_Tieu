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
 * ThuChiWidgetSmallProvider - Widget màn hình chính 2x2
 * Hiển thị: Thú cưng Mochi + Số tiền còn được tiêu hôm nay + Nút (+) Ghi nhanh
 */
public class ThuChiWidgetSmallProvider extends AppWidgetProvider {

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
        String petEmoji = prefs.getString("pet_emoji", "🐱");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_thu_chi_small);
        views.setTextViewText(R.id.tv_remaining_today, remainingText);
        views.setTextViewText(R.id.pet_emoji, petEmoji);

        // Chạm vào thân Widget: Mở trang chủ App
        Intent openAppIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home"));
        PendingIntent pendingOpen = PendingIntent.getActivity(
                context, 0, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_small_root, pendingOpen);

        // Chạm vào nút (+): Mở ngay hộp thoại Ghi khoản mới
        Intent quickAddIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(BASE_URL + "/#/home?add=1"));
        PendingIntent pendingAdd = PendingIntent.getActivity(
                context, 1, quickAddIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_quick_add, pendingAdd);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
