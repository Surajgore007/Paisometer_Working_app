package com.anonymous.paisometer

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.content.Intent
import android.provider.Settings
import android.util.Log
import android.app.NotificationManager
import android.content.Context
import android.service.notification.StatusBarNotification

class SMSParserModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SMSParser"
    }

    // 1. Check Queue for new transactions
    @ReactMethod
    fun checkPendingTransactions(promise: Promise) {
        try {
            // Read from the Shared Memory (This returns a JSON String)
            val jsonString = TransactionStore.popAll(reactContext)
            
            // CLEANUP: Dismiss only Categorization notifications (keep sticky service alert)
             val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
             val activeNotifications = manager.activeNotifications
             
             for (notification in activeNotifications) {
                 if (notification.id != 1) { 
                     // ID 1 is the Foreground Service (BankNotificationService)
                     manager.cancel(notification.id)
                 }
             }

            promise.resolve(jsonString)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    // 2. Open Android Settings Page (For Permissions)
    @ReactMethod
    fun requestPermission() {
        try {
            val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactContext.startActivity(intent)
        } catch (e: Exception) {
            Log.e("SMSParser", "Failed to open settings", e)
        }
    }

    // 3. Check if Permission is granted
    @ReactMethod
    fun isPermissionGranted(promise: Promise) {
        try {
            val contentResolver = reactContext.contentResolver
            val enabledListeners = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
            val packageName = reactContext.packageName
            val isGranted = enabledListeners != null && enabledListeners.contains(packageName)
            promise.resolve(isGranted)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun startForegroundService() {
        try {
            val intent = Intent(reactContext, BankNotificationService::class.java)
            androidx.core.content.ContextCompat.startForegroundService(reactContext, intent)
        } catch (e: Exception) {
            Log.e("SMSParser", "Failed to start foreground service", e)
        }
    }

    // 4. Sync Budget Context (For Smart Alerts)
    @ReactMethod
    fun setBudgetContext(dailyLimit: Double, currentSpent: Double) {
        try {
            val prefs = reactContext.getSharedPreferences("PaisoBudget", Context.MODE_PRIVATE)
            with (prefs.edit()) {
                putFloat("DAILY_LIMIT", dailyLimit.toFloat())
                putFloat("CURRENT_SPENT", currentSpent.toFloat())
                apply()
            }
            Log.d("PaisometerNative", "Budget Context Synced: Limit=$dailyLimit, Spent=$currentSpent")
        } catch (e: Exception) {
            Log.e("SMSParser", "Failed to sync budget context", e)
        }
    }
}